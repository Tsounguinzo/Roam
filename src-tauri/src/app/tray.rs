use super::utils::{open_setting_window, reopen_main_window};
use log::info;
use tauri::{
    AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem,
};

fn focus_window(window: &tauri::Window) {
    // Best-effort: show and focus existing window instead of showing "already exists".
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

pub fn init_system_tray() -> SystemTray {
    let menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("home".to_string(), "Home"))
        .add_item(CustomMenuItem::new("toggle_visibility".to_string(), "Show/Hide"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("restart".to_string(), "Restart"))
        .add_item(CustomMenuItem::new("quit".to_string(), "Quit"));

    SystemTray::new().with_menu(menu)
}

pub fn handle_tray_event(app: &AppHandle, event: SystemTrayEvent) {
    if let SystemTrayEvent::MenuItemClick { id, .. } = event {
        match id.as_str() {
            "home" => match app.get_window("setting") {
                Some(window) => {
                    focus_window(&window);
                }
                None => {
                    open_setting_window(app.clone());
                }
            },
            "toggle_visibility" => {
                match app.get_window("main") {
                    Some(window) => {
                        match window.is_visible() {
                            Ok(true) => {
                                let _ = window.hide();
                            }
                            Ok(false) => {
                                focus_window(&window);
                            }
                            Err(_) => {
                                focus_window(&window);
                            }
                        }
                    }
                    None => {
                        // use tokio to run the future to avoid blocking the thread
                        let future = async { reopen_main_window(app.clone()).await };
                        // run the future using an executor and handle the result
                        let _result_ = tokio::runtime::Runtime::new().unwrap().block_on(future);
                    }
                };
            }
            "restart" => {
                info!("Restart Roam");
                app.restart();
            }
            "quit" => {
                info!("Quit Roam");
                app.exit(0);
            }
            _ => {}
        }
    } else if let SystemTrayEvent::DoubleClick {
        position: _,
        size: _,
        ..
    } = event
    {
        match app.get_window("setting") {
            Some(window) => {
                focus_window(&window);
            }
            None => {
                open_setting_window(app.clone());
            }
        }
    }
}
