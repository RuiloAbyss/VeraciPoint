use bb8::Pool;
use bb8_tiberius::ConnectionManager;
use crate::models::sells::SaleDetailInput;

pub async fn register_sale(
    pool: &Pool<ConnectionManager>,
    employee_id: i32,
    cash: bool,
    total: f64,
    details: Vec<SaleDetailInput>,
) -> Result<i32, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;

    client.simple_query("BEGIN TRAN;").await.map_err(|e| e.to_string())?;

    let insert_sale = "
        DECLARE @OutputID TABLE (ventaId INT);

        INSERT INTO sells (employeeId, sellsDate, cash, total)
        OUTPUT INSERTED.ventaId INTO @OutputID
        VALUES (@P1, GETDATE(), @P2, CAST(@P3 AS DECIMAL(10,2)));

        SELECT ventaId FROM @OutputID;
    ";
    
    let venta_result: Result<i32, String> = match client.query(insert_sale, &[&employee_id, &cash, &total]).await {
        Ok(stream) => {
            match stream.into_row().await {
                Ok(Some(row)) => Ok(row.get::<i32, _>(0).unwrap_or(0)),
                Ok(None) => Err("No se obtuvo el ID de la venta".into()),
                Err(e) => Err(e.to_string()),
            }
        }
        Err(e) => Err(e.to_string()),
    }; 

    let venta_id = match venta_result {
        Ok(id) => id,
        Err(err_msg) => {
            let _ = client.simple_query("ROLLBACK TRAN;").await;
            return Err(err_msg);
        }
    };

    // Registrar Detalles usando únicamente productName
    for detail in details {
        let q_detail = "
            INSERT INTO sells_detail (ventaId, productName, quantity, subtotal)
            VALUES (@P1, @P2, CAST(@P3 AS DECIMAL(10,3)), CAST(@P4 AS DECIMAL(10,2)));
        ";
        if let Err(e) = client.execute(q_detail, &[&venta_id, &detail.product_name, &detail.quantity, &detail.subtotal]).await {
            let _ = client.simple_query("ROLLBACK TRAN;").await;
            return Err(format!("Error en detalle: {}", e));
        }
    }

    client.simple_query("COMMIT TRAN;").await.map_err(|e| e.to_string())?;

    Ok(venta_id)
}

pub async fn delete_product_hard(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, id: i32) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    client.execute("DELETE FROM product WHERE productId = @P1", &[&id]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn fetch_sales(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    
    let query = "
        SELECT 
            s.ventaId, 
            e.name + ' ' + e.lastname AS employeeName, 
            FORMAT(s.sellsDate, 'dd/MM/yyyy HH:mm') as saleDate, 
            s.cash, 
            CAST(s.total AS FLOAT) as total
        FROM sells s
        INNER JOIN employee e ON s.employeeId = e.employeeId
        ORDER BY s.ventaId DESC
    ";
    
    let stream = client.simple_query(query).await.map_err(|e| e.to_string())?;
    let rows = stream.into_first_result().await.map_err(|e| e.to_string())?;
    
    let mut sales = Vec::new();
    for row in rows {
        sales.push(serde_json::json!({
            "id": row.get::<i32, _>("ventaId").unwrap_or(0),
            "employeeName": row.get::<&str, _>("employeeName").unwrap_or(""),
            "date": row.get::<&str, _>("saleDate").unwrap_or(""),
            "cash": row.get::<bool, _>("cash").unwrap_or(true),
            "total": row.get::<f64, _>("total").unwrap_or(0.0),
        }));
    }
    Ok(sales)
}

pub async fn fetch_sale_details(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, venta_id: i32) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    
    let query = "
        SELECT 
            detailId, 
            productName, 
            CAST(quantity AS FLOAT) as quantity, 
            CAST(subtotal AS FLOAT) as subtotal
        FROM sells_detail
        WHERE ventaId = @P1
    ";
    
    let stream = client.query(query, &[&venta_id]).await.map_err(|e| e.to_string())?;
    let rows = stream.into_first_result().await.map_err(|e| e.to_string())?;
    
    let mut details = Vec::new();
    for row in rows {
        details.push(serde_json::json!({
            "id": row.get::<i32, _>("detailId").unwrap_or(0),
            "productName": row.get::<&str, _>("productName").unwrap_or(""),
            "quantity": row.get::<f64, _>("quantity").unwrap_or(0.0),
            "subtotal": row.get::<f64, _>("subtotal").unwrap_or(0.0),
        }));
    }
    Ok(details)
}