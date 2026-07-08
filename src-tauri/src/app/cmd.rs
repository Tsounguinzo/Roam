use log::{error, info};
use mouse_position::mouse_position::Mouse;
use rand::{distributions::Alphanumeric, Rng};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpListener;
use tauri::Manager;

const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_SCOPE: &str = "https://www.googleapis.com/auth/calendar.readonly";

#[derive(Serialize)]
pub struct GoogleCalendarToken {
    access_token: String,
    expires_in: u64,
    scope: String,
    token_type: String,
}

#[derive(Deserialize)]
struct GoogleTokenResponse {
    access_token: String,
    expires_in: Option<u64>,
    scope: Option<String>,
    token_type: Option<String>,
}

fn google_calendar_client_id() -> Option<String> {
    std::env::var("GOOGLE_CALENDAR_CLIENT_ID")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| option_env!("GOOGLE_CALENDAR_CLIENT_ID").map(str::to_string))
}

fn google_calendar_client_secret() -> Option<String> {
    std::env::var("GOOGLE_CALENDAR_CLIENT_SECRET")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| option_env!("GOOGLE_CALENDAR_CLIENT_SECRET").map(str::to_string))
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                vec![byte as char]
            }
            _ => format!("%{byte:02X}").chars().collect(),
        })
        .collect()
}

fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;

    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            if let Ok(hex) = u8::from_str_radix(&value[index + 1..index + 3], 16) {
                decoded.push(hex);
                index += 3;
                continue;
            }
        }

        decoded.push(if bytes[index] == b'+' { b' ' } else { bytes[index] });
        index += 1;
    }

    String::from_utf8_lossy(&decoded).into_owned()
}

fn random_oauth_value(length: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

fn pkce_challenge(verifier: &str) -> String {
    use base64::Engine;

    let digest = Sha256::digest(verifier.as_bytes());
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(digest)
}

fn parse_query_params(path: &str) -> HashMap<String, String> {
    let Some((_, query)) = path.split_once('?') else {
        return HashMap::new();
    };

    query
        .split('&')
        .filter_map(|pair| {
            let (key, value) = pair.split_once('=')?;
            Some((percent_decode(key), percent_decode(value)))
        })
        .collect()
}

fn wait_for_google_oauth_callback(listener: TcpListener, expected_state: String) -> Result<String, String> {
    let (mut stream, _) = listener.accept().map_err(|err| err.to_string())?;
    let mut buffer = [0_u8; 4096];
    let bytes_read = stream.read(&mut buffer).map_err(|err| err.to_string())?;
    let request = String::from_utf8_lossy(&buffer[..bytes_read]);
    let request_line = request.lines().next().unwrap_or_default();
    let path = request_line.split_whitespace().nth(1).unwrap_or_default();
    let params = parse_query_params(path);

    let body = if params.get("state") == Some(&expected_state) && params.contains_key("code") {
        "Google authorization was received. Return to Roam to finish connecting Calendar."
    } else {
        "Google Calendar sign-in failed. Return to Roam for details."
    };

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body,
    );
    let _ = stream.write_all(response.as_bytes());

    if params.get("state") != Some(&expected_state) {
        return Err("Google sign-in returned an invalid state.".to_string());
    }

    if let Some(error) = params.get("error") {
        return Err(format!("Google sign-in failed: {error}"));
    }

    params
        .get("code")
        .cloned()
        .ok_or_else(|| "Google sign-in did not return an authorization code.".to_string())
}

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

#[tauri::command]
pub fn is_google_calendar_desktop_oauth_configured() -> bool {
    google_calendar_client_id().is_some()
}

#[tauri::command]
pub async fn connect_google_calendar_desktop() -> Result<GoogleCalendarToken, String> {
    let client_id = google_calendar_client_id()
        .ok_or_else(|| "Set GOOGLE_CALENDAR_CLIENT_ID to enable Google Calendar sign-in.".to_string())?;
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|err| err.to_string())?;
    let redirect_uri = format!(
        "http://127.0.0.1:{}",
        listener.local_addr().map_err(|err| err.to_string())?.port()
    );
    let state = random_oauth_value(32);
    let verifier = random_oauth_value(64);
    let challenge = pkce_challenge(&verifier);
    let auth_url = format!(
        "{GOOGLE_AUTH_URL}?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}&code_challenge={}&code_challenge_method=S256&access_type=offline&prompt=consent",
        percent_encode(&client_id),
        percent_encode(&redirect_uri),
        percent_encode(GOOGLE_CALENDAR_SCOPE),
        percent_encode(&state),
        percent_encode(&challenge),
    );

    open::that(auth_url).map_err(|err| format!("Unable to open browser for Google sign-in: {err}"))?;

    let code = tauri::async_runtime::spawn_blocking(move || {
        wait_for_google_oauth_callback(listener, state)
    })
    .await
    .map_err(|err| err.to_string())??;

    let mut token_request_params = vec![
        ("client_id", client_id.as_str()),
        ("code", code.as_str()),
        ("code_verifier", verifier.as_str()),
        ("grant_type", "authorization_code"),
        ("redirect_uri", redirect_uri.as_str()),
    ];
    let client_secret = google_calendar_client_secret();
    if let Some(client_secret) = client_secret.as_deref() {
        token_request_params.push(("client_secret", client_secret));
    }

    let token_request_body = token_request_params
    .into_iter()
    .map(|(key, value)| format!("{}={}", percent_encode(key), percent_encode(value)))
    .collect::<Vec<_>>()
    .join("&");

    let response = Client::new()
        .post(GOOGLE_TOKEN_URL)
        .header("content-type", "application/x-www-form-urlencoded")
        .body(token_request_body)
        .send()
        .await
        .map_err(|err| err.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Google token exchange failed ({status}): {body}"));
    }

    let token = response
        .json::<GoogleTokenResponse>()
        .await
        .map_err(|err| err.to_string())?;

    Ok(GoogleCalendarToken {
        access_token: token.access_token,
        expires_in: token.expires_in.unwrap_or(3600),
        scope: token.scope.unwrap_or_else(|| GOOGLE_CALENDAR_SCOPE.to_string()),
        token_type: token.token_type.unwrap_or_else(|| "Bearer".to_string()),
    })
}
