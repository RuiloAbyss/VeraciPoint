use bb8::Pool;
use bb8_tiberius::ConnectionManager;
use crate::models::product::Product;

pub async fn fetch_all_products(pool: &Pool<ConnectionManager>) -> Result<Vec<Product>, String> {
    let mut client = pool.get().await.map_err(|e| format!("Error de pool: {}", e))?;
    
    // Convertimos VARBINARY a Base64 usando XML en SQL Server
    let query = "
        SELECT 
            p.productId, p.name, CAST(p.price AS FLOAT) as price, 
            ISNULL(c.name, 'Sin Categoría') as categoryName, 
            p.barcode, p.sellformat, CAST(p.quantity AS FLOAT) as quantity,
            CAST(N'' AS XML).value('xs:base64Binary(xs:hexBinary(sql:column(\"p.photo\")))', 'VARCHAR(MAX)') as photoBase64
        FROM product p 
        LEFT JOIN category c ON p.categoryId = c.categoryId 
        WHERE p.status = 1
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
            photo: row.get::<&str, _>("photoBase64").map(|s| s.to_string()),
        });
    }
    
    Ok(products)
}

pub async fn restock_product(pool: &Pool<ConnectionManager>, id: i32, qty: f64) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    client.execute("EXEC sp_Reabastecer @P1, @P2", &[&id, &qty]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn deactivate_product(pool: &Pool<ConnectionManager>, id: i32) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    client.execute("EXEC sp_SuspenderProducto @P1", &[&id]).await.map_err(|e| e.to_string())?;
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

pub async fn edit_product(pool: &bb8::Pool<bb8_tiberius::ConnectionManager>, id: i32, name: String, price: f64, barcode: Option<i64>) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    // Usamos una consulta directa para mayor agilidad sin requerir el ID de categoría
    let query = "UPDATE product SET name = @P1, price = @P2, barcode = @P3 WHERE productId = @P4";
    client.execute(query, &[&name, &price, &barcode, &id]).await.map_err(|e| e.to_string())?;
    Ok(())
}