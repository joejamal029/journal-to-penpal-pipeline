use crate::state::AppState;
use crate::parser::{self, ThoughtUnit};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub entry_count: i32,
    pub format_version: i32,
    pub warnings: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JournalSource {
    pub id: String,
    pub file_path: String,
    pub file_name: String,
    pub last_modified: String,
    pub last_imported: String,
    pub format_version: i32,
    pub entry_count: i32,
}

#[tauri::command]
pub fn import_journal_file(
    state: tauri::State<AppState>,
    file_path: String,
) -> Result<ImportResult, String> {
    // 1. File Type Guard (from PRD & Atlas)
    let path = Path::new(&file_path);
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    if ext != "md" && ext != "txt" {
        return Err("Invalid file type. Only .md and .txt files are allowed.".to_string());
    }

    // 2. Read file content
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Could not read file: {}", e))?;

    // 3. Get metadata and last modified time
    let metadata = fs::metadata(&file_path)
        .map_err(|e| format!("Could not read file metadata: {}", e))?;
    let last_modified_dt: DateTime<Utc> = metadata.modified()
        .map_err(|e| format!("Could not read modification time: {}", e))?
        .into();
    let last_modified = last_modified_dt.to_rfc3339();
    let last_imported = Utc::now().to_rfc3339();

    // 4. Parse journal
    let (thought_units, format_version, warnings) = parser::parse_journal(&content, &file_path);

    // 5. Database transaction (atomic re-import: delete + re-insert)
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Delete existing
    tx.execute("DELETE FROM thought_units WHERE source_file_path = ?", [&file_path])
        .map_err(|e| format!("DB Error (deleting old entries): {}", e))?;
    tx.execute("DELETE FROM journal_sources WHERE file_path = ?", [&file_path])
        .map_err(|e| format!("DB Error (deleting old source): {}", e))?;

    // Insert source metadata
    let source_id = Uuid::new_v4().to_string();
    let file_name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    tx.execute(
        "INSERT INTO journal_sources (id, file_path, file_name, last_modified, last_imported, format_version, entry_count) 
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            source_id,
            file_path,
            file_name,
            last_modified,
            last_imported,
            format_version as i32,
            thought_units.len() as i32,
        ],
    ).map_err(|e| format!("DB Error (inserting source metadata): {}", e))?;

    // Insert thought units
    for tu in &thought_units {
        tx.execute(
            "INSERT INTO thought_units (id, date, content, category, source_file_path, source_line_number, format_version, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![
                tu.id,
                tu.date,
                tu.content,
                tu.category,
                tu.source_file_path,
                tu.source_line_number,
                tu.format_version,
                tu.created_at,
            ],
        ).map_err(|e| format!("DB Error (inserting entry): {}", e))?;
    }

    tx.commit().map_err(|e| format!("DB Transaction Commit failed: {}", e))?;

    Ok(ImportResult {
        entry_count: thought_units.len() as i32,
        format_version: format_version as i32,
        warnings,
    })
}

#[tauri::command]
pub fn get_import_status(state: tauri::State<AppState>) -> Result<Vec<JournalSource>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, file_path, file_name, last_modified, last_imported, format_version, entry_count 
         FROM journal_sources ORDER BY last_imported DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(JournalSource {
            id: row.get(0)?,
            file_path: row.get(1)?,
            file_name: row.get(2)?,
            last_modified: row.get(3)?,
            last_imported: row.get(4)?,
            format_version: row.get(5)?,
            entry_count: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut sources = Vec::new();
    for r in rows {
        sources.push(r.map_err(|e| e.to_string())?);
    }
    Ok(sources)
}

#[tauri::command]
pub fn remove_journal_source(
    state: tauri::State<AppState>,
    file_path: String,
) -> Result<bool, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM thought_units WHERE source_file_path = ?", [&file_path])
        .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM journal_sources WHERE file_path = ?", [&file_path])
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn get_thought_units(
    state: tauri::State<AppState>,
    start_date: Option<String>,
    end_date: Option<String>,
    category: Option<String>,
) -> Result<Vec<ThoughtUnit>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    let mut query = "SELECT id, date, content, category, source_file_path, source_line_number, format_version, created_at 
                     FROM thought_units WHERE 1=1".to_string();
    
    let mut params = Vec::new();
    if let Some(ref start) = start_date {
        query.push_str(" AND date >= ?");
        params.push(start);
    }
    if let Some(ref end) = end_date {
        query.push_str(" AND date <= ?");
        params.push(end);
    }
    if let Some(ref cat) = category {
        query.push_str(" AND category = ?");
        params.push(cat);
    }
    
    query.push_str(" ORDER BY date ASC, source_line_number ASC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params), |row| {
        Ok(ThoughtUnit {
            id: row.get(0)?,
            date: row.get::<_, Option<String>>(1)?,
            content: row.get(2)?,
            category: row.get(3)?,
            source_file_path: row.get(4)?,
            source_line_number: row.get(5)?,
            format_version: row.get(6)?,
            created_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut thought_units = Vec::new();
    for r in rows {
        thought_units.push(r.map_err(|e| e.to_string())?);
    }
    Ok(thought_units)
}
