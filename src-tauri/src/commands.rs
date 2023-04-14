use std::{
    path::{Path, PathBuf},
    process::Stdio,
};

use tauri::{async_runtime::TokioJoinHandle, Manager, Window};

use command_group::{AsyncCommandGroup, AsyncGroupChild};
use tokio::{
    io::{AsyncRead, AsyncReadExt, BufReader},
    join,
    process::Command,
    select,
    sync::oneshot,
    time,
};
use ts_rs::TS;

type RunCommandOk = Option<i32>;

#[derive(serde::Serialize)]
#[derive(TS)]
#[ts(export)]
#[ts(export_to = "../src/errorDefs.ts")]
#[ts(rename = "RunError")]
pub enum RunCommandError {
    KotlincNotFound,
    KotlincPermissionDenied,
    UnsupportedPlatform,
    SaveError(String),
    RemoveError(String),
    WaitError(String),
    KillError,
    FailedSpawn(String),
}

type RunCommandResult = Result<RunCommandOk, RunCommandError>;

#[tauri::command]
pub async fn run(window: Window, code: String) -> RunCommandResult {
    eprintln!("Running");

    let script_path = script_path(&window)?;
    if let Some(err) = save_src(&script_path, code).await {
        return Err(RunCommandError::SaveError(err));
    }

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
                Err(RunCommandError::KillError)
            } else {
                Ok(None)
            }
        }
    };

    let _ = join!(stdout_emitter, stderr_emitter); // ensure emitters finished too

    // cleanup
    window.unlisten(killer_listener);
    let did_remove = rm_temp_file(&script_path).await;

    if let Some(msg) = did_remove {
        return Err(RunCommandError::RemoveError(msg));
    };

    eprintln!("Finished");
    Ok(status?.and_then(|s| s.code()))
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
    let mut buf = [0; 8 * 1024];
    tokio::spawn(async move {
        let duration = tokio::time::Duration::from_millis(50);
        let mut reader = BufReader::new(child);
        let mut timer = time::interval(duration);
        loop {
            timer.tick().await;
            match reader.read(&mut buf).await {
                Ok(0) => break,
                Ok(read) => {
                    eprintln!("Sending chunk from {desc}");
                    let payload = String::from_utf8_lossy(&buf[..read]).to_string();
                    app_handle
                        .emit("output", payload)
                        .expect("Failed to emit the output event.");
                }
                Err(err) => {
                    eprintln!("Failed to read {desc}: {err}");
                    break;
                }
            }
        }
        println!("Exiting emitter {desc}");
    })
}

fn map_waiting_error(err: std::io::Error) -> RunCommandError {
    eprintln!("Waiting error: {err}");
    RunCommandError::WaitError(err.to_string())
}

fn script_path(window: &Window) -> Result<PathBuf, RunCommandError> {
    let app_handle = window.app_handle();
    let Some(mut path) = app_handle.path_resolver().app_cache_dir() else {
        return Err(RunCommandError::UnsupportedPlatform);
    };
    path.set_file_name(window.label());
    path.set_extension("kts");
    Ok(path)
}

async fn save_src(script_path: &Path, src: String) -> Option<String> {
    tokio::fs::write(script_path, src.as_bytes())
        .await
        .map_err(|e| format!("Failed to save code to temporary file: {e}"))
        .err()
}

async fn rm_temp_file(script_path: &Path) -> Option<String> {
    tokio::fs::remove_file(script_path)
        .await
        .map_err(|e| format!("Failed to remove temporary file: {e}"))
        .err()
}

fn spawn_kotlinc(script_path: &Path) -> Result<AsyncGroupChild, RunCommandError> {
    let mut command = Command::new("kotlinc");
    let command = command.arg("-script").arg(script_path);

    command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .group_spawn()
        .map_err(describe_spawn_error)
}

fn describe_spawn_error(err: std::io::Error) -> RunCommandError {
    eprintln!("Failed to spawn kotlinc: {err}");
    match err.kind() {
        std::io::ErrorKind::NotFound => RunCommandError::KotlincNotFound,
        std::io::ErrorKind::PermissionDenied => RunCommandError::KotlincPermissionDenied,
        _ => RunCommandError::FailedSpawn(format!("Failed to run kotlinc: {err}")),
    }
}
