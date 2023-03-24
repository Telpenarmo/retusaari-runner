use std::process::Stdio;

use tauri::{AppHandle, Manager};
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, BufReader},
    join,
    process::{Child, Command},
};

const SCRIPT_NAME: &str = ".kts";

#[tauri::command]
pub async fn run(app_handle: AppHandle, code: String) -> Result<Option<i32>, String> {
    save_src(code).await;

    let mut child = spawn_kotlinc()?;
    eprintln!("Running");

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let stdout_emitter = emit_output(stdout, app_handle.clone());
    let stderr_emitter = emit_output(stderr, app_handle.clone());
    let child_awaiter = child.wait();

    let results = join!(child_awaiter, stdout_emitter, stderr_emitter);

    let status = results.0.map_err(|e| {
        eprintln!("Waiting error: {e}");
        "Unknown error while waiting for the runner to finish."
    })?;

    rm_temp_file().await;

    eprintln!("Finished");
    Ok(status.code())
}

async fn emit_output<R: AsyncRead + std::marker::Unpin + std::marker::Send + 'static>(
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

fn spawn_kotlinc() -> Result<Child, String> {
    let mut command = Command::new("kotlinc");
    let command = command.arg("-script").arg(SCRIPT_NAME);

    let child = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn kotlinc: {e}"))?;

    Ok(child)
}
