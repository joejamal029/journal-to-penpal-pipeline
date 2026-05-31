use crate::state::AppState;
use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceState {
    pub open_letter_ids: String, // Serialized JSON array of letter IDs
    pub active_letter_id: Option<String>,
    pub crawler_state: String,   // Serialized JSON of crawler state
}

#[tauri::command]
pub fn save_workspace_state(
    state: tauri::State<AppState>,
    open_letter_ids: String,
    active_letter_id: Option<String>,
    crawler_state: String,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    // We use INSERT OR REPLACE for the singleton row (id = 1)
    conn.execute(
        "INSERT OR REPLACE INTO workspace_state (id, open_letter_ids, active_letter_id, crawler_state, updated_at)
         VALUES (1, ?, ?, ?, ?)",
        rusqlite::params![
            open_letter_ids,
            active_letter_id,
            crawler_state,
            Utc::now().to_rfc3339()
        ],
    ).map_err(|e| format!("Failed to save workspace state: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub fn load_workspace_state(state: tauri::State<AppState>) -> Result<WorkspaceState, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    
    // Query existing singleton or create it if missing
    let raw_state: Result<(String, Option<String>, String), rusqlite::Error> = conn.query_row(
        "SELECT open_letter_ids, active_letter_id, crawler_state FROM workspace_state WHERE id = 1",
        [],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    );

    let (open_ids_str, active_letter_id, crawler_state) = match raw_state {
        Ok(data) => data,
        Err(_) => {
            // Default empty state
            ("[]".to_string(), None, "{}".to_string())
        }
    };

    // Edge Cases: Clean orphaned references (silently filter against existing letters table)
    let open_ids: Vec<String> = serde_json::from_str(&open_ids_str).unwrap_or_default();
    let mut valid_open_ids = Vec::new();

    for id in open_ids {
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM letters WHERE id = ?)",
            [&id],
            |row| row.get(0),
        ).unwrap_or(false);

        if exists {
            valid_open_ids.push(id);
        }
    }

    let final_active = if let Some(ref active_id) = active_letter_id {
        if valid_open_ids.contains(active_id) {
            Some(active_id.clone())
        } else {
            None
        }
    } else {
        None
    };

    let final_open_ids_str = serde_json::to_string(&valid_open_ids).unwrap_or_else(|_| "[]".to_string());

    // If we cleaned any orphaned refs, update the database silently
    if final_open_ids_str != open_ids_str || final_active != active_letter_id {
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        tx.execute(
            "UPDATE workspace_state 
             SET open_letter_ids = ?, active_letter_id = ?, updated_at = ? 
             WHERE id = 1",
            rusqlite::params![final_open_ids_str, final_active, Utc::now().to_rfc3339()],
        ).map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
    }

    Ok(WorkspaceState {
        open_letter_ids: final_open_ids_str,
        active_letter_id: final_active,
        crawler_state,
    })
}

// ══════════════════════════════════════════════
// Zustand Persist Key-Value Storage Adapters
// ══════════════════════════════════════════════

#[tauri::command]
pub fn get_persist_value(
    state: tauri::State<AppState>,
    key: String,
) -> Result<Option<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let val: Result<String, rusqlite::Error> = conn.query_row(
        "SELECT value FROM zustand_persist WHERE key = ?",
        [&key],
        |row| row.get(0),
    );

    match val {
        Ok(v) => Ok(Some(v)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Database error on persist fetch: {}", e)),
    }
}

#[tauri::command]
pub fn set_persist_value(
    state: tauri::State<AppState>,
    key: String,
    value: String,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO zustand_persist (key, value) VALUES (?, ?)",
        rusqlite::params![key, value],
    ).map_err(|e| format!("Failed to set persist value: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub fn delete_persist_value(
    state: tauri::State<AppState>,
    key: String,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM zustand_persist WHERE key = ?",
        [&key],
    ).map_err(|e| format!("Failed to delete persist value: {}", e))?;

    Ok(true)
}
