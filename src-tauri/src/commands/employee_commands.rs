use tauri::State;
use crate::DbState;
use crate::services::employee_service;

#[tauri::command]
pub async fn fetch_employees(state: State<'_, DbState>) -> Result<Vec<serde_json::Value>, String> {
    employee_service::get_employees(&state.pool).await
}

#[tauri::command]
pub async fn save_employee(id: i32, name: String, lastname: String, user: String, pass: String, is_admin: bool, state: State<'_, DbState>) -> Result<(), String> {
    employee_service::upsert_employee(&state.pool, id, name, lastname, user, pass, is_admin).await
}

#[tauri::command]
pub async fn toggle_employee(id: i32, status: bool, state: State<'_, DbState>) -> Result<(), String> {
    employee_service::toggle_employee_status(&state.pool, id, status).await
}

#[tauri::command]
pub async fn fetch_shifts(state: State<'_, DbState>) -> Result<Vec<serde_json::Value>, String> {
    employee_service::get_shifts(&state.pool).await
}

#[tauri::command]
pub async fn save_shift(shift_id: i32, emp_id: i32, start: String, end: String, days: String, state: State<'_, DbState>) -> Result<(), String> {
    employee_service::upsert_shift(&state.pool, shift_id, emp_id, start, end, days).await
}