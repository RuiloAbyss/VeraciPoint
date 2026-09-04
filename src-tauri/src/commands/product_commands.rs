use tauri::State;
use crate::DbState;
use crate::models::product::Product;
use crate::services::product_service;

#[tauri::command]
pub async fn get_all_products(state: State<'_, DbState>) -> Result<Vec<Product>, String> {
    product_service::fetch_all_products(&state.pool).await
}

#[tauri::command]
pub async fn restock_item(id: i32, qty: f64, state: State<'_, DbState>) -> Result<(), String> {
    product_service::restock_product(&state.pool, id, qty).await
}

#[tauri::command]
pub async fn deactivate_item(id: i32, state: State<'_, DbState>) -> Result<(), String> {
    product_service::deactivate_product(&state.pool, id).await
}

#[tauri::command]
pub async fn upload_item_photo(id: i32, base64: String, state: State<'_, DbState>) -> Result<(), String> {
    product_service::upload_photo(&state.pool, id, base64).await
}