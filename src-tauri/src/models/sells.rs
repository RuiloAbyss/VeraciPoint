use serde::Deserialize;

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SaleDetailInput {
    pub product_id: i32,
    pub quantity: f64,
    pub subtotal: f64,
}