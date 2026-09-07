// src-tauri/src/commands/turn_commands.rs
use tauri::State;
use crate::DbState;
use crate::services::turn_service;

#[tauri::command]
pub async fn open_cash_register(employee_id: i32, start_money: f64, state: State<'_, DbState>) -> Result<i32, String> {
    turn_service::open_turn(&state.pool, employee_id, start_money).await
}

#[tauri::command]
pub async fn check_turn_status(employee_id: i32, state: State<'_, DbState>) -> Result<bool, String> {
    turn_service::check_active_turn(&state.pool, employee_id).await
}

#[tauri::command]
pub async fn close_cash_register(turn_id: i32, end_money: f64, state: State<'_, DbState>) -> Result<(), String> {
    turn_service::close_turn(&state.pool, turn_id, end_money).await
}