use std::process::Stdio;

use tauri::AppHandle;
use tokio::process::{Child, Command};

const SCRIPT_NAME: &str = ".kts";

#[derive(serde::Serialize)]
pub struct RunResult {
    pub status: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

#[tauri::command]
pub async fn run(_app_handle: AppHandle, code: String) -> Result<RunResult, String> {
    save_src(code).await;

    let child = spawn_kotlinc()?;
    eprintln!("Running");

    let output = child.wait_with_output().await;
    let output = output.map_err(|e| {
        eprintln!("Waiting error: {e}");
        "Unknown error while waiting for the runner to finish."
    })?;

    rm_temp_file().await;

    eprintln!("Finished");
    Ok(RunResult {
        status: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
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
