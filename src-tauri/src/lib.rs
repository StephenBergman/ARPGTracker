#[cfg(all(feature = "personal-reviewer", target_os = "windows"))]
mod reviewer;
mod tray;

#[tauri::command]
fn reviewer_status() -> serde_json::Value {
    #[cfg(all(feature = "personal-reviewer", target_os = "windows"))]
    {
        serde_json::json!({ "enabled": true, "connected": reviewer::read_token().ok().flatten().is_some() })
    }
    #[cfg(not(all(feature = "personal-reviewer", target_os = "windows")))]
    {
        serde_json::json!({ "enabled": false, "connected": false })
    }
}

#[tauri::command]
fn watch_widget_drag_release(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        #[cfg(target_os = "windows")]
        {
            use std::{thread, time::Duration};
            use tauri::Emitter;
            use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON};
            loop {
                let pressed = unsafe { (GetAsyncKeyState(VK_LBUTTON as i32) as u16 & 0x8000) != 0 };
                if !pressed {
                    let _ = app.emit("widget-drag-released", ());
                    break;
                }
                thread::sleep(Duration::from_millis(8));
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            use tauri::Emitter;
            let _ = app.emit("widget-drag-released", ());
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(all(feature = "personal-reviewer", target_os = "windows"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        watch_widget_drag_release,
        reviewer_status,
        reviewer::reviewer_connect,
        reviewer::reviewer_disconnect,
        reviewer::reviewer_load,
        reviewer::reviewer_submit,
        reviewer::reviewer_run_status
    ]);
    #[cfg(not(all(feature = "personal-reviewer", target_os = "windows")))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        watch_widget_drag_release,
        reviewer_status
    ]);
    #[cfg(not(all(feature = "personal-reviewer", target_os = "windows")))]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    builder
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(
            |app, _arguments, _working_directory| {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            },
        ))
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|app| {
            tray::create(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
