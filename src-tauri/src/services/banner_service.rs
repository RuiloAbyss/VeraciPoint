use bb8::Pool;
use bb8_tiberius::ConnectionManager;

pub async fn get_banners(pool: &Pool<ConnectionManager>, only_active: bool) -> Result<Vec<serde_json::Value>, String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let mut query = "
        SELECT bannerId, title, 
               CONVERT(VARCHAR(10), startDate, 120) as startDate, 
               CONVERT(VARCHAR(10), endDate, 120) as endDate, 
               isActive,
               CAST(N'' AS XML).value('xs:base64Binary(xs:hexBinary(sql:column(\"photo\")))', 'VARCHAR(MAX)') as photoBase64
        FROM banners
    ".to_string();

    if only_active {
        query.push_str(" WHERE isActive = 1 AND CAST(GETDATE() AS DATE) BETWEEN startDate AND endDate");
    }
    query.push_str(" ORDER BY bannerId DESC");

    let stream = client.simple_query(query).await.map_err(|e| e.to_string())?;
    let rows = stream.into_first_result().await.map_err(|e| e.to_string())?;
    
    let mut list = Vec::new();
    for r in rows {
        list.push(serde_json::json!({
            "id": r.get::<i32, _>("bannerId").unwrap_or(0),
            "title": r.get::<&str, _>("title").unwrap_or(""),
            "startDate": r.get::<&str, _>("startDate").unwrap_or(""),
            "endDate": r.get::<&str, _>("endDate").unwrap_or(""),
            "isActive": r.get::<bool, _>("isActive").unwrap_or(false),
            "photo": r.get::<&str, _>("photoBase64").unwrap_or("")
        }));
    }
    Ok(list)
}

pub async fn create_banner(pool: &Pool<ConnectionManager>, title: String, start_date: String, end_date: String, base64: String) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    let query = "
        DECLARE @Base64 VARCHAR(MAX) = @P4;
        DECLARE @Bin VARBINARY(MAX) = CAST(N'' AS XML).value('xs:base64Binary(sql:variable(\"@Base64\"))', 'VARBINARY(MAX)');
        INSERT INTO banners (title, startDate, endDate, photo, isActive) VALUES (@P1, @P2, @P3, @Bin, 1);
    ";
    client.execute(query, &[&title as &dyn tiberius::ToSql, &start_date as _, &end_date as _, &base64 as _]).await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn update_banner(pool: &Pool<ConnectionManager>, id: i32, title: String, start_date: String, end_date: String, base64: Option<String>) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    if let Some(b64) = base64 {
        let query = "
            DECLARE @Base64 VARCHAR(MAX) = @P5;
            DECLARE @Bin VARBINARY(MAX) = CAST(N'' AS XML).value('xs:base64Binary(sql:variable(\"@Base64\"))', 'VARBINARY(MAX)');
            UPDATE banners SET title = @P1, startDate = @P2, endDate = @P3, photo = @Bin WHERE bannerId = @P4;
        ";
        client.execute(query, &[&title as &dyn tiberius::ToSql, &start_date as _, &end_date as _, &id as _, &b64 as _]).await.map_err(|e| e.to_string())?;
    } else {
        let query = "UPDATE banners SET title = @P1, startDate = @P2, endDate = @P3 WHERE bannerId = @P4;";
        client.execute(query, &[&title as &dyn tiberius::ToSql, &start_date as _, &end_date as _, &id as _]).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub async fn delete_banner(pool: &Pool<ConnectionManager>, id: i32) -> Result<(), String> {
    let mut client = pool.get().await.map_err(|e| e.to_string())?;
    client.execute("DELETE FROM banners WHERE bannerId = @P1", &[&id as &dyn tiberius::ToSql]).await.map_err(|e| e.to_string())?;
    Ok(())
}