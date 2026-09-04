use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")] // Convierte snake_case de Rust a camelCase para TypeScript
pub struct Product {
    pub id: i32,
    pub name: String,
    pub price: f64,
    pub category: String,
    pub barcode: Option<i64>,
    pub sellformat: Option<String>,
    pub stock: f64,
    pub photo: Option<String>,
}