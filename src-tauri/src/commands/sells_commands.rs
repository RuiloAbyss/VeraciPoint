use tauri::State;
use crate::DbState;
use crate::models::sells::SaleDetailInput;
use crate::services::sells_service;

#[tauri::command]
pub async fn register_new_sale(
    employee_id: i32,
    cash: bool,
    total: f64,
    details: Vec<SaleDetailInput>,
    state: State<'_, DbState>,
) -> Result<i32, String> {
    sells_service::register_sale(&state.pool, employee_id, cash, total, details).await
}

#[tauri::command]
pub async fn get_sales_history(state: State<'_, DbState>) -> Result<Vec<serde_json::Value>, String> {
    sells_service::fetch_sales(&state.pool).await
}

#[tauri::command]
pub async fn get_sale_details(venta_id: i32, state: State<'_, DbState>) -> Result<Vec<serde_json::Value>, String> {
    sells_service::fetch_sale_details(&state.pool, venta_id).await
}