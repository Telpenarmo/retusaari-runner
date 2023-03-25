use std::{process::Stdio, sync::Mutex};

use command_group::{AsyncCommandGroup, AsyncGroupChild};
use tauri::{AppHandle, Manager};
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
    save_src(code).await;

    let mut job = spawn_kotlinc()?;
    eprintln!("Running");

    let leader = job.inner();
    let stdout = leader.stdout.take().unwrap();
    let stderr = leader.stderr.take().unwrap();

    let stdout_emitter = emit_output(stdout, app_handle.clone());
    let stderr_emitter = emit_output(stderr, app_handle.clone());

    let (kill_sender, kill_receiver) = oneshot::channel();
    let killer_listener = listen_for_killer(app_handle.clone(), move || {
        kill_sender.send(()).expect("killer_listener is dropped")
    });

    let status = select! {
        res = job.wait() => res,
        _ = kill_receiver => {
            job.kill().expect("The child is already dead");
            job.wait().await
        }
    };

    let status = status.map_err(|e| {
        eprintln!("Waiting error: {e}");
        "Unknown error while waiting for the runner to finish."
    })?;

    let _ = join!(stdout_emitter, stderr_emitter);

    app_handle.unlisten(killer_listener);
    rm_temp_file().await;

    eprintln!("Finished");
    Ok(status.code())
}

fn emit_output<R: AsyncRead + std::marker::Unpin + std::marker::Send + 'static>(
    child: R,
    app_handle: tauri::AppHandle,
) -> tauri::async_runtime::TokioJoinHandle<()> {
    tokio::spawn(async move {
        let mut reader = BufReader::new(child);
        loop {
            let mut line = String::new();
            match reader.read_line(&mut line).await {
                Err(err) => {
                    eprintln!("Failed to read output: {err}");
                    return;
                }
                Ok(0) => return,
                Ok(_) => {
                    eprintln!("Sending line of output");
                    app_handle
                        .emit_all("output", line)
                        .unwrap_or_else(|err| eprintln!("Failed to send output: {err}"));
                }
            }
        }
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

async fn save_src(src: String) -> Option<String> {
    tokio::fs::write(SCRIPT_NAME, src.as_bytes())
        .await
        .err()
        .map(|e| format!("Failed to save code to temporary file: {e}"))
}

async fn rm_temp_file() -> Option<String> {
    tokio::fs::remove_file(SCRIPT_NAME)
        .await
        .err()
        .map(|e| format!("Failed to save code to temporary file: {e}"))
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
