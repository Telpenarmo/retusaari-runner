use std::{process::Stdio, sync::Mutex};

use command_group::{AsyncCommandGroup, AsyncGroupChild};
use tauri::{async_runtime::TokioJoinHandle, AppHandle, Manager};
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, BufReader},
    join,
    process::Command,
    select,
    sync::oneshot,
};

const SCRIPT_NAME: &str = ".kts";

#[tauri::command]
pub async fn run(app_handle: AppHandle, code: String) -> Result<Option<i32>, String> {
    eprintln!("Running");

    save_src(code).await?;

    let mut job = spawn_kotlinc()?;

    let (stdout_emitter, stderr_emitter) = spawn_emitters(&mut job, app_handle.clone());

    let (kill_sender, kill_receiver) = oneshot::channel();
    let killer_listener = listen_for_killer(app_handle.clone(), move || {
        kill_sender.send(()).expect("killer_listener is dropped")
    });

    // wait for either the task to finish or a kill event
    let status = select! {
        res = job.wait() => res,
        _ = kill_receiver => {
            job.kill().expect("The child is already dead");
            job.wait().await
        }
    }
    .map_err(|e| {
        eprintln!("Waiting error: {e}");
        "Unknown error while waiting for the runner to finish."
    })?;

    let _ = join!(stdout_emitter, stderr_emitter); // ensure emitters finished too

    // cleanup
    app_handle.unlisten(killer_listener);
    rm_temp_file().await?;

    eprintln!("Finished");
    Ok(status.code())
}

fn spawn_emitters(
    job: &mut AsyncGroupChild,
    app_handle: AppHandle,
) -> (TokioJoinHandle<()>, TokioJoinHandle<()>) {
    let leader = job.inner();
    let stdout = leader.stdout.take().unwrap();
    let stderr = leader.stderr.take().unwrap();

    let out_ = emit_output(stdout, app_handle.clone(), "stdout");
    let err_ = emit_output(stderr, app_handle, "stderr");

    (out_, err_)
}

fn emit_output<R: AsyncRead + std::marker::Unpin + std::marker::Send + 'static>(
    child: R,
    app_handle: tauri::AppHandle,
    desc: &'static str,
) -> tauri::async_runtime::TokioJoinHandle<()> {
    tokio::spawn(async move {
        let mut reader = BufReader::new(child);
        loop {
            let mut line = String::new();
            match reader.read_line(&mut line).await {
                Err(err) => {
                    eprintln!("Failed to read {desc}: {err}");
                    break;
                }
                Ok(0) => break,
                Ok(_) => {
                    eprintln!("Sending line from {desc}");
                    app_handle.emit_all("output", line).unwrap();
                }
            }
        }
        println!("Exiting emitter {desc}");
    })
}

fn listen_for_killer<F: FnOnce() -> () + std::marker::Send + 'static>(
    app_handle: tauri::AppHandle,
    kill: F,
) -> tauri::EventHandler {
    let mutx = Mutex::new(Some(kill));
    app_handle.listen_global("kill", move |_| {
        let kill = mutx
            .lock()
            .expect("Failed to acquire lock")
            .take()
            .expect("Killed already");
        kill()
    })
}

async fn save_src(src: String) -> Result<(), String> {
    tokio::fs::write(SCRIPT_NAME, src.as_bytes())
        .await
        .map_err(|e| format!("Failed to save code to temporary file: {e}"))
}

async fn rm_temp_file() -> Result<(), String> {
    tokio::fs::remove_file(SCRIPT_NAME)
        .await
        .map_err(|e| format!("Failed to remove temporary file: {e}"))
}

fn spawn_kotlinc() -> Result<AsyncGroupChild, String> {
    let mut command = Command::new("kotlinc");
    let command = command.arg("-script").arg(SCRIPT_NAME);

    command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .group_spawn()
        .map_err(|e| format!("Failed to spawn kotlinc: {e}"))
}
