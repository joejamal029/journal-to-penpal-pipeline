mod db;
mod state;
pub mod parser;
pub mod commands;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            // Journal commands
            commands::journal::import_journal_file,
            commands::journal::get_import_status,
            commands::journal::remove_journal_source,
            commands::journal::get_thought_units,
            // Penpal commands
            commands::penpal::create_penpal,
            commands::penpal::get_penpals,
            commands::penpal::update_penpal,
            commands::penpal::add_correspondence,
            commands::penpal::get_correspondence,
            // Letter commands
            commands::letter::create_letter,
            commands::letter::save_letter_content,
            commands::letter::load_letter_content,
            commands::letter::mark_letter_sent,
            // Workspace commands
            commands::workspace::save_workspace_state,
            commands::workspace::load_workspace_state,
            commands::workspace::get_persist_value,
            commands::workspace::set_persist_value,
            commands::workspace::delete_persist_value,
        ])
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_local_data_dir()
                .expect("Failed to resolve app local data dir");

            // Ensure the data directory exists
            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            let db_path = app_data_dir.join("journal_penpal.db");
            let conn = db::init_database(&db_path)
                .expect("Failed to initialize database");

            app.manage(AppState::new(conn));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
