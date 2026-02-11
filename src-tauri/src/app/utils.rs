use super::conf::AppConfig;
use log::info;
use tauri::{
    Manager, PhysicalPosition, PhysicalSize, Position, Size, Window, WindowBuilder, WindowUrl,
};

#[cfg(target_os = "macos")]
use cocoa::appkit::{NSWindow, NSWindowCollectionBehavior};

pub fn apply_overlay_window(window: &Window) -> Result<(), String> {
    window.set_decorations(false).map_err(|e| e.to_string())?;
    window
        .set_always_on_top(true)
        .map_err(|e| e.to_string())?;
    window
        .set_skip_taskbar(true)
        .map_err(|e| e.to_string())?;
    window
        .set_ignore_cursor_events(true)
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        window
            .with_webview(|webview| unsafe {
                let ns_window = webview.ns_window();
                let behavior =
                    NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
                        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
                        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
                        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle;
                ns_window.setCollectionBehavior_(behavior);
            })
            .map_err(|e| e.to_string())?;
    }

    let monitor = match window.current_monitor() {
        Ok(Some(monitor)) => Some(monitor),
        Ok(None) => window.primary_monitor().ok().flatten(),
        Err(_) => window.primary_monitor().ok().flatten(),
    };

    if let Some(monitor) = monitor {
        let size = monitor.size();
        let position = monitor.position();
        window
            .set_size(Size::Physical(PhysicalSize {
                width: size.width,
                height: size.height,
            }))
            .map_err(|e| e.to_string())?;
        window
            .set_position(Position::Physical(PhysicalPosition {
                x: position.x,
                y: position.y,
            }))
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn reopen_main_window(app: tauri::AppHandle) -> Result<(), String> {
    // Check if a window with label "main" already exists
    if let Some(window) = app.get_window("main") {
        // Bring the existing window to focus
        window.set_focus().map_err(|e| e.to_string())?;
        info!("Main window already exists, brought to focus");
        return Ok(());
    }

    // If no window exists, create a new one
    let window = WindowBuilder::new(&app, "main", WindowUrl::App("/".into()))
        .resizable(false)
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .title("Roam")
        .skip_taskbar(true)
        .build()
        .map_err(|e| e.to_string())?;

    apply_overlay_window(&window)?;
    info!("Reopened main window");

    Ok(())
}

pub fn open_setting_window(app: tauri::AppHandle) {
    let settings = AppConfig::new();
    let mut builder = tauri::WindowBuilder::new(&app, "setting", WindowUrl::App("/setting".into()))
        .title("Roam Home")
        .inner_size(1000.0, 650.0)
        .min_inner_size(500.0, 1.0)
        .decorations(true)
        .resizable(true)
        .theme(if settings.get_theme() == "dark" {
            Some(tauri::Theme::Dark)
        } else {
            Some(tauri::Theme::Light)
        })
        .transparent(true)
        //.title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true)
        .build()
        .unwrap_or_else(|e| {
            log::error!("Failed to create setting window: {}", e);
            panic!("Window creation failed: {}", e);
        });
    info!("open setting window");
}
