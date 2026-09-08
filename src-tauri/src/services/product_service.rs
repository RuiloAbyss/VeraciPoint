use bb8::Pool;
use bb8_tiberius::ConnectionManager;
use crate::models::product::Product;

pub async fn fetch_all_products(pool: &Pool<ConnectionManager>) -> Result<Vec<Product>, String> {
    let mut client = pool.get().await.map_err(|e| format!("Error de pool: {}", e))?;
    
    // Obtenemos todos los productos (activos e inactivos)
    let query = "
        SELECT 
            p.productId, p.name, CAST(p.price AS FLOAT) as price, 
            ISNULL(c.name, 'Sin Categoría') as categoryName, 
            p.barcode, p.sellformat, CAST(p.quantity AS FLOAT) as quantity,
            CAST(p.minStock AS FLOAT) as minStock, CAST(p.maxStock AS FLOAT) as maxStock,
            p.status,
            CAST(N'' AS XML).value('xs:base64Binary(xs:hexBinary(sql:column(\"p.photo\")))', 'VARCHAR(MAX)') as photoBase64
        FROM product p 
        LEFT JOIN category c ON p.categoryId = c.categoryId
    ";
    
    let stream = client.simple_query(query).await.map_err(|e| format!("Error en query: {}", e))?;
    let rows = stream.into_first_result().await.map_err(|e| format!("Error leyendo filas: {}", e))?;
    
    let mut products = Vec::new();
    for row in rows {
        products.push(Product {
            id: row.get::<i32, _>("productId").unwrap_or(0),
            name: row.get::<&str, _>("name").unwrap_or("").to_string(),
            price: row.get::<f64, _>("price").unwrap_or(0.0),
            category: row.get::<&str, _>("categoryName").unwrap_or("").to_string(),
            barcode: row.get::<i64, _>("barcode"),
            sellformat: row.get::<&str, _>("sellformat").map(|s| s.to_string()),
            stock: row.get::<f64, _>("quantity").unwrap_or(0.0),
            min_stock: row.get::<f64, _>("minStock"),
            max_stock: row.get::<f64, _>("maxStock"),
            status: row.get::<bool, _>("status").unwrap_or(true) as i32,
            photo: row.get::<&str, _>("photoBase64").map(|s| s.to_string()),
        });
    }
    Ok(products)
}

pub async fn edit_product(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, id: i32, name: String, price: f64, barcode: Option<i64>, category: String, sellformat: String, min_stock: Option<f64>, max_stock: Option<f64>) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "
        DECLARE @catId VARCHAR(36) = (SELECT TOP 1 categoryId FROM category WHERE name = @P5);
        IF @catId IS NULL SET @catId = 'FRUTAS-VERDURAS';
        UPDATE product SET name = @P1, price = @P2, barcode = @P3, categoryId = @catId, sellformat = @P6, minStock = @P7, maxStock = @P8 WHERE productId = @P4;
    ";
    client.execute(query, &[&name, &price, &barcode, &id, &category, &sellformat, &min_stock, &max_stock]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn create_product(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, name: String, price: f64, category: String, barcode: Option<i64>, sellformat: String, quantity: f64, min_stock: Option<f64>, max_stock: Option<f64>) -> Result<i32, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "
        DECLARE @catId VARCHAR(36) = (SELECT TOP 1 categoryId FROM category WHERE name = @P1);
        IF @catId IS NULL SET @catId = 'BIMBO'; 
        INSERT INTO product (name, price, categoryId, barcode, sellformat, quantity, status, minStock, maxStock)
        OUTPUT INSERTED.productId
        VALUES (@P2, @P3, @catId, @P4, @P5, @P6, 1, @P7, @P8);
    ";
    let stream = client.query(query, &[&category, &name, &price, &barcode, &sellformat, &quantity, &min_stock, &max_stock]).await.map_err(|e| e.to_string())?;
    let row = stream.into_row().await.map_err(|e| e.to_string())?.ok_or("Error obteniendo ID")?;
    Ok(row.get::<i32, _>(0).unwrap_or(0))
}

pub async fn activate_product(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, id: i32) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    client.execute("UPDATE product SET status = 1 WHERE productId = @P1", &[&id]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn restock_product(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, id: i32, qty: f64) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    // UPDATE directo con CAST para garantizar compatibilidad del flotante con el DECIMAL de SQL
    let query = "UPDATE product SET quantity = quantity + CAST(@P1 AS DECIMAL(10,3)) WHERE productId = @P2";
    client.execute(query, &[&qty, &id]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn deactivate_product(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, id: i32) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    // UPDATE directo en lugar de SP para dar de baja
    let query = "UPDATE product SET status = 0 WHERE productId = @P1";
    client.execute(query, &[&id]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn upload_photo(pool: &Pool<ConnectionManager>, id: i32, base64: String) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    // Truco: Usar el parser XML de SQL Server para decodificar Base64 directo a binario
    let query = "
        DECLARE @Base64 VARCHAR(MAX) = @P1;
        DECLARE @Bin VARBINARY(MAX) = CAST(N'' AS XML).value('xs:base64Binary(sql:variable(\"@Base64\"))', 'VARBINARY(MAX)');
        UPDATE product SET photo = @Bin WHERE productId = @P2;
    ";
    client.execute(query, &[&base64, &id]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn discard_stock(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, id: i32, qty: f64) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "UPDATE product SET quantity = quantity - CAST(@P1 AS DECIMAL(10,3)) WHERE productId = @P2";
    client.execute(query, &[&qty, &id]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn delete_product_hard(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, id: i32) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    
    // Al ejecutar esto, el historial de ventas mantendrá el productName gracias al nuevo Trigger, 
    // pero el producto desaparecerá físicamente del inventario.
    client.execute("DELETE FROM product WHERE productId = @P1", &[&id]).await.map_err(|e| e.to_string())?;
    Ok(())
}