use std::{
    path::{Path, PathBuf},
    process::Stdio,
};

use tauri::{async_runtime::TokioJoinHandle, Manager, Window};

use command_group::{AsyncCommandGroup, AsyncGroupChild};
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, BufReader},
    join,
    process::Command,
    select,
    sync::oneshot,
};

#[tauri::command]
pub async fn run(window: Window, code: String) -> Result<Option<i32>, String> {
    eprintln!("Running");

    let script_path = script_path(&window)?;
    save_src(&script_path, code).await?;

    let mut job = spawn_kotlinc(&script_path)?;

    let (stdout_emitter, stderr_emitter) = spawn_emitters(&mut job, window.clone());

    let (kill_sender, kill_receiver) = oneshot::channel();
    let killer_listener = window.once("kill", move |_| {
        kill_sender.send(()).expect("killer_listener is dropped")
    });

    // wait for either the task to finish or a kill event
    let status = select! {
        res = job.wait() => res.map_err(map_waiting_error).map(Option::Some),
        _ = kill_receiver => {
            let killed = job.kill();
            if let Err(err) = killed {
                eprintln!("Kill failed, probably process was already dead ({err}).");
                Err("Kill failed".to_owned())
            } else {
                Ok(None)
            }
        }
    };

    let _ = join!(stdout_emitter, stderr_emitter); // ensure emitters finished too

    // cleanup
    window.unlisten(killer_listener);
    let did_remove = rm_temp_file(&script_path).await;

    eprintln!("Finished");
    did_remove?;
    Ok(status?.and_then(|st| st.code()))
}

fn spawn_emitters(
    job: &mut AsyncGroupChild,
    window: Window,
) -> (TokioJoinHandle<()>, TokioJoinHandle<()>) {
    let leader = job.inner();
    let stdout = leader.stdout.take().unwrap();
    let stderr = leader.stderr.take().unwrap();

    let out_ = emit_output(stdout, window.clone(), "stdout");
    let err_ = emit_output(stderr, window, "stderr");

    (out_, err_)
}

fn emit_output<R: AsyncRead + std::marker::Unpin + std::marker::Send + 'static>(
    child: R,
    app_handle: Window,
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
                    app_handle
                        .emit("output", line)
                        .expect("Failed to emit the output event.");
                }
            }
        }
        println!("Exiting emitter {desc}");
    })
}

fn map_waiting_error(err: std::io::Error) -> String {
    eprintln!("Waiting error: {err}");
    "Unknown error while waiting for the runner to finish.".to_owned()
}

fn script_path(window: &Window) -> Result<PathBuf, &str> {
    let app_handle = window.app_handle();
    let Some(mut path) = app_handle.path_resolver().app_cache_dir() else {
        return Err("Unsupported platform");
    };
    path.set_file_name(window.label());
    path.set_extension("kts");
    Ok(path)
}

async fn save_src(script_path: &Path, src: String) -> Result<(), String> {
    tokio::fs::write(script_path, src.as_bytes())
        .await
        .map_err(|e| format!("Failed to save code to temporary file: {e}"))
}

async fn rm_temp_file(script_path: &Path) -> Result<(), String> {
    tokio::fs::remove_file(script_path)
        .await
        .map_err(|e| format!("Failed to remove temporary file: {e}"))
}

fn spawn_kotlinc(script_path: &Path) -> Result<AsyncGroupChild, String> {
    let mut command = Command::new("kotlinc");
    let command = command.arg("-script").arg(script_path);

    command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .group_spawn()
        .map_err(|e| format!("Failed to spawn kotlinc: {e}"))
}
