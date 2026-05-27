use super::conf::AppConfig;
use log::{info, warn};
use tauri::utils::config::BackgroundThrottlingPolicy;
use tauri::window::Color;
use tauri::{
    AppHandle, Manager, PhysicalPosition, PhysicalSize, Position, Size, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

#[cfg(target_os = "macos")]
fn apply_macos_all_spaces_behavior(window: &WebviewWindow) -> Result<(), String> {
    use objc2_app_kit::{
        NSScreenSaverWindowLevel, NSWindow, NSWindowCollectionBehavior, NSWindowStyleMask,
    };

    let ns_window: &NSWindow = unsafe { &*window.ns_window().map_err(|e| e.to_string())?.cast() };
    let collection_behavior = (ns_window.collectionBehavior()
        & !NSWindowCollectionBehavior::Primary
        & !NSWindowCollectionBehavior::CanJoinAllApplications
        & !NSWindowCollectionBehavior::FullScreenPrimary
        & !NSWindowCollectionBehavior::FullScreenNone)
        | NSWindowCollectionBehavior::CanJoinAllSpaces
        | NSWindowCollectionBehavior::Auxiliary
        | NSWindowCollectionBehavior::Transient
        | NSWindowCollectionBehavior::IgnoresCycle
        | NSWindowCollectionBehavior::FullScreenAuxiliary;

    ns_window.setStyleMask(
        ns_window.styleMask()
            | NSWindowStyleMask::UtilityWindow
            | NSWindowStyleMask::NonactivatingPanel,
    );
    ns_window.setCollectionBehavior(collection_behavior);
    ns_window.setLevel(NSScreenSaverWindowLevel);
    ns_window.setCanHide(false);
    ns_window.setHidesOnDeactivate(false);
    ns_window.orderFrontRegardless();

    Ok(())
}

fn overlay_bounds(
    window: &WebviewWindow,
) -> Result<(PhysicalSize<u32>, PhysicalPosition<i32>), String> {
    let monitors = window.available_monitors().unwrap_or_default();
    if !monitors.is_empty() {
        let mut left = i64::MAX;
        let mut top = i64::MAX;
        let mut right = i64::MIN;
        let mut bottom = i64::MIN;

        for monitor in monitors {
            let position = monitor.position();
            let size = monitor.size();

            left = left.min(position.x as i64);
            top = top.min(position.y as i64);
            right = right.max(position.x as i64 + size.width as i64);
            bottom = bottom.max(position.y as i64 + size.height as i64);
        }

        return Ok((
            PhysicalSize {
                width: (right - left) as u32,
                height: (bottom - top) as u32,
            },
            PhysicalPosition {
                x: left as i32,
                y: top as i32,
            },
        ));
    }

    let monitor = match window.current_monitor() {
        Ok(Some(monitor)) => Some(monitor),
        Ok(None) => window.primary_monitor().ok().flatten(),
        Err(_) => window.primary_monitor().ok().flatten(),
    };

    monitor
        .map(|monitor| (*monitor.size(), *monitor.position()))
        .ok_or_else(|| "No monitors found".to_string())
}

pub fn apply_overlay_window(window: &WebviewWindow) -> Result<(), String> {
    if let Err(err) = window.unminimize() {
        warn!("Could not unminimize overlay window: {err}");
    }

    window.set_decorations(false).map_err(|e| e.to_string())?;
    if let Err(err) = window.set_shadow(false) {
        warn!("Could not disable overlay window shadow: {err}");
    }
    if let Err(err) = window.set_background_color(Some(Color(0, 0, 0, 0))) {
        warn!("Could not clear overlay window background: {err}");
    }
    window.set_always_on_top(true).map_err(|e| e.to_string())?;
    window.set_focusable(false).map_err(|e| e.to_string())?;
    window.set_skip_taskbar(true).map_err(|e| e.to_string())?;
    window
        .set_ignore_cursor_events(true)
        .map_err(|e| e.to_string())?;

    let (size, position) = overlay_bounds(window)?;
    window
        .set_size(Size::Physical(size))
        .map_err(|e| e.to_string())?;
    window
        .set_position(Position::Physical(position))
        .map_err(|e| e.to_string())?;

    if let Err(err) = window.set_visible_on_all_workspaces(true) {
        warn!("Could not set visible on all workspaces: {err}");
    }

    #[cfg(target_os = "macos")]
    apply_macos_all_spaces_behavior(window)?;

    window.show().map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    apply_macos_all_spaces_behavior(window)?;

    Ok(())
}

pub fn show_main_overlay(app: &AppHandle) {
    match app.get_webview_window("main") {
        Some(window) => {
            if let Err(err) = apply_overlay_window(&window) {
                log::error!("Failed to show main overlay: {err}");
            }
        }
        None => {
            let _ = tauri::async_runtime::block_on(reopen_main_window(app.clone()));
        }
    }
}

#[tauri::command]
pub async fn reopen_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        apply_overlay_window(&window)?;
        info!("Main window already exists, refreshed overlay on all spaces");
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(&app, "main", WebviewUrl::App("/".into()))
        .resizable(false)
        .transparent(true)
        .shadow(false)
        .background_color(Color(0, 0, 0, 0))
        .decorations(false)
        .always_on_top(true)
        .focusable(false)
        .visible_on_all_workspaces(true)
        .background_throttling(BackgroundThrottlingPolicy::Disabled)
        .title("Roam")
        .skip_taskbar(true)
        .build()
        .map_err(|e| e.to_string())?;

    apply_overlay_window(&window)?;
    info!("Reopened main window");

    Ok(())
}

pub fn focus_setting_window(window: &WebviewWindow) {
    let _ = window.unminimize();
    let _ = window.set_size(tauri::LogicalSize::new(1000.0, 650.0));
    let _ = window.center();
    let _ = window.show();
    let _ = window.set_focus();
}

pub fn open_setting_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("setting") {
        focus_setting_window(&window);
        return;
    }

    let settings = AppConfig::new();
    let mut builder =
        WebviewWindowBuilder::new(&app, "setting", WebviewUrl::App("/setting".into()))
            .title("Roam Home")
            .inner_size(1000.0, 650.0)
            .min_inner_size(500.0, 400.0)
            .decorations(true)
            .resizable(true)
            .theme(if settings.get_theme() == "dark" {
                Some(tauri::Theme::Dark)
            } else {
                Some(tauri::Theme::Light)
            })
            .transparent(true);

    #[cfg(target_os = "macos")]
    {
        builder = builder.hidden_title(true);
    }

    let window = builder.build().unwrap_or_else(|e| {
        log::error!("Failed to create setting window: {}", e);
        panic!("Window creation failed: {}", e);
    });

    let _ = window.center();
    info!("open setting window");
}
