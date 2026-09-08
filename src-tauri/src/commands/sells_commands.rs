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