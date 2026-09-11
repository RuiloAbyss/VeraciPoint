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
    
    // Forzamos el tipo VARCHAR(4000) para que Tiberius pueda leer la cadena correctamente
    let query = "
        SELECT 
            s.ventaId, 
            e.name + ' ' + e.lastname AS employeeName, 
            FORMAT(s.sellsDate, 'dd/MM/yyyy HH:mm') as saleDate, 
            s.cash, 
            CAST(s.total AS FLOAT) as total,
            ISNULL(CAST((SELECT STRING_AGG(productName, ', ') FROM sells_detail WHERE ventaId = s.ventaId) AS VARCHAR(4000)), '') as products
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
            "products": row.get::<&str, _>("products").unwrap_or("")
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

pub async fn fetch_sales_flow(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, start_date: String, end_date: String) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "
        SELECT 
            DATEPART(HOUR, sellsDate) AS saleHour, 
            COUNT(ventaId) AS salesCount,
            CAST(SUM(total) AS FLOAT) AS totalAmount
        FROM sells
        WHERE CAST(sellsDate AS DATE) >= CAST(@P1 AS DATE)
          AND CAST(sellsDate AS DATE) <= CAST(@P2 AS DATE)
          AND DATEPART(HOUR, sellsDate) BETWEEN 6 AND 21
        GROUP BY DATEPART(HOUR, sellsDate)
    ";
    let stream = client.query(query, &[&start_date, &end_date]).await.map_err(|e| e.to_string())?;
    let rows = stream.into_first_result().await.map_err(|e| e.to_string())?;
    let mut flow = Vec::new();
    for row in rows {
        flow.push(serde_json::json!({
            "hour": row.get::<i32, _>("saleHour").unwrap_or(0),
            "count": row.get::<i32, _>("salesCount").unwrap_or(0),
            "total": row.get::<f64, _>("totalAmount").unwrap_or(0.0)
        }));
    }
    Ok(flow)
}

pub async fn fetch_sales_flow_by_day(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, start_date: String, end_date: String) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    
    // Delegamos la conversión de la fecha a SQL Server usando CONVERT (estilo 120 da formato YYYY-MM-DD)
    let query = "
        SELECT 
            CONVERT(VARCHAR(10), CAST(sellsDate AS DATE), 120) AS saleDate, 
            COUNT(ventaId) AS salesCount,
            CAST(SUM(total) AS FLOAT) AS totalAmount
        FROM sells
        WHERE CAST(sellsDate AS DATE) >= CAST(@P1 AS DATE)
          AND CAST(sellsDate AS DATE) <= CAST(@P2 AS DATE)
        GROUP BY CAST(sellsDate AS DATE)
        ORDER BY CAST(sellsDate AS DATE) ASC
    ";
    
    let stream = client.query(query, &[&start_date, &end_date]).await.map_err(|e| e.to_string())?;
    let rows = stream.into_first_result().await.map_err(|e| e.to_string())?;
    
    let mut flow = Vec::new();
    for row in rows {
        // Extraemos la fecha directamente como string
        let formatted_date = row.get::<&str, _>("saleDate").unwrap_or("").to_string();

        flow.push(serde_json::json!({
            "date": formatted_date,
            "count": row.get::<i32, _>("salesCount").unwrap_or(0),
            "total": row.get::<f64, _>("totalAmount").unwrap_or(0.0)
        }));
    }
    Ok(flow)
}

pub async fn fetch_top_products(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, start_date: String, end_date: String) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    
    let query = "
        SELECT 
            p.name AS productName,
            ISNULL(c.name, 'Sin Categoría') AS categoryName,
            CAST(ISNULL(SUM(v.quantity), 0) AS FLOAT) AS totalQuantity,
            CAST(ISNULL(SUM(v.subtotal), 0) AS FLOAT) AS totalRevenue
        FROM product p
        LEFT JOIN category c ON p.categoryId = c.categoryId
        LEFT JOIN (
            SELECT sd.productName, sd.quantity, sd.subtotal 
            FROM sells_detail sd
            INNER JOIN sells s ON sd.ventaId = s.ventaId
            WHERE CAST(s.sellsDate AS DATE) >= CAST(@P1 AS DATE) 
              AND CAST(s.sellsDate AS DATE) <= CAST(@P2 AS DATE)
        ) v ON p.name = v.productName
        WHERE p.status = 1
        GROUP BY p.name, c.name
    ";
    
    let stream = client.query(query, &[&start_date, &end_date]).await.map_err(|e| e.to_string())?;
    let rows = stream.into_first_result().await.map_err(|e| e.to_string())?;
    
    let mut top = Vec::new();
    for row in rows {
        top.push(serde_json::json!({
            "name": row.get::<&str, _>("productName").unwrap_or("Desconocido"),
            "category": row.get::<&str, _>("categoryName").unwrap_or("Sin Categoría"),
            "quantity": row.get::<f64, _>("totalQuantity").unwrap_or(0.0),
            "total": row.get::<f64, _>("totalRevenue").unwrap_or(0.0)
        }));
    }
    Ok(top)
}