// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    fix_path_env::fix().expect("Fixing path error, the OS in not supported.");
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![commands::run])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
