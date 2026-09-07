use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Product {
    pub id: i32,
    pub name: String,
    pub price: f64,
    pub category: String,
    pub barcode: Option<i64>,
    pub sellformat: Option<String>,
    pub stock: f64,
    pub min_stock: Option<f64>,
    pub max_stock: Option<f64>,
    pub status: i32,
    pub photo: Option<String>,
}