use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleDetailInput {
    #[serde(rename = "productName")]
    pub product_name: String,
    pub quantity: f64,
    pub subtotal: f64,
}