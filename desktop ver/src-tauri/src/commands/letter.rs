use crate::state::AppState;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Letter {
    pub id: String,
    pub penpal_id: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LetterContentResponse {
    pub blocks_json: String,
}

#[tauri::command]
pub fn create_letter(
    state: tauri::State<AppState>,
    penpal_id: String,
) -> Result<Letter, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Check if a draft letter for this penpal already exists
    let existing_letter: Result<(String, String, String), rusqlite::Error> = tx.query_row(
        "SELECT id, created_at, updated_at FROM letters WHERE penpal_id = ? AND status = 'draft'",
        [&penpal_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    );

    if let Ok((letter_id, created_at, updated_at)) = existing_letter {
        tx.rollback().map_err(|e| e.to_string())?;
        return Ok(Letter {
            id: letter_id,
            penpal_id,
            status: "draft".to_string(),
            created_at,
            updated_at,
        });
    }

    let letter_id = Uuid::new_v4().to_string();
    let content_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Create the letter
    tx.execute(
        "INSERT INTO letters (id, penpal_id, status, created_at, updated_at)
         VALUES (?, ?, 'draft', ?, ?)",
        rusqlite::params![letter_id, penpal_id, now, now],
    ).map_err(|e| format!("Failed to create letter in DB: {}", e))?;

    // Create default letter content
    tx.execute(
        "INSERT INTO letter_content (id, letter_id, blocks_json)
         VALUES (?, ?, '[]')",
        rusqlite::params![content_id, letter_id],
    ).map_err(|e| format!("Failed to create letter content: {}", e))?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(Letter {
        id: letter_id,
        penpal_id,
        status: "draft".to_string(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn save_letter_content(
    state: tauri::State<AppState>,
    letter_id: String,
    blocks_json: String,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Atomic insert/replace for letter_content
    // We use INSERT OR REPLACE as defined in BACKEND_STRUCTURE.md § Storage Rules
    conn.execute(
        "INSERT OR REPLACE INTO letter_content (id, letter_id, blocks_json)
         VALUES (
            COALESCE((SELECT id FROM letter_content WHERE letter_id = ?), ?),
            ?,
            ?
         )",
        rusqlite::params![letter_id, Uuid::new_v4().to_string(), letter_id, blocks_json],
    ).map_err(|e| format!("Failed to save letter content: {}", e))?;

    // Update the letter's updated_at timestamp
    conn.execute(
        "UPDATE letters SET updated_at = ? WHERE id = ?",
        rusqlite::params![Utc::now().to_rfc3339(), letter_id],
    ).map_err(|e| format!("Failed to update letter metadata: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub fn load_letter_content(
    state: tauri::State<AppState>,
    letter_id: String,
) -> Result<LetterContentResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let blocks_json: String = conn.query_row(
        "SELECT blocks_json FROM letter_content WHERE letter_id = ?",
        [&letter_id],
        |row| row.get(0),
    ).map_err(|e| format!("Letter content not found: {}", e))?;

    Ok(LetterContentResponse { blocks_json })
}

#[tauri::command]
pub fn mark_letter_sent(
    state: tauri::State<AppState>,
    letter_id: String,
) -> Result<bool, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Update letter status to sent
    tx.execute(
        "UPDATE letters SET status = 'sent', updated_at = ? WHERE id = ?",
        rusqlite::params![Utc::now().to_rfc3339(), letter_id],
    ).map_err(|e| format!("Failed to mark letter as sent: {}", e))?;

    // Delete content from letter_content (or keep it? In BACKEND_STRUCTURE.md, ON DELETE CASCADE works on letter delete, 
    // but the letter status becomes "sent", meaning the letter still exists in letters table, just status is "sent").
    // Closed tabs/sent letters are read-only, so we keep content.

    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}
