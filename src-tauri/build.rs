fn main() {
    println!("cargo:rerun-if-changed=../.env");

    if std::env::var("GOOGLE_CALENDAR_CLIENT_ID").is_err() {
        if let Ok(dotenv) = std::fs::read_to_string("../.env") {
            if let Some(client_id) = read_dotenv_value(&dotenv, "GOOGLE_CALENDAR_CLIENT_ID") {
                println!("cargo:rustc-env=GOOGLE_CALENDAR_CLIENT_ID={client_id}");
            }
        }
    }

    if std::env::var("GOOGLE_CALENDAR_CLIENT_SECRET").is_err() {
        if let Ok(dotenv) = std::fs::read_to_string("../.env") {
            if let Some(client_secret) = read_dotenv_value(&dotenv, "GOOGLE_CALENDAR_CLIENT_SECRET") {
                println!("cargo:rustc-env=GOOGLE_CALENDAR_CLIENT_SECRET={client_secret}");
            }
        }
    }

    tauri_build::build()
}

fn read_dotenv_value(contents: &str, key: &str) -> Option<String> {
    contents.lines().find_map(|line| {
        let trimmed = line.trim();

        if trimmed.is_empty() || trimmed.starts_with('#') {
            return None;
        }

        let (name, value) = trimmed.split_once('=')?;
        if name.trim() != key {
            return None;
        }

        Some(
            value
                .trim()
                .trim_matches('"')
                .trim_matches('\'')
                .to_string(),
        )
    })
}
