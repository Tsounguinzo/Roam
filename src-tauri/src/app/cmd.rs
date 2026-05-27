use log::{error, info};
use mouse_position::mouse_position::Mouse;
use serde_json::json;
use tauri::Manager;

#[tauri::command]
pub fn get_mouse_position(app: tauri::AppHandle) -> serde_json::Value {
    /*
     * because we set the window to ignore cursor events, we cannot use
     * javascript to get the mouse position, so we use get mouse position manually
     */
    let position = Mouse::get_mouse_position();
    match position {
        Mouse::Position { x, y } => {
            let window_position = app
                .get_webview_window("main")
                .and_then(|window| window.outer_position().ok());
            let (window_x, window_y) = window_position
                .map(|position| (position.x, position.y))
                .unwrap_or((0, 0));

            json!({
                "clientX": x - window_x,
                "clientY": y - window_y
            })
        }
        Mouse::Error => {
            error!("Error getting mouse position");
            println!("Error getting mouse position");
            json!(null)
        }
    }
}

#[tauri::command]
pub fn open_folder(path: &str) {
    match open::that(path) {
        Ok(()) => info!("Open folder: {}", path),
        Err(err) => error!("An error occurred when opening '{}': {}", path, err),
    }
}
