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

    // Usamos simple_query para iniciar la transacción en texto plano y evitar el Error 266
    client.simple_query("BEGIN TRAN;").await.map_err(|e| e.to_string())?;

    // 1. Registrar Venta (Usamos el query original con execute/query normal para proteger parámetros)
    let insert_sale = "
        INSERT INTO sells (employeeId, sellsDate, cash, total)
        VALUES (@P1, GETDATE(), @P2, CAST(@P3 AS DECIMAL(10,2)));
        
        SELECT CAST(SCOPE_IDENTITY() AS INT);
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
            // Rollback con simple_query
            let _ = client.simple_query("ROLLBACK TRAN;").await;
            return Err(err_msg);
        }
    };

    // 2. Registrar Detalles y Restar Stock
    for detail in details {
        let q_detail = "
            INSERT INTO sells_detail (ventaId, productId, quantity, subtotal)
            VALUES (@P1, @P2, CAST(@P3 AS DECIMAL(10,2)), CAST(@P4 AS DECIMAL(10,2)));
        ";
        if let Err(e) = client.execute(q_detail, &[&venta_id, &detail.product_id, &detail.quantity, &detail.subtotal]).await {
            let _ = client.simple_query("ROLLBACK TRAN;").await;
            return Err(format!("Error en detalle: {}", e));
        }
    }

    // Nota: El total del corte de caja lo sumaremos consultando esta tabla directamente.
    
    // Commit final con simple_query
    client.simple_query("COMMIT TRAN;").await.map_err(|e| e.to_string())?;

    Ok(venta_id)
}