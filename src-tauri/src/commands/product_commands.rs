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
pub async fn discard_item_stock(id: i32, qty: f64, state: State<'_, DbState>) -> Result<(), String> {
    product_service::discard_stock(&state.pool, id, qty).await
}

#[tauri::command]
pub async fn upload_item_photo(id: i32, base64: String, state: State<'_, DbState>) -> Result<(), String> {
    product_service::upload_photo(&state.pool, id, base64).await
}

#[tauri::command]
pub async fn edit_item(id: i32, name: String, price: f64, barcode: Option<i64>, category: String, sellformat: String, min_stock: Option<f64>, max_stock: Option<f64>, state: tauri::State<'_, crate::DbState>) -> Result<(), String> {
    crate::services::product_service::edit_product(&state.pool, id, name, price, barcode, category, sellformat, min_stock, max_stock).await
}

#[tauri::command]
pub async fn create_item(name: String, price: f64, category: String, barcode: Option<i64>, sellformat: String, quantity: f64, min_stock: Option<f64>, max_stock: Option<f64>, state: tauri::State<'_, crate::DbState>) -> Result<i32, String> {
    crate::services::product_service::create_product(&state.pool, name, price, category, barcode, sellformat, quantity, min_stock, max_stock).await
}

#[tauri::command]
pub async fn activate_item(id: i32, state: tauri::State<'_, crate::DbState>) -> Result<(), String> {
    crate::services::product_service::activate_product(&state.pool, id).await
}