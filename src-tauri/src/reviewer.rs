//! Compiled only into Stephen's Windows reviewer build. Credentials never leave
//! the native process after initial entry and are stored by Windows, not JSON.
use serde_json::{json, Value};
use std::{ptr, time::Duration};
use tauri_plugin_http::reqwest::{Client, Method};
use windows_sys::Win32::Security::Credentials::{
    CredDeleteW, CredFree, CredReadW, CredWriteW, CREDENTIALW, CRED_PERSIST_LOCAL_MACHINE,
    CRED_TYPE_GENERIC,
};

const REPO: &str = "/repos/StephenBergman/ARPGTracker";
const OWNER: &str = "StephenBergman";
const CREDENTIAL: &str = "ARPG Seasons Reviewer/GitHub/StephenBergman/ARPGTracker";
fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(Some(0)).collect()
}

pub fn read_token() -> Result<Option<String>, String> {
    let name = wide(CREDENTIAL);
    let mut credential: *mut CREDENTIALW = ptr::null_mut();
    // CredReadW owns the result until CredFree; copy it before releasing.
    if unsafe { CredReadW(name.as_ptr(), CRED_TYPE_GENERIC, 0, &mut credential) } == 0 {
        return if std::io::Error::last_os_error().raw_os_error() == Some(1168) {
            Ok(None)
        } else {
            Err("Windows Credential Manager could not read the reviewer credential".into())
        };
    }
    let result = unsafe {
        let stored = &*credential;
        if stored.CredentialBlob.is_null()
            || stored.CredentialBlobSize == 0
            || stored.CredentialBlobSize > 512
        {
            Err("Stored reviewer credential is invalid. Reconnect your account.".into())
        } else {
            String::from_utf8(
                std::slice::from_raw_parts(
                    stored.CredentialBlob,
                    stored.CredentialBlobSize as usize,
                )
                .to_vec(),
            )
            .map(Some)
            .map_err(|_| "Stored reviewer credential is invalid".into())
        }
    };
    unsafe {
        CredFree(credential.cast());
    }
    result
}

fn save_token(token: &str) -> Result<(), String> {
    let mut name = wide(CREDENTIAL);
    let mut user = wide(OWNER);
    let mut blob = token.as_bytes().to_vec();
    let mut credential: CREDENTIALW = unsafe { std::mem::zeroed() };
    credential.Type = CRED_TYPE_GENERIC;
    credential.TargetName = name.as_mut_ptr();
    credential.UserName = user.as_mut_ptr();
    credential.CredentialBlobSize = blob.len() as u32;
    credential.CredentialBlob = blob.as_mut_ptr();
    credential.Persist = CRED_PERSIST_LOCAL_MACHINE;
    let written = unsafe { CredWriteW(&credential, 0) };
    blob.fill(0);
    if written == 0 {
        return Err("Windows Credential Manager could not save the reviewer credential".into());
    }
    Ok(())
}

fn main_window(window: &tauri::WebviewWindow) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Review commands are restricted to the main window".into());
    }
    Ok(())
}
fn token() -> Result<String, String> {
    read_token()?.ok_or_else(|| "Connect your GitHub account in the review panel first".into())
}

async fn request(
    token: &str,
    method: Method,
    path: &str,
    body: Option<Value>,
    raw: bool,
) -> Result<Value, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(20))
        .redirect(tauri_plugin_http::reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "Unable to initialize GitHub connection".to_string())?;
    let mut request = client
        .request(method, format!("https://api.github.com{path}"))
        .bearer_auth(token)
        .header("User-Agent", "ARPG-Seasons-Personal-Reviewer")
        .header("X-GitHub-Api-Version", "2026-03-10")
        .header(
            "Accept",
            if raw {
                "application/vnd.github.raw+json"
            } else {
                "application/vnd.github+json"
            },
        );
    if let Some(body) = body {
        request = request
            .header("Content-Type", "application/json")
            .body(body.to_string());
    }
    let response = request
        .send()
        .await
        .map_err(|_| "GitHub could not be reached. Check your connection and retry.".to_string())?;
    let status = response.status().as_u16();
    if !(200..300).contains(&status) {
        return Err(match status {
            401 => "GitHub rejected this token. Reconnect with a valid token.".into(),
            403 => "GitHub denied access. Check token permissions, expiration, and rate limits.".into(),
            404 => "Review data or workflow was not found. Publish the review workflow and queue to main first.".into(),
            _ => format!("GitHub request failed (HTTP {status}). Retry after checking Actions."),
        });
    }
    if status == 204 {
        return Ok(json!({}));
    }
    if response
        .content_length()
        .is_some_and(|size| size > 8_000_000)
    {
        return Err("GitHub response is too large".into());
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|_| "GitHub response could not be read".to_string())?;
    if bytes.len() > 8_000_000 {
        return Err("GitHub response is too large".into());
    }
    serde_json::from_slice(&bytes).map_err(|_| "GitHub returned an invalid response".into())
}

async fn verify_owner(token: &str) -> Result<(), String> {
    let user = request(token, Method::GET, "/user", None, false).await?;
    if user["login"].as_str() != Some(OWNER) {
        return Err("Only StephenBergman's GitHub account can review season updates".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn reviewer_connect(window: tauri::WebviewWindow, token: String) -> Result<(), String> {
    main_window(&window)?;
    let token = token.trim();
    if token.len() < 20
        || token.len() > 512
        || !token.is_ascii()
        || token.chars().any(char::is_whitespace)
    {
        return Err("Enter a valid GitHub personal access token".into());
    }
    verify_owner(token).await?;
    // Verify access to this repository before persisting the credential.
    request(
        token,
        Method::GET,
        &format!("{REPO}/actions/workflows/season-review.yml"),
        None,
        false,
    )
    .await?;
    save_token(token)
}

#[tauri::command]
pub fn reviewer_disconnect(window: tauri::WebviewWindow) -> Result<(), String> {
    main_window(&window)?;
    let name = wide(CREDENTIAL);
    if unsafe { CredDeleteW(name.as_ptr(), CRED_TYPE_GENERIC, 0) } == 0
        && std::io::Error::last_os_error().raw_os_error() != Some(1168)
    {
        return Err("Windows Credential Manager could not remove the credential".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn reviewer_load(window: tauri::WebviewWindow) -> Result<Value, String> {
    main_window(&window)?;
    let token = token()?;
    let queue = request(
        &token,
        Method::GET,
        &format!("{REPO}/contents/data/season-reviews.json?ref=main"),
        None,
        true,
    )
    .await?;
    let dataset = request(
        &token,
        Method::GET,
        &format!("{REPO}/contents/data/seasons.json?ref=main"),
        None,
        true,
    )
    .await?;
    Ok(json!({ "queue": queue, "dataset": dataset }))
}

#[tauri::command]
pub async fn reviewer_submit(
    window: tauri::WebviewWindow,
    decision: Value,
) -> Result<Value, String> {
    main_window(&window)?;
    if decision.to_string().len() > 4000 {
        return Err("Review decision is too large".into());
    }
    let token = token()?;
    verify_owner(&token).await?;
    request(
        &token,
        Method::POST,
        &format!("{REPO}/actions/workflows/season-review.yml/dispatches"),
        Some(json!({ "ref": "main", "inputs": { "decision": decision.to_string() } })),
        false,
    )
    .await
}

#[tauri::command]
pub async fn reviewer_run_status(
    window: tauri::WebviewWindow,
    run_id: u64,
) -> Result<Value, String> {
    main_window(&window)?;
    let result = request(
        &token()?,
        Method::GET,
        &format!("{REPO}/actions/runs/{run_id}"),
        None,
        false,
    )
    .await?;
    Ok(json!({ "status": result["status"], "conclusion": result["conclusion"] }))
}
