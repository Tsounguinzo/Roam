use super::utils::{open_setting_window, reopen_main_window, show_main_overlay};
use log::info;
use tauri::{
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
    tray::TrayIconEvent,
    AppHandle, Manager,
};

pub fn init_system_tray(app: &AppHandle) -> tauri::Result<()> {
    let home = MenuItem::with_id(app, "home", "Home", true, None::<&str>)?;
    let toggle_visibility =
        MenuItem::with_id(app, "toggle_visibility", "Show/Hide", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let restart = MenuItem::with_id(app, "restart", "Restart", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[&home, &toggle_visibility, &separator, &restart, &quit],
    )?;

    let Some(tray) = app.tray_by_id("main") else {
        log::error!("Tray icon 'main' not found. Check tauri.conf.json trayIcon config.");
        return Ok(());
    };

    tray.set_menu(Some(menu))?;
    tray.set_show_menu_on_left_click(true)?;
    tray.on_menu_event(handle_tray_event);
    tray.on_tray_icon_event(|tray, event| {
        if let TrayIconEvent::DoubleClick { .. } = event {
            open_setting_window(tray.app_handle().clone());
        }
    });

    Ok(())
}

pub fn handle_tray_event(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        "home" => open_setting_window(app.clone()),
        "toggle_visibility" => {
            match app.get_webview_window("main") {
                Some(window) => match window.is_visible() {
                    Ok(true) => {
                        let _ = window.hide();
                    }
                    Ok(false) | Err(_) => {
                        show_main_overlay(app);
                    }
                },
                None => {
                    let _ = tauri::async_runtime::block_on(reopen_main_window(app.clone()));
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
}
