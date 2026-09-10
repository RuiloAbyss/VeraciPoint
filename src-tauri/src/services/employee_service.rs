use bb8::Pool;
use bb8_tiberius::ConnectionManager;

pub async fn get_employees(pool: &Pool<ConnectionManager>) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    // Obtenemos todos para permitir el filtro en el frontend
    let query = "SELECT employeeId, name, lastname, username, admin, status FROM employee";
    let stream = client.simple_query(query).await.map_err(|e| e.to_string())?;
    let rows = stream.into_first_result().await.map_err(|e| e.to_string())?;
    
    let mut list = Vec::new();
    for row in rows {
        list.push(serde_json::json!({
            "id": row.get::<i32, _>("employeeId").unwrap_or(0),
            "name": row.get::<&str, _>("name").unwrap_or(""),
            "lastname": row.get::<&str, _>("lastname").unwrap_or(""),
            "username": row.get::<&str, _>("username").unwrap_or(""),
            "isAdmin": row.get::<bool, _>("admin").unwrap_or(false),
            "status": row.get::<bool, _>("status").unwrap_or(false)
        }));
    }
    Ok(list)
}

pub async fn upsert_employee(pool: &Pool<ConnectionManager>, id: i32, name: String, lastname: String, user: String, pass: String, is_admin: bool) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    if id == 0 {
        let q = "INSERT INTO employee (name, lastname, username, password, admin, status) VALUES (@P1, @P2, @P3, @P4, @P5, 1)";
        client.execute(q, &[&name, &lastname, &user, &pass, &is_admin]).await.map_err(|e| e.to_string())?;
    } else {
        if pass.is_empty() {
            let q = "UPDATE employee SET name=@P1, lastname=@P2, username=@P3, admin=@P4 WHERE employeeId=@P5";
            client.execute(q, &[&name, &lastname, &user, &is_admin, &id]).await.map_err(|e| e.to_string())?;
        } else {
            let q = "UPDATE employee SET name=@P1, lastname=@P2, username=@P3, password=@P4, admin=@P5 WHERE employeeId=@P6";
            client.execute(q, &[&name, &lastname, &user, &pass, &is_admin, &id]).await.map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub async fn toggle_employee_status(pool: &Pool<ConnectionManager>, id: i32, status: bool) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    client.execute("UPDATE employee SET status = @P1 WHERE employeeId = @P2", &[&status, &id]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn get_shifts(pool: &Pool<ConnectionManager>) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "
        SELECT s.shiftId, s.employeeId, e.name + ' ' + e.lastname AS empName, 
               CONVERT(VARCHAR(5), s.startTime, 108) AS startT, 
               CONVERT(VARCHAR(5), s.endTime, 108) AS endT, s.daysCovered 
        FROM shift_control s
        INNER JOIN employee e ON s.employeeId = e.employeeId
        WHERE s.status = 1
    ";
    let stream = client.simple_query(query).await.map_err(|e| e.to_string())?;
    let rows = stream.into_first_result().await.map_err(|e| e.to_string())?;
    
    let mut list = Vec::new();
    for row in rows {
        list.push(serde_json::json!({
            "shiftId": row.get::<i32, _>("shiftId").unwrap_or(0),
            "employeeId": row.get::<i32, _>("employeeId").unwrap_or(0),
            "employeeName": row.get::<&str, _>("empName").unwrap_or(""),
            "startTime": row.get::<&str, _>("startT").unwrap_or(""),
            "endTime": row.get::<&str, _>("endT").unwrap_or(""),
            "daysCovered": row.get::<&str, _>("daysCovered").unwrap_or("")
        }));
    }
    Ok(list)
}

pub async fn upsert_shift(pool: &Pool<ConnectionManager>, shift_id: i32, emp_id: i32, start: String, end: String, days: String) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    if shift_id == 0 {
        let q = "INSERT INTO shift_control (employeeId, startTime, endTime, daysCovered, status) VALUES (@P1, CAST(@P2 AS TIME), CAST(@P3 AS TIME), @P4, 1)";
        client.execute(q, &[&emp_id, &start, &end, &days]).await.map_err(|e| e.to_string())?;
    } else {
        let q = "UPDATE shift_control SET employeeId=@P1, startTime=CAST(@P2 AS TIME), endTime=CAST(@P3 AS TIME), daysCovered=@P4 WHERE shiftId=@P5";
        client.execute(q, &[&emp_id, &start, &end, &days, &shift_id]).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}