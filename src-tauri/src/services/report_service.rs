use bb8::Pool;
use bb8_tiberius::ConnectionManager;

pub async fn get_reports(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    
    let query = "
        SELECT r.reportId, r.description, r.type, 
               ISNULL(e.name + ' ' + e.lastname, 'Sistema') as employee,
               CONVERT(VARCHAR(10), r.createdAt, 120) as date,
               CONVERT(VARCHAR(5), r.createdAt, 108) as time,
               r.referenceId
        FROM reports r
        LEFT JOIN employee e ON r.employeeId = e.employeeId
        ORDER BY r.createdAt DESC
    ";
    
    let rows = client.simple_query(query).await.map_err(|e| e.to_string())?.into_first_result().await.unwrap_or_default();
    
    let mut list = Vec::new();
    for r in rows {
        list.push(serde_json::json!({
            "id": r.get::<i32, _>("reportId").unwrap_or(0),
            "description": r.get::<&str, _>("description").unwrap_or(""),
            "type": r.get::<&str, _>("type").unwrap_or(""),
            "employee": r.get::<&str, _>("employee").unwrap_or("Sistema"),
            "date": r.get::<&str, _>("date").unwrap_or(""),
            "time": r.get::<&str, _>("time").unwrap_or(""),
            "referenceId": r.get::<i32, _>("referenceId")
        }));
    }
    Ok(list)
}

// Llama a esta función desde el frontend cuando se abra o cierre una caja
pub async fn register_manual_event(pool: &Pool<ConnectionManager>, desc: String, emp_id: i32, event_type: String) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "INSERT INTO reports (description, employeeId, type) VALUES (@P1, @P2, @P3)";
    client.execute(query, &[&desc, &emp_id, &event_type]).await.map_err(|e| e.to_string())?;
    Ok(())
}