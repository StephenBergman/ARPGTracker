use tauri::{menu::MenuBuilder, tray::TrayIconBuilder, App, AppHandle, Emitter, Manager};

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn handle_menu(app: &AppHandle, id: &str) {
    match id {
        "open" => show_main_window(app),
        "compact" => {
            let _ = app.emit("tray-toggle-compact", ());
        }
        "always-on-top" => {
            let _ = app.emit("tray-toggle-always-on-top", ());
        }
        "widget-mode" => {
            let _ = app.emit("tray-toggle-widget-mode", ());
        }
        "lock-position" => {
            let _ = app.emit("tray-toggle-position-lock", ());
        }
        "refresh" => {
            let _ = app.emit("tray-refresh-data", ());
        }
        "settings" => {
            show_main_window(app);
            let _ = app.emit("tray-open-settings", ());
        }
        "exit" => app.exit(0),
        "game-poe" => {
            let _ = app.emit("tray-select-game", "poe");
        }
        "game-poe2" => {
            let _ = app.emit("tray-select-game", "poe2");
        }
        "game-diablo4" => {
            let _ = app.emit("tray-select-game", "diablo4");
        }
        "game-lastEpoch" => {
            let _ = app.emit("tray-select-game", "lastEpoch");
        }
        "game-diablo2Resurrected" => {
            let _ = app.emit("tray-select-game", "diablo2Resurrected");
        }
        "game-projectDiablo2" => {
            let _ = app.emit("tray-select-game", "projectDiablo2");
        }
        "game-torchlightInfinite" => {
            let _ = app.emit("tray-select-game", "torchlightInfinite");
        }
        _ => {}
    }
}

pub fn create(app: &mut App) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .text("open", "Open ARPG Seasons")
        .separator()
        .text("compact", "Toggle Compact Mode")
        .text("always-on-top", "Toggle Always on Top")
        .text("widget-mode", "Toggle Widget Mode")
        .text("lock-position", "Lock / Unlock Position")
        .separator()
        .text("game-poe", "Path of Exile")
        .text("game-poe2", "Path of Exile 2")
        .text("game-diablo4", "Diablo IV")
        .text("game-lastEpoch", "Last Epoch")
        .text("game-diablo2Resurrected", "Diablo II: Resurrected")
        .text("game-projectDiablo2", "Project Diablo 2")
        .text("game-torchlightInfinite", "Torchlight: Infinite")
        .separator()
        .text("settings", "Settings")
        .text("refresh", "Check Season Data")
        .text("exit", "Exit")
        .build()?;

    let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("ARPG Seasons")
        .on_menu_event(|app, event| handle_menu(app, event.id().as_ref()));
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}
