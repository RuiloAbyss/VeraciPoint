use tauri::State;
use crate::DbState;
use crate::services::order_service::{self, OrderDetailInput};

#[tauri::command]
pub async fn fetch_orders(state: State<'_, DbState>) -> Result<Vec<serde_json::Value>, String> {
    order_service::get_orders(&state.pool).await
}

#[tauri::command]
pub async fn fetch_order_details(order_id: i32, state: State<'_, DbState>) -> Result<Vec<serde_json::Value>, String> {
    order_service::get_order_details(&state.pool, order_id).await
}

#[tauri::command]
pub async fn register_order(cat_id: String, emp_id: i32, total: f64, details: Vec<OrderDetailInput>, state: State<'_, DbState>) -> Result<i32, String> {
    order_service::create_order(&state.pool, cat_id, emp_id, total, details).await
}

#[tauri::command]
pub async fn update_order_status(order_id: i32, emp_id: i32, status: String, method: Option<String>, total: f64, register_cash: f64, external_fund: f64, details: Vec<order_service::OrderDetailInput>, state: tauri::State<'_, crate::DbState>) -> Result<(), String> {
    crate::services::order_service::process_order(&state.pool, order_id, emp_id, status, method, total, register_cash, external_fund, details).await
}

#[tauri::command]
pub async fn fetch_providers(state: tauri::State<'_, crate::DbState>) -> Result<Vec<serde_json::Value>, String> {
    crate::services::order_service::fetch_providers(&state.pool).await
}

#[tauri::command]
pub async fn toggle_provider(name: String, current_status: bool, state: tauri::State<'_, crate::DbState>) -> Result<(), String> {
    crate::services::order_service::toggle_provider_status(&state.pool, name, current_status).await
}

#[tauri::command]
pub async fn add_provider(name: String, description: Option<String>, cellphone: Option<String>, state: tauri::State<'_, crate::DbState>) -> Result<(), String> {
    crate::services::order_service::create_provider(&state.pool, name, description, cellphone).await
}

#[tauri::command]
pub async fn edit_provider(id: String, name: String, description: Option<String>, cellphone: Option<String>, state: tauri::State<'_, crate::DbState>) -> Result<(), String> {
    crate::services::order_service::update_provider_name(&state.pool, id, name, description, cellphone).await
}