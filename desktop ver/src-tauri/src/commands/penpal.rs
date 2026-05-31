use crate::state::AppState;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Penpal {
    pub id: String,
    pub name: String,
    pub country: String,
    pub interests: String,
    pub topics: String,
    pub notes: String,
    pub created_at: String,
    pub updated_at: String,
    pub letter_count: Option<i64>,
    pub last_letter_date: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Correspondence {
    pub id: String,
    pub penpal_id: String,
    pub direction: String, // "sent" | "received"
    pub content: String,
    pub letter_date: String,
    pub imported_at: String,
}

#[tauri::command]
pub fn create_penpal(
    state: tauri::State<AppState>,
    name: String,
    country: Option<String>,
    interests: Option<String>,
    topics: Option<String>,
    notes: Option<String>,
) -> Result<Penpal, String> {
    if name.trim().is_empty() {
        return Err("Penpal name is required.".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let country = country.unwrap_or_default();
    let interests = interests.unwrap_or_default();
    let topics = topics.unwrap_or_default();
    let notes = notes.unwrap_or_default();
    let now = Utc::now().to_rfc3339();

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO penpals (id, name, country, interests, topics, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![id, name, country, interests, topics, notes, now, now],
    ).map_err(|e| format!("Failed to create penpal in DB: {}", e))?;

    Ok(Penpal {
        id,
        name,
        country,
        interests,
        topics,
        notes,
        created_at: now.clone(),
        updated_at: now,
        letter_count: Some(0),
        last_letter_date: None,
    })
}

#[tauri::command]
pub fn get_penpals(state: tauri::State<AppState>) -> Result<Vec<Penpal>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT p.id, p.name, p.country, p.interests, p.topics, p.notes, p.created_at, p.updated_at,
                (SELECT COUNT(*) FROM correspondence WHERE penpal_id = p.id) as letter_count,
                (SELECT MAX(letter_date) FROM correspondence WHERE penpal_id = p.id) as last_letter_date
         FROM penpals p ORDER BY p.name ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(Penpal {
            id: row.get(0)?,
            name: row.get(1)?,
            country: row.get(2)?,
            interests: row.get(3)?,
            topics: row.get(4)?,
            notes: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            letter_count: Some(row.get(8)?),
            last_letter_date: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut penpals = Vec::new();
    for r in rows {
        penpals.push(r.map_err(|e| e.to_string())?);
    }
    Ok(penpals)
}

#[tauri::command]
pub fn update_penpal(
    state: tauri::State<AppState>,
    id: String,
    name: String,
    country: Option<String>,
    interests: Option<String>,
    topics: Option<String>,
    notes: Option<String>,
) -> Result<Penpal, String> {
    if name.trim().is_empty() {
        return Err("Penpal name is required.".to_string());
    }

    let country = country.unwrap_or_default();
    let interests = interests.unwrap_or_default();
    let topics = topics.unwrap_or_default();
    let notes = notes.unwrap_or_default();
    let now = Utc::now().to_rfc3339();

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    // Check if penpal exists and get its created_at time
    let created_at: String = conn.query_row(
        "SELECT created_at FROM penpals WHERE id = ?",
        [&id],
        |row| row.get(0)
    ).map_err(|_| "Penpal not found.".to_string())?;

    conn.execute(
        "UPDATE penpals 
         SET name = ?, country = ?, interests = ?, topics = ?, notes = ?, updated_at = ?
         WHERE id = ?",
        rusqlite::params![name, country, interests, topics, notes, now, id],
    ).map_err(|e| format!("Failed to update penpal in DB: {}", e))?;

    // Query metrics to avoid losing them
    let (letter_count, last_letter_date): (i64, Option<String>) = conn.query_row(
        "SELECT 
            (SELECT COUNT(*) FROM correspondence WHERE penpal_id = ?),
            (SELECT MAX(letter_date) FROM correspondence WHERE penpal_id = ?)",
        rusqlite::params![id, id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).unwrap_or((0, None));

    Ok(Penpal {
        id,
        name,
        country,
        interests,
        topics,
        notes,
        created_at,
        updated_at: now,
        letter_count: Some(letter_count),
        last_letter_date,
    })
}

#[tauri::command]
pub fn add_correspondence(
    state: tauri::State<AppState>,
    penpal_id: String,
    direction: String,
    content: String,
    letter_date: String,
) -> Result<Correspondence, String> {
    if content.trim().is_empty() {
        return Err("Correspondence content cannot be empty.".to_string());
    }
    if direction != "sent" && direction != "received" {
        return Err("Direction must be either 'sent' or 'received'.".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let imported_at = Utc::now().to_rfc3339();

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO correspondence (id, penpal_id, direction, content, letter_date, imported_at)
         VALUES (?, ?, ?, ?, ?, ?)",
        rusqlite::params![id, penpal_id, direction, content, letter_date, imported_at],
    ).map_err(|e| format!("Failed to add correspondence: {}", e))?;

    Ok(Correspondence {
        id,
        penpal_id,
        direction,
        content,
        letter_date,
        imported_at,
    })
}

#[tauri::command]
pub fn get_correspondence(
    state: tauri::State<AppState>,
    penpal_id: String,
) -> Result<Vec<Correspondence>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, penpal_id, direction, content, letter_date, imported_at 
         FROM correspondence 
         WHERE penpal_id = ? 
         ORDER BY letter_date ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([&penpal_id], |row| {
        Ok(Correspondence {
            id: row.get(0)?,
            penpal_id: row.get(1)?,
            direction: row.get(2)?,
            content: row.get(3)?,
            letter_date: row.get(4)?,
            imported_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}
