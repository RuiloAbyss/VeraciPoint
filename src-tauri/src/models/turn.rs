use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TurnControl {
    pub turn_id: i32,
    pub employee_id: Option<i32>,
    pub turn_date: Option<String>, // Mapeado como String para facilitar la serialización a JSON
    pub starttime: Option<String>,
    pub endtime: Option<String>,
    pub startmoney: f64,
    pub totalsells: Option<f64>,
    pub end_money: Option<f64>,
}