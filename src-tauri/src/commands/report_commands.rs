use tauri::State;
use crate::DbState;
// Asegúrate de que la ruta al servicio coincida con tu estructura de carpetas
use crate::services::report_service; 

#[tauri::command]
pub async fn fetch_reports(state: State<'_, DbState>) -> Result<Vec<serde_json::Value>, String> {
    report_service::get_reports(&state.pool).await
}

#[tauri::command]
pub async fn register_manual_event(
    description: String, 
    employee_id: i32, 
    event_type: String, 
    state: State<'_, DbState>
) -> Result<(), String> {
    report_service::register_manual_event(&state.pool, description, employee_id, event_type).await
}