#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use bb8::Pool;
use bb8_tiberius::ConnectionManager;
use tiberius::{AuthMethod, Config};
use tauri::{Manager, State};
use std::env;
use dotenvy::dotenv;

struct DbState {
    pool: Pool<ConnectionManager>,
}

#[tauri::command]
async fn authenticate(
    username: String,
    pin: String,
    state: State<'_, DbState>,
) -> Result<String, String> {
    let mut client = state.pool.get().await.map_err(|_| "Error interno".to_string())?;

    let stream = client
        .query(
            "SELECT password, name FROM employee WHERE username = @P1 AND status = 1",
            &[&username],
        )
        .await
        .map_err(|_| "Error interno".to_string())?;

    // Si no hay fila o hay un error, devolvemos un mensaje genérico
    let row = match stream.into_row().await {
        Ok(Some(r)) => r,
        _ => return Err("Credenciales incorrectas".to_string()),
    };

    let db_pass: &str = row.get(0).unwrap_or("");
    let name: &str = row.get(1).unwrap_or("");

    if db_pass == pin {
        Ok(name.to_string())
    } else {
        Err("Credenciales incorrectas".to_string())
    }
}

#[tauri::command]
async fn check_db_connection(state: State<'_, DbState>) -> Result<bool, String> {
    let mut client = state.pool.get().await.map_err(|e| format!("Error de pool: {}", e))?;
    client.query("SELECT 1", &[]).await.map_err(|e| format!("Sin respuesta: {}", e))?;
    Ok(true)
}

fn main() {
    // Carga las variables del archivo .env
    dotenv().ok();

    tauri::Builder::default()
        .setup(|app| {
            let host = env::var("DB_HOST").expect("Falta DB_HOST en .env");
            let port: u16 = env::var("DB_PORT")
                .unwrap_or_else(|_| "1433".to_string())
                .parse()
                .expect("DB_PORT debe ser un número");
            let user = env::var("DB_USER").expect("Falta DB_USER en .env");
            let pass = env::var("DB_PASS").expect("Falta DB_PASS en .env");
            let db_name = env::var("DB_NAME").expect("Falta DB_NAME en .env");

            let mut config = Config::new();
            config.host(host);
            config.port(port);
            config.database(db_name);
            config.authentication(AuthMethod::sql_server(user, pass));
            config.trust_cert();

            let manager = ConnectionManager::build(config).expect("Configuración inválida");

            let pool = tauri::async_runtime::block_on(async {
                Pool::builder()
                    .max_size(5)
                    .build(manager)
                    .await
                    .expect("No se pudo conectar a la base de datos SQL Server")
            });

            app.manage(DbState { pool });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![authenticate, check_db_connection])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}