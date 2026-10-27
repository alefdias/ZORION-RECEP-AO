use serde_json::Value;
use postgres::{Client, NoTls};
use fallible_iterator::FallibleIterator;
use tauri::Emitter;

#[tauri::command]
pub async fn test_postgres_connection(
    ip: String,
    db_name: String,
    password: String,
) -> Result<String, String> {
    let conn_str = format!("host={} user=postgres password={} dbname={} connect_timeout=3", ip, password, db_name);
    
    let result = tauri::async_runtime::spawn_blocking(move || {
        match Client::connect(&conn_str, NoTls) {
            Ok(mut client) => {
                if let Err(e) = client.query("SELECT 1", &[]) {
                    return Err(format!("Conectado, mas falhou ao executar query: {}", e));
                }
                
                // Cria as tabelas necessárias automaticamente
                let schema = include_str!("../../database/001_initial_schema.sql");
                if let Err(_batch_err) = client.batch_execute(schema) {
                    // Se falhar em lote, executa comando por comando ignorando avisos de duplicidade e tipo
                    let mut fatal_err = None;
                    for stmt in schema.split(';') {
                        let trimmed = stmt.trim();
                        if !trimmed.is_empty() {
                            if let Err(e) = client.batch_execute(trimmed) {
                                let err_str = e.to_string();
                                if !err_str.contains("already exists") 
                                    && !err_str.contains("duplicate") 
                                    && !err_str.contains("unique constraint") {
                                    // Apenas falha estrutural em CREATE TABLE impede a conexão
                                    if trimmed.to_uppercase().starts_with("CREATE TABLE") {
                                        fatal_err = Some(format!("Erro ao criar tabela ({}): {}", trimmed.chars().take(60).collect::<String>(), err_str));
                                    }
                                }
                            }
                        }
                    }
                    if let Some(msg) = fatal_err {
                        return Err(format!("Conectado, mas falhou ao inicializar tabelas: {}", msg));
                    }
                }

                Ok("Conexão bem-sucedida e banco de dados inicializado!".to_string())
            },
            Err(e) => {
                Err(format!("Falha na conexão: {}", e))
            }
        }
    }).await.map_err(|e| e.to_string())?;

    result
}

#[tauri::command]
pub async fn query_postgres(
    ip: String,
    db_name: String,
    password: String,
    query: String,
) -> Result<Vec<Value>, String> {
    let conn_str = format!("host={} user=postgres password={} dbname={} connect_timeout=3", ip, password, db_name);
    
    let result = tauri::async_runtime::spawn_blocking(move || {
        let mut client = Client::connect(&conn_str, NoTls).map_err(|e| format!("Conexão falhou: {}", e))?;
        let rows = client.query(&query, &[]).map_err(|e| format!("Query falhou: {}", e))?;
        
        let mut result_json = Vec::new();
        for row in rows {
            let mut map = serde_json::Map::new();
            for col in row.columns() {
                let name = col.name();
                let ty = col.type_();
                let val: Value = match ty.name() {
                    "bool" => row.try_get::<_, bool>(name).ok().map(Value::from).unwrap_or(Value::Null),
                    "int2" => row.try_get::<_, i16>(name).ok().map(Value::from).unwrap_or(Value::Null),
                    "int4" => row.try_get::<_, i32>(name).ok().map(Value::from).unwrap_or(Value::Null),
                    "int8" => row.try_get::<_, i64>(name).ok().map(Value::from).unwrap_or(Value::Null),
                    "float4" => row.try_get::<_, f32>(name).ok().map(Value::from).unwrap_or(Value::Null),
                    "float8" => row.try_get::<_, f64>(name).ok().map(Value::from).unwrap_or(Value::Null),
                    "timestamp" | "timestamptz" => {
                        row.try_get::<_, chrono::DateTime<chrono::Utc>>(name)
                           .ok()
                           .map(|d| Value::from(d.to_rfc3339()))
                           .or_else(|| {
                               row.try_get::<_, chrono::NaiveDateTime>(name)
                                  .ok()
                                  .map(|d| Value::from(d.to_string()))
                           })
                           .unwrap_or(Value::Null)
                    },
                    "date" => {
                        row.try_get::<_, chrono::NaiveDate>(name)
                           .ok()
                           .map(|d| Value::from(d.to_string()))
                           .unwrap_or(Value::Null)
                    },
                    "numeric" => {
                        row.try_get::<_, String>(name)
                           .ok()
                           .and_then(|s| s.parse::<f64>().ok())
                           .map(Value::from)
                           .or_else(|| {
                               row.try_get::<_, f64>(name).ok().map(Value::from)
                           })
                           .unwrap_or(Value::Null)
                    }
                    _ => {
                        if let Ok(v) = row.try_get::<_, String>(name) {
                            Value::from(v)
                        } else if let Ok(v) = row.try_get::<_, i32>(name) {
                            Value::from(v)
                        } else if let Ok(v) = row.try_get::<_, bool>(name) {
                            Value::from(v)
                        } else {
                            Value::Null
                        }
                    }
                };
                map.insert(name.to_string(), val);
            }
            result_json.push(Value::Object(map));
        }
        Ok(result_json)
    }).await.map_err(|e| e.to_string())?;

    result
}

#[tauri::command]
pub async fn execute_postgres(
    ip: String,
    db_name: String,
    password: String,
    query: String,
) -> Result<u64, String> {
    let conn_str = format!("host={} user=postgres password={} dbname={} connect_timeout=3", ip, password, db_name);
    
    let result = tauri::async_runtime::spawn_blocking(move || {
        let mut client = Client::connect(&conn_str, NoTls).map_err(|e| format!("Conexão falhou: {}", e))?;
        let count = client.batch_execute(&query).map_err(|e| format!("Falha ao executar lote SQL: {}", e))?;
        let _ = count;
        let _ = client.batch_execute("NOTIFY app_update; NOTIFY table_change;");
        Ok(1)
    }).await.map_err(|e| e.to_string())?;

    result
}

#[tauri::command]
pub async fn start_db_listener(
    app: tauri::AppHandle,
    ip: String,
    db_name: String,
    password: String,
) -> Result<(), String> {
    let conn_str = format!("host={} user=postgres password={} dbname={}", ip, password, db_name);

    std::thread::spawn(move || {
        loop {
            match Client::connect(&conn_str, NoTls) {
                Ok(mut client) => {
                    let _ = client.execute("LISTEN app_update", &[]);
                    let _ = client.execute("LISTEN table_change", &[]);
                    let _ = client.execute("LISTEN notify_satelite_sync", &[]);
                    let _ = client.execute("LISTEN notify_satelite_status", &[]);
                    let _ = client.execute("LISTEN satelite_order_created", &[]);
                    let _ = client.execute("LISTEN satelite_order_updated", &[]);
                    
                    let mut notifications = client.notifications();
                    while let Ok(Some(notification)) = notifications.blocking_iter().next() {
                        let payload = notification.payload().to_string();
                        let channel = notification.channel().to_string();
                        let _ = app.emit("db_update", "update");
                        let _ = app.emit("db_change", serde_json::json!({
                            "channel": channel,
                            "payload": payload
                        }));
                    }
                },
                Err(_) => {
                    std::thread::sleep(std::time::Duration::from_secs(3));
                }
            }
        }
    });

    Ok(())
}
