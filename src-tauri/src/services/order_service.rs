use bb8::Pool;
use bb8_tiberius::ConnectionManager;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderDetailInput {
    pub product_id: i32,
    pub expected_qty: f64,
    pub received_qty: Option<f64>,
    pub unit_cost: f64,
    pub subtotal: f64,
}

pub async fn create_order(pool: &Pool<ConnectionManager>, cat_name: String, emp_id: i32, total: f64, details: Vec<OrderDetailInput>) -> Result<i32, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    client.simple_query("BEGIN TRAN;").await.map_err(|e| e.to_string())?;

    // Modificamos la consulta para que busque el ID real de la categoría usando el nombre enviado
    let q_order = "
        DECLARE @RealCatId VARCHAR(36);
        SELECT TOP 1 @RealCatId = categoryId FROM category WHERE name = @P1;
        
        IF @RealCatId IS NULL BEGIN
            THROW 51000, 'El proveedor no existe en la base de datos.', 1;
        END

        DECLARE @Out TABLE (id INT);
        INSERT INTO purchase_order (categoryId, employeeId, total) 
        OUTPUT INSERTED.orderId INTO @Out 
        VALUES (@RealCatId, @P2, @P3);
        
        SELECT id FROM @Out;
    ";
    
    // Ejecutar la inserción principal
    let order_res: Result<i32, String> = match client.query(q_order, &[&cat_name, &emp_id, &total]).await {
        Ok(stream) => {
            match stream.into_row().await {
                Ok(Some(row)) => Ok(row.get::<i32, _>(0).unwrap_or(0)),
                _ => Err("No se obtuvo el ID de la orden".to_string()),
            }
        },
        Err(e) => Err(e.to_string()),
    };

    // Evaluar y asegurar el rollback
    let order_id = match order_res {
        Ok(id) => id,
        Err(e) => {
            let _ = client.simple_query("ROLLBACK TRAN;").await;
            return Err(e);
        }
    };

    // Insertar los productos al carrito
    for d in details {
        let q_det = "INSERT INTO purchase_order_detail (orderId, productId, expectedQty, unitCost, subtotal) VALUES (@P1, @P2, @P3, @P4, @P5)";
        if let Err(e) = client.execute(q_det, &[&order_id, &d.product_id, &d.expected_qty, &d.unit_cost, &d.subtotal]).await {
            let _ = client.simple_query("ROLLBACK TRAN;").await;
            return Err(format!("Error insertando detalle: {}", e));
        }
    }

    client.simple_query("COMMIT TRAN;").await.map_err(|e| e.to_string())?;
    Ok(order_id)
}

pub async fn process_order(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, order_id: i32, emp_id: i32, status: String, method: Option<String>, total: f64, register_cash: f64, external_fund: f64, details: Vec<OrderDetailInput>) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    client.simple_query("BEGIN TRAN;").await.map_err(|e| e.to_string())?;

    let q_upd = "UPDATE purchase_order SET status=@P1, paymentMethod=@P2, total=@P3, cashRegisterAmount=@P4, externalFundAmount=@P5, completedAt=CASE WHEN @P1 IN ('Pagada', 'Cancelada') THEN GETDATE() ELSE completedAt END WHERE orderId=@P6";
    if let Err(e) = client.execute(q_upd, &[&status, &method, &total, &register_cash, &external_fund, &order_id]).await {
        let _ = client.simple_query("ROLLBACK TRAN;").await; return Err(e.to_string());
    }

    if status == "Cancelada" {
        client.simple_query("COMMIT TRAN;").await.map_err(|e| e.to_string())?;
        return Ok(());
    }

    // SINCRONIZACIÓN: Borramos los detalles viejos y escribimos la lista final del frontend
    let q_del = "DELETE FROM purchase_order_detail WHERE orderId = @P1";
    if let Err(e) = client.execute(q_del, &[&order_id]).await {
        let _ = client.simple_query("ROLLBACK TRAN;").await; return Err(e.to_string());
    }

    for d in &details {
        let recv = d.received_qty.unwrap_or(0.0);
        
        let q_det = "INSERT INTO purchase_order_detail (orderId, productId, expectedQty, receivedQty, unitCost, subtotal) VALUES (@P1, @P2, @P3, @P4, @P5, @P6)";
        if let Err(e) = client.execute(q_det, &[&order_id, &d.product_id, &d.expected_qty, &recv, &d.unit_cost, &d.subtotal]).await {
            let _ = client.simple_query("ROLLBACK TRAN;").await; return Err(e.to_string());
        }
        
        if status == "Pagada" && recv > 0.0 {
            let q_stock = "UPDATE product SET quantity = quantity + CAST(@P1 AS DECIMAL(10,3)) WHERE productId = @P2";
            if let Err(e) = client.execute(q_stock, &[&recv, &d.product_id]).await {
                let _ = client.simple_query("ROLLBACK TRAN;").await; return Err(e.to_string());
            }
        }
    }

    if status == "Pagada" && register_cash > 0.0 {
        let neg_total = -register_cash; 
        let q_sells = "
            DECLARE @Out TABLE (id INT);
            INSERT INTO sells (employeeId, sellsDate, cash, total) OUTPUT INSERTED.ventaId INTO @Out VALUES (@P1, GETDATE(), 1, @P2);
            SELECT id FROM @Out;
        ";
        
        let v_res: Result<i32, String> = match client.query(q_sells, &[&emp_id, &neg_total]).await {
            Ok(stream) => {
                match stream.into_row().await {
                    Ok(Some(row)) => Ok(row.get::<i32, _>(0).unwrap_or(0)),
                    _ => Err("No ID".to_string()),
                }
            },
            Err(e) => Err(e.to_string()),
        };

        let v_id = match v_res {
            Ok(id) => id,
            Err(e) => { let _ = client.simple_query("ROLLBACK TRAN;").await; return Err(e); }
        };

        let q_sdet = "INSERT INTO sells_detail (ventaId, productName, quantity, subtotal) VALUES (@P1, 'Egreso: Pago a Proveedor', 1, @P2)";
        if let Err(e) = client.execute(q_sdet, &[&v_id, &neg_total]).await {
            let _ = client.simple_query("ROLLBACK TRAN;").await; return Err(e.to_string());
        }
    }

    client.simple_query("COMMIT TRAN;").await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn get_orders(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let q = "
        SELECT o.orderId, c.name as provider, e.name + ' ' + e.lastname as employee, o.status, o.paymentMethod, CAST(o.total AS FLOAT) as total, 
        CAST(ISNULL(o.cashRegisterAmount, 0) AS FLOAT) as cashRegisterAmount, CAST(ISNULL(o.externalFundAmount, 0) AS FLOAT) as externalFundAmount,
        CONVERT(VARCHAR(16), o.createdAt, 120) as createdAt, CONVERT(VARCHAR(16), o.completedAt, 120) as completedAt, o.categoryId
        FROM purchase_order o JOIN category c ON o.categoryId = c.categoryId JOIN employee e ON o.employeeId = e.employeeId
        ORDER BY o.orderId DESC
    ";
    let rows = client.simple_query(q).await.map_err(|e| e.to_string())?.into_first_result().await.unwrap_or_default();
    
    let mut list = Vec::new();
    for r in rows {
        list.push(serde_json::json!({
            "orderId": r.get::<i32,_>("orderId").unwrap_or(0),
            "categoryId": r.get::<&str,_>("categoryId").unwrap_or(""),
            "provider": r.get::<&str,_>("provider").unwrap_or(""),
            "employee": r.get::<&str,_>("employee").unwrap_or(""),
            "status": r.get::<&str,_>("status").unwrap_or(""),
            "paymentMethod": r.get::<&str,_>("paymentMethod").unwrap_or(""),
            "total": r.get::<f64,_>("total").unwrap_or(0.0),
            "cashRegisterAmount": r.get::<f64,_>("cashRegisterAmount").unwrap_or(0.0),
            "externalFundAmount": r.get::<f64,_>("externalFundAmount").unwrap_or(0.0),
            "createdAt": r.get::<&str,_>("createdAt").unwrap_or(""),
            "completedAt": r.get::<&str,_>("completedAt").unwrap_or("")
        }));
    }
    Ok(list)
}

pub async fn get_order_details(pool: &Pool<ConnectionManager>, order_id: i32) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let q = "
        SELECT d.productId, p.name, CAST(d.expectedQty AS FLOAT) as exp, CAST(d.receivedQty AS FLOAT) as rec, CAST(d.unitCost AS FLOAT) as cost, CAST(d.subtotal AS FLOAT) as sub
        FROM purchase_order_detail d JOIN product p ON d.productId = p.productId WHERE d.orderId = @P1
    ";
    let rows = client.query(q, &[&order_id]).await.map_err(|e| e.to_string())?.into_first_result().await.unwrap_or_default();
    
    let mut list = Vec::new();
    for r in rows {
        list.push(serde_json::json!({
            "productId": r.get::<i32,_>("productId").unwrap_or(0),
            "name": r.get::<&str,_>("name").unwrap_or(""),
            "expectedQty": r.get::<f64,_>("exp").unwrap_or(0.0),
            "receivedQty": r.get::<f64,_>("rec"),
            "unitCost": r.get::<f64,_>("cost").unwrap_or(0.0),
            "subtotal": r.get::<f64,_>("sub").unwrap_or(0.0)
        }));
    }
    Ok(list)
}

pub async fn fetch_providers(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "SELECT categoryId, name, description, cellphone, CAST(ISNULL(status, 1) AS BIT) as status FROM category WHERE name NOT IN ('Ofertas', 'Categoría') ORDER BY name";
    let rows = client.simple_query(query).await.map_err(|e| e.to_string())?.into_first_result().await.unwrap_or_default();
    
    let mut list = Vec::new();
    for r in rows {
        list.push(serde_json::json!({
            "id": r.get::<&str, _>("categoryId").unwrap_or(""),
            "name": r.get::<&str, _>("name").unwrap_or(""),
            "description": r.get::<&str, _>("description").unwrap_or(""),
            "cellphone": r.get::<&str, _>("cellphone").unwrap_or(""),
            "status": r.get::<bool, _>("status").unwrap_or(true)
        }));
    }
    Ok(list)
}

pub async fn create_provider(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, name: String, description: Option<String>, cellphone: Option<String>) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "INSERT INTO category (categoryId, name, description, cellphone, status) VALUES (NEWID(), @P1, @P2, @P3, 1)";
    client.execute(query, &[&name, &description.as_deref(), &cellphone.as_deref()]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn update_provider_name(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, id: String, name: String, description: Option<String>, cellphone: Option<String>) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "UPDATE category SET name = @P1, description = @P2, cellphone = @P3 WHERE categoryId = @P4";
    client.execute(query, &[&name, &description.as_deref(), &cellphone.as_deref(), &id]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn toggle_provider_status(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, name: String, current_status: bool) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let new_status = !current_status;
    let query = "UPDATE category SET status = @P1 WHERE name = @P2";
    client.execute(query, &[&new_status, &name]).await.map_err(|e| e.to_string())?;
    Ok(())
}