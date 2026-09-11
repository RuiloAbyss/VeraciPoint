use tauri::State;
use crate::DbState;
use crate::services::banner_service;

#[tauri::command]
pub async fn fetch_banners(only_active: bool, state: State<'_, DbState>) -> Result<Vec<serde_json::Value>, String> {
    banner_service::get_banners(&state.pool, only_active).await
}

#[tauri::command]
pub async fn create_banner(title: String, start_date: String, end_date: String, photo: String, state: State<'_, DbState>) -> Result<(), String> {
    banner_service::create_banner(&state.pool, title, start_date, end_date, photo).await
}

#[tauri::command]
pub async fn update_banner(id: i32, title: String, start_date: String, end_date: String, photo: Option<String>, state: State<'_, DbState>) -> Result<(), String> {
    banner_service::update_banner(&state.pool, id, title, start_date, end_date, photo).await
}

#[tauri::command]
pub async fn delete_banner(id: i32, state: State<'_, DbState>) -> Result<(), String> {
    banner_service::delete_banner(&state.pool, id).await
}