use bb8::Pool;
use bb8_tiberius::ConnectionManager;

pub async fn get_employees(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "SELECT employeeId, name, lastname, username, admin, status, CONVERT(VARCHAR(10), ISNULL(createdAt, GETDATE()), 120) as createdAt FROM employee";
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
            "status": row.get::<bool, _>("status").unwrap_or(false),
            "createdAt": row.get::<&str, _>("createdAt").unwrap_or("")
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

pub async fn fetch_attendance(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, emp_id: i32, start_date: String, end_date: String) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "
        SELECT CONVERT(VARCHAR(10), attDate, 120) as attDate, 
               CONVERT(VARCHAR(5), clockIn, 108) as clockIn, 
               isDayOff 
        FROM attendance 
        WHERE employeeId = @P1 AND attDate >= CAST(@P2 AS DATE) AND attDate <= CAST(@P3 AS DATE)
    ";
    let stream = client.query(query, &[&emp_id, &start_date, &end_date]).await.map_err(|e| e.to_string())?;
    let rows = stream.into_first_result().await.map_err(|e| e.to_string())?;
    
    let mut list = Vec::new();
    for row in rows {
        list.push(serde_json::json!({
            "date": row.get::<&str, _>("attDate").unwrap_or("").to_string(),
            "clockIn": row.get::<&str, _>("clockIn").unwrap_or(""),
            "isDayOff": row.get::<bool, _>("isDayOff").unwrap_or(false)
        }));
    }
    Ok(list)
}

pub async fn toggle_day_off(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, emp_id: i32, date: String) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "
        IF EXISTS (SELECT 1 FROM attendance WHERE employeeId = @P1 AND attDate = CAST(@P2 AS DATE))
        BEGIN
            UPDATE attendance 
            SET isDayOff = CASE WHEN isDayOff = 1 THEN 0 ELSE 1 END 
            WHERE employeeId = @P1 AND attDate = CAST(@P2 AS DATE);
        END
        ELSE
        BEGIN
            INSERT INTO attendance (employeeId, attDate, isDayOff) VALUES (@P1, CAST(@P2 AS DATE), 1);
        END
    ";
    client.execute(query, &[&emp_id, &date]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn register_clock_in(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, emp_id: i32) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "
        IF NOT EXISTS (SELECT 1 FROM attendance WHERE employeeId = @P1 AND attDate = CAST(GETDATE() AS DATE))
            INSERT INTO attendance (employeeId, attDate, clockIn) VALUES (@P1, CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME))
        ELSE
            UPDATE attendance SET clockIn = CAST(GETDATE() AS TIME) WHERE employeeId = @P1 AND attDate = CAST(GETDATE() AS DATE) AND clockIn IS NULL
    ";
    client.execute(query, &[&emp_id]).await.map_err(|e| e.to_string())?;
    Ok(())
}