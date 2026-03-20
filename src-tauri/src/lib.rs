use tauri::Manager;

mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // On first launch, set up data directory
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");

            let images_dir = app_dir.join("images");
            std::fs::create_dir_all(&images_dir).expect("failed to create images dir");

            let backups_dir = app_dir.join("backups");
            std::fs::create_dir_all(&backups_dir).expect("failed to create backups dir");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_data_dir,
            commands::parse_import_text,
            commands::export_backup,
            commands::import_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
