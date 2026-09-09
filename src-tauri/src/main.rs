#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use bb8::Pool;
use bb8_tiberius::ConnectionManager;
use tiberius::{AuthMethod, Config};
use tauri::{Manager, State};
use std::env;
use dotenvy::dotenv;
use serde::Serialize;

pub mod models;
pub mod services;
pub mod commands;

pub struct DbState {
    pub pool: Pool<ConnectionManager>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthResponse {
    pub employee_id: i32,
    pub name: String,
    pub is_admin: bool,
}

#[tauri::command]
async fn authenticate(
    username: String,
    pin: String,
    state: State<'_, DbState>,
) -> Result<AuthResponse, String> {
    let mut client = state.pool.get().await.map_err(|_| "Error de conexión".to_string())?;

    let stream = client
        .query(
            "SELECT password, name, admin, employeeId FROM employee WHERE username = @P1 AND status = 1",
            &[&username],
        )
        .await
        .map_err(|_| "Error de consulta".to_string())?;

    let row = match stream.into_row().await {
        Ok(Some(r)) => r,
        _ => return Err("Credenciales incorrectas".to_string()),
    };

    let db_pass: &str = row.get(0).unwrap_or("");
    let name: &str = row.get(1).unwrap_or("");
    let is_admin: bool = row.get(2).unwrap_or(false);
    let employee_id: i32 = row.get(3).unwrap_or(0);

    if db_pass == pin {
        Ok(AuthResponse {
            employee_id,
            name: name.to_string(),
            is_admin,
        })
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
    dotenv().ok();

    tauri::Builder::default()
        .setup(|app| {
            let host = env::var("DB_HOST").expect("Falta DB_HOST");
            let port: u16 = env::var("DB_PORT").unwrap_or_else(|_| "1433".to_string()).parse().expect("DB_PORT numérico");
            let user = env::var("DB_USER").expect("Falta DB_USER");
            let pass = env::var("DB_PASS").expect("Falta DB_PASS");
            let db_name = env::var("DB_NAME").expect("Falta DB_NAME");

            let mut config = Config::new();
            config.host(host);
            config.port(port);
            config.database(db_name);
            config.authentication(AuthMethod::sql_server(user, pass));
            config.trust_cert();

            let manager = ConnectionManager::build(config).expect("Configuración inválida");

            let pool = tauri::async_runtime::block_on(async {
                Pool::builder().max_size(5).build(manager).await.expect("Error al conectar")
            });

            app.manage(DbState { pool });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            authenticate, 
            check_db_connection,

            commands::turn_commands::open_cash_register,
            commands::turn_commands::check_turn_status,
            commands::turn_commands::close_cash_register,

            commands::product_commands::get_all_products,
            commands::product_commands::restock_item,
            commands::product_commands::activate_item,
            commands::product_commands::deactivate_item,
            commands::product_commands::discard_item_stock,
            commands::product_commands::upload_item_photo,
            commands::product_commands::edit_item,
            commands::product_commands::create_item,
            commands::product_commands::delete_item_hard,

            commands::sells_commands::register_new_sale,
            commands::sells_commands::get_sales_history,
            commands::sells_commands::get_sale_details,

        ])
        .run(tauri::generate_context!())
        .expect("error running tauri");
}