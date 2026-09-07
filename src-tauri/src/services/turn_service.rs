use bb8::Pool;
use bb8_tiberius::ConnectionManager;

pub async fn open_turn(pool: &Pool<ConnectionManager>, employee_id: i32, start_money: f64) -> Result<i32, String> {
    let mut client = pool.get().await.map_err(|e| format!("Error de conexión: {}", e))?;
    
    // 1. Verificar si ya hay un turno activo
    let check_query = "SELECT turnId FROM turnControl WHERE employeeId = @P1 AND endtime IS NULL";
    let stream = client.query(check_query, &[&employee_id]).await.map_err(|e| format!("Error validando turno: {}", e))?;
    
    if let Some(row) = stream.into_row().await.map_err(|e| e.to_string())? {
        let active_turn_id: i32 = row.get(0).unwrap_or(0);
        return Ok(active_turn_id);
    }
    
    // 2. Insertar usando OUTPUT para que Tiberius reciba exactamente un i32
    let insert_query = "
        INSERT INTO turnControl (employeeId, startmoney, totalsells)
        OUTPUT INSERTED.turnId
        VALUES (@P1, CAST(@P2 AS DECIMAL(10,2)), 0);
    ";
    
    let stream = client.query(insert_query, &[&employee_id, &start_money]).await.map_err(|e| format!("Error al abrir caja: {}", e))?;
    let row = stream.into_row().await.map_err(|e| e.to_string())?.ok_or("No se pudo obtener el ID del turno")?;
    
    Ok(row.get::<i32, _>(0).unwrap_or(0))
}

pub async fn check_active_turn(pool: &Pool<ConnectionManager>, employee_id: i32) -> Result<bool, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let check_query = "SELECT TOP 1 1 FROM turnControl WHERE employeeId = @P1 AND endtime IS NULL";
    let stream = client.query(check_query, &[&employee_id]).await.map_err(|e| e.to_string())?;
    Ok(stream.into_row().await.map_err(|e| e.to_string())?.is_some())
}

pub async fn close_turn(pool: &Pool<ConnectionManager>, turn_id: i32, end_money: f64) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    
    // Usamos UPDATE directo con CAST para el dinero
    let query = "
        UPDATE turnControl
        SET endtime = CONVERT(TIME, GETDATE()), 
            endMoney = CAST(@P2 AS DECIMAL(10,2))
        WHERE turnId = @P1 AND endtime IS NULL;
    ";
    
    client.execute(query, &[&turn_id, &end_money]).await.map_err(|e| format!("Error al cerrar caja: {}", e))?;
    Ok(())
}