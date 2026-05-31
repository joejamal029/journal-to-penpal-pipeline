# Codebase Snapshot: journal-to-penpal-pipeline

## Project Structure
```text
.
├── launch.bat
├── scratch
│   └── generate_icons.py
├── src
│   ├── App.tsx
│   ├── components
│   │   ├── CrawlerPanel.tsx
│   │   ├── JournalSourcesView.tsx
│   │   ├── LetterEditor.tsx
│   │   ├── PenpalPanel.tsx
│   │   ├── ScaffoldModal.tsx
│   │   ├── WorkspacePanel.tsx
│   │   └── blocks
│   │       └── schema.tsx
│   ├── main.tsx
│   ├── services
│   │   ├── journalService.ts
│   │   ├── letterService.ts
│   │   ├── penpalService.ts
│   │   └── workspaceService.ts
│   ├── stores
│   │   └── appStore.ts
│   ├── styles
│   │   ├── global.css
│   │   └── tokens.css
│   ├── types
│   │   └── index.ts
│   ├── utils
│   │   └── serialization.ts
│   └── vite-env.d.ts
├── src-tauri
│   ├── Cargo.toml
│   ├── build.rs
│   └── src
│       ├── commands
│       │   ├── journal.rs
│       │   ├── letter.rs
│       │   ├── mod.rs
│       │   ├── penpal.rs
│       │   └── workspace.rs
│       ├── db.rs
│       ├── lib.rs
│       ├── main.rs
│       ├── migrations
│       │   └── 001_initial.sql
│       ├── parser
│       │   ├── format1.rs
│       │   ├── format2.rs
│       │   ├── format3.rs
│       │   └── mod.rs
│       └── state.rs
├── vibe_snapshot_env.txt
└── vite.config.ts
```

## File Contents

### `launch.bat`
```bat
@echo off
title Journal-to-Penpal Pipeline Launcher
echo ===================================================
echo   Starting Journal-to-Penpal Pipeline Dev Server...
echo ===================================================
echo.
npm run tauri dev
if %errorlevel% neq 0 (
    echo.
    echo Launch failed with error code %errorlevel%.
    pause
)

```

### `scratch/generate_icons.py`
```py
import os
from PIL import Image

source_path = r"C:\Users\USER\.gemini\antigravity\brain\0bcfeccf-94e7-42fd-90ea-aa382eb99642\app_icon_1779453671602.png"
output_dir = r"c:\Users\USER\Desktop\APPS\journal-to-penpal-pipeline\src-tauri\icons"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

print(f"Loading source image from: {source_path}")
img = Image.open(source_path)

# Ensure it's RGBA
if img.mode != 'RGBA':
    img = img.convert('RGBA')

# 1. 32x32.png
print("Generating 32x32.png...")
img_32 = img.resize((32, 32), Image.Resampling.LANCZOS)
img_32.save(os.path.join(output_dir, "32x32.png"), "PNG")

# 2. 128x128.png
print("Generating 128x128.png...")
img_128 = img.resize((128, 128), Image.Resampling.LANCZOS)
img_128.save(os.path.join(output_dir, "128x128.png"), "PNG")

# 3. 128x128@2x.png (256x256)
print("Generating 128x128@2x.png...")
img_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
img_256.save(os.path.join(output_dir, "128x128@2x.png"), "PNG")

# 4. icon.ico
print("Generating icon.ico...")
# ICO standard sizes: 16, 32, 48, 64, 128, 256
ico_sizes = [16, 32, 48, 64, 128, 256]
ico_images = []
for size in ico_sizes:
    ico_images.append(img.resize((size, size), Image.Resampling.LANCZOS))
ico_images[0].save(
    os.path.join(output_dir, "icon.ico"),
    format="ICO",
    sizes=[(size, size) for size in ico_sizes],
    append_images=ico_images[1:]
)

# 5. icon.icns
print("Generating icon.icns...")
# ICNS can be saved directly by Pillow
try:
    icns_sizes = [16, 32, 64, 128, 256, 512]
    icns_images = []
    for size in icns_sizes:
        icns_images.append(img.resize((size, size), Image.Resampling.LANCZOS))
    # Filter out only the ones that icns format accepts
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(os.path.join(output_dir, "icon.icns"), format="ICNS")
except Exception as e:
    print(f"Could not generate true ICNS: {e}. Writing a placeholder fallback file.")
    # Fallback to copy the 512 png or write a simple file
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(os.path.join(output_dir, "icon.icns"), "PNG")

print("All icons successfully generated in src-tauri/icons!")

```

### `src-tauri/Cargo.toml`
```toml
[package]
name = "journal-to-penpal-pipeline"
version = "0.1.0"
description = "A Tauri v2 desktop app for transforming journal entries into penpal letters"
authors = ["you"]
edition = "2021"

[lib]
name = "journal_to_penpal_pipeline_lib"
crate-type = ["lib", "cdylib", "staticlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-clipboard-manager = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.33", features = ["bundled"] }
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4"] }
nom = "7.1"
nom_locate = "4"

```

### `src-tauri/build.rs`
```rs
fn main() {
    tauri_build::build()
}

```

### `src-tauri/src/commands/journal.rs`
```rs
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

```

### `src-tauri/src/commands/letter.rs`
```rs
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

```

### `src-tauri/src/commands/mod.rs`
```rs
pub mod journal;
pub mod penpal;
pub mod letter;
pub mod workspace;

```

### `src-tauri/src/commands/penpal.rs`
```rs
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

```

### `src-tauri/src/commands/workspace.rs`
```rs
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

```

### `src-tauri/src/db.rs`
```rs
use rusqlite::{Connection, Result};
use std::path::Path;

/// Initialize the SQLite database with WAL mode, foreign keys, and run migrations.
pub fn init_database(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    // Required pragmas (BACKEND_STRUCTURE.md § Storage Rules)
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;

    run_migrations(&conn)?;

    Ok(conn)
}

/// Run sequential migrations based on PRAGMA user_version.
/// Pattern from BACKEND_STRUCTURE.md § Migration Strategy.
fn run_migrations(conn: &Connection) -> Result<()> {
    let version: i32 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(include_str!("migrations/001_initial.sql"))?;
        conn.pragma_update(None, "user_version", &1)?;
    }

    Ok(())
}

```

### `src-tauri/src/lib.rs`
```rs
mod db;
mod state;
pub mod parser;
pub mod commands;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            // Journal commands
            commands::journal::import_journal_file,
            commands::journal::get_import_status,
            commands::journal::remove_journal_source,
            commands::journal::get_thought_units,
            // Penpal commands
            commands::penpal::create_penpal,
            commands::penpal::get_penpals,
            commands::penpal::update_penpal,
            commands::penpal::add_correspondence,
            commands::penpal::get_correspondence,
            // Letter commands
            commands::letter::create_letter,
            commands::letter::save_letter_content,
            commands::letter::load_letter_content,
            commands::letter::mark_letter_sent,
            // Workspace commands
            commands::workspace::save_workspace_state,
            commands::workspace::load_workspace_state,
            commands::workspace::get_persist_value,
            commands::workspace::set_persist_value,
            commands::workspace::delete_persist_value,
        ])
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_local_data_dir()
                .expect("Failed to resolve app local data dir");

            // Ensure the data directory exists
            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            let db_path = app_data_dir.join("journal_penpal.db");
            let conn = db::init_database(&db_path)
                .expect("Failed to initialize database");

            app.manage(AppState::new(conn));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

```

### `src-tauri/src/main.rs`
```rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    journal_to_penpal_pipeline_lib::run()
}

```

### `src-tauri/src/migrations/001_initial.sql`
```sql
-- Migration 001: Initial schema
-- Source: BACKEND_STRUCTURE.md — all 7 tables + zustand_persist
-- Applied when PRAGMA user_version < 1

-- ══════════════════════════════════════════════
-- Table: journal_sources
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS journal_sources (
    id              TEXT PRIMARY KEY,
    file_path       TEXT NOT NULL UNIQUE,
    file_name       TEXT NOT NULL,
    last_modified   TEXT NOT NULL,
    last_imported   TEXT NOT NULL,
    format_version  INTEGER NOT NULL,
    entry_count     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_journal_sources_path ON journal_sources(file_path);

-- ══════════════════════════════════════════════
-- Table: thought_units
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS thought_units (
    id                  TEXT PRIMARY KEY,
    date                TEXT,
    content             TEXT NOT NULL,
    category            TEXT NOT NULL DEFAULT 'uncategorized'
                        CHECK(category IN ('presence', 'reminiscence', 'uncategorized')),
    source_file_path    TEXT NOT NULL,
    source_line_number  INTEGER NOT NULL,
    format_version      INTEGER NOT NULL,
    created_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_thought_units_date ON thought_units(date);
CREATE INDEX IF NOT EXISTS idx_thought_units_source ON thought_units(source_file_path);

-- ══════════════════════════════════════════════
-- Table: penpals
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS penpals (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    country     TEXT NOT NULL DEFAULT '',
    interests   TEXT NOT NULL DEFAULT '',
    topics      TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

-- ══════════════════════════════════════════════
-- Table: correspondence
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS correspondence (
    id          TEXT PRIMARY KEY,
    penpal_id   TEXT NOT NULL,
    direction   TEXT NOT NULL CHECK(direction IN ('sent', 'received')),
    content     TEXT NOT NULL,
    letter_date TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    FOREIGN KEY (penpal_id) REFERENCES penpals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_correspondence_penpal ON correspondence(penpal_id);

-- ══════════════════════════════════════════════
-- Table: letters
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS letters (
    id          TEXT PRIMARY KEY,
    penpal_id   TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent')),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (penpal_id) REFERENCES penpals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_letters_penpal ON letters(penpal_id);
CREATE INDEX IF NOT EXISTS idx_letters_status ON letters(status);

-- ══════════════════════════════════════════════
-- Table: letter_content
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS letter_content (
    id          TEXT PRIMARY KEY,
    letter_id   TEXT NOT NULL UNIQUE,
    blocks_json TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_letter_content_letter ON letter_content(letter_id);

-- ══════════════════════════════════════════════
-- Table: workspace_state
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS workspace_state (
    id                INTEGER PRIMARY KEY CHECK(id = 1),
    open_letter_ids   TEXT NOT NULL DEFAULT '[]',
    active_letter_id  TEXT,
    crawler_state     TEXT NOT NULL DEFAULT '{}',
    updated_at        TEXT NOT NULL
);

-- Insert the singleton row
INSERT OR IGNORE INTO workspace_state (id, open_letter_ids, active_letter_id, crawler_state, updated_at)
VALUES (1, '[]', NULL, '{}', datetime('now'));

-- ══════════════════════════════════════════════
-- Table: zustand_persist
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS zustand_persist (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL
);

```

### `src-tauri/src/parser/format1.rs`
```rs
use nom::{
    bytes::complete::tag,
    character::complete::{line_ending, not_line_ending, space0, anychar},
    combinator::opt,
    sequence::tuple,
    IResult, Parser,
};
use nom_locate::LocatedSpan;
use uuid::Uuid;
use super::{parse_date, ThoughtUnit, FormatVersion};

type Span<'a> = LocatedSpan<&'a str>;

#[derive(Debug)]
struct RawDateBlock {
    date_str: String,
    #[allow(dead_code)]
    date_line: i32,
    lines: Vec<(String, i32)>,
}

fn parse_date_header(input: Span) -> IResult<Span, (String, i32)> {
    let line_num = input.location_line() as i32;
    let (input, _) = tuple((tag("##"), space0)).parse(input)?;
    let (input, date_span) = not_line_ending(input)?;
    let (input, _) = opt(line_ending).parse(input)?;
    Ok((input, (date_span.fragment().trim().to_string(), line_num)))
}

fn parse_content_line(input: Span) -> IResult<Span, (Span, i32)> {
    let line_num = input.location_line() as i32;
    if input.fragment().starts_with("##") {
        return Err(nom::Err::Error(nom::error::Error::new(input, nom::error::ErrorKind::Tag)));
    }
    let (input, line_content) = not_line_ending(input)?;
    let (input, _) = opt(line_ending).parse(input)?;
    Ok((input, (line_content, line_num)))
}

fn parse_pre_header_block(input: Span) -> IResult<Span, Vec<(String, i32)>> {
    let mut lines = Vec::new();
    let mut remaining = input;
    while !remaining.fragment().is_empty() {
        if remaining.fragment().starts_with("##") {
            break;
        }
        match parse_content_line(remaining) {
            Ok((next_input, (line_content, line_num))) => {
                let content_str = line_content.fragment().trim().to_string();
                if !content_str.is_empty() {
                    lines.push((content_str, line_num));
                }
                remaining = next_input;
            }
            Err(_) => {
                let (next_input, _) = opt(line_ending).parse(remaining)?;
                if next_input == remaining {
                    let (next_input, _) = anychar(remaining)?;
                    remaining = next_input;
                } else {
                    remaining = next_input;
                }
            }
        }
    }
    Ok((remaining, lines))
}

fn parse_date_block(input: Span) -> IResult<Span, RawDateBlock> {
    let (input, (date_str, date_line)) = parse_date_header(input)?;
    let mut lines = Vec::new();
    let mut remaining = input;
    while !remaining.fragment().is_empty() {
        if remaining.fragment().starts_with("##") {
            break;
        }
        match parse_content_line(remaining) {
            Ok((next_input, (line_content, line_num))) => {
                let content_str = line_content.fragment().trim().to_string();
                if !content_str.is_empty() {
                    lines.push((content_str, line_num));
                }
                remaining = next_input;
            }
            Err(_) => {
                let (next_input, _) = opt(line_ending).parse(remaining)?;
                if next_input == remaining {
                    let (next_input, _) = anychar(remaining)?;
                    remaining = next_input;
                } else {
                    remaining = next_input;
                }
            }
        }
    }
    Ok((remaining, RawDateBlock { date_str, date_line, lines }))
}

pub fn parse(content: &str, file_path: &str, default_date: Option<&str>) -> Vec<ThoughtUnit> {
    let mut thought_units = Vec::new();
    let created_at = chrono::Local::now().to_rfc3339();
    let span = Span::new(content);

    // 1. Parse pre-header block (if any)
    let mut current_date = default_date.map(String::from);
    if let Ok((remaining, pre_lines)) = parse_pre_header_block(span) {
        for (line_str, line_num) in pre_lines {
            if let Some(clean) = clean_bullet(&line_str) {
                thought_units.push(ThoughtUnit {
                    id: Uuid::new_v4().to_string(),
                    date: current_date.clone(),
                    content: clean,
                    category: "uncategorized".to_string(),
                    source_file_path: file_path.to_string(),
                    source_line_number: line_num,
                    format_version: FormatVersion::Format1 as i32,
                    created_at: created_at.clone(),
                });
            }
        }

        // 2. Parse sequential date blocks
        let mut rem = remaining;
        while !rem.fragment().is_empty() {
            if rem.fragment().starts_with("##") {
                if let Ok((next_rem, block)) = parse_date_block(rem) {
                    if let Some(parsed_d) = parse_date(&block.date_str) {
                        current_date = Some(parsed_d.format("%Y-%m-%d").to_string());
                    }
                    
                    for (line_str, line_num) in block.lines {
                        if let Some(clean) = clean_bullet(&line_str) {
                            thought_units.push(ThoughtUnit {
                                id: Uuid::new_v4().to_string(),
                                date: current_date.clone(),
                                content: clean,
                                category: "uncategorized".to_string(),
                                source_file_path: file_path.to_string(),
                                source_line_number: line_num,
                                format_version: FormatVersion::Format1 as i32,
                                created_at: created_at.clone(),
                            });
                        }
                    }
                    rem = next_rem;
                } else {
                    // Safe break if it fails
                    break;
                }
            } else {
                // Consume blank lines/junk
                if let Ok((next_rem, _)) = anychar::<Span, nom::error::Error<Span>>(rem) {
                    rem = next_rem;
                } else {
                    break;
                }
            }
        }
    }

    thought_units
}

fn clean_bullet(line: &str) -> Option<String> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }
    let mut clean = trimmed;
    if trimmed.starts_with("- ") {
        clean = trimmed.strip_prefix("- ").unwrap().trim();
    } else if trimmed.starts_with("* ") {
        clean = trimmed.strip_prefix("* ").unwrap().trim();
    } else if trimmed.starts_with("• ") {
        clean = trimmed.strip_prefix("• ").unwrap().trim();
    }
    
    if clean.is_empty() {
        None
    } else {
        Some(clean.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format1_parser() {
        let content = "Some initial line\n## 2024-05-12\n- Bullet 1\n* Bullet 2\nNormal text\n## May 13, 2024\n• Bullet 3";
        let units = parse(content, "test.md", Some("2024-05-11"));
        
        assert_eq!(units.len(), 5);
        assert_eq!(units[0].content, "Some initial line");
        assert_eq!(units[0].date, Some("2024-05-11".to_string()));
        assert_eq!(units[0].source_line_number, 1);

        assert_eq!(units[1].content, "Bullet 1");
        assert_eq!(units[1].date, Some("2024-05-12".to_string()));
        assert_eq!(units[1].source_line_number, 3);

        assert_eq!(units[2].content, "Bullet 2");
        assert_eq!(units[2].date, Some("2024-05-12".to_string()));
        assert_eq!(units[2].source_line_number, 4);

        assert_eq!(units[3].content, "Normal text");
        assert_eq!(units[3].date, Some("2024-05-12".to_string()));
        assert_eq!(units[3].source_line_number, 5);

        assert_eq!(units[4].content, "Bullet 3");
        assert_eq!(units[4].date, Some("2024-05-13".to_string()));
        assert_eq!(units[4].source_line_number, 7);
    }
}

```

### `src-tauri/src/parser/format2.rs`
```rs
use nom::{
    bytes::complete::tag,
    character::complete::{line_ending, not_line_ending, space0, anychar},
    combinator::opt,
    sequence::tuple,
    IResult, Parser,
};
use nom_locate::LocatedSpan;
use uuid::Uuid;
use super::{parse_date, ThoughtUnit, FormatVersion};

type Span<'a> = LocatedSpan<&'a str>;

#[derive(Debug)]
struct RawDateBlock {
    date_str: String,
    #[allow(dead_code)]
    date_line: i32,
    lines: Vec<(String, i32)>,
}

fn parse_date_header(input: Span) -> IResult<Span, (String, i32)> {
    let line_num = input.location_line() as i32;
    let (input, _) = tuple((tag("##"), space0)).parse(input)?;
    let (input, date_span) = not_line_ending(input)?;
    let (input, _) = opt(line_ending).parse(input)?;
    Ok((input, (date_span.fragment().trim().to_string(), line_num)))
}

fn parse_content_line(input: Span) -> IResult<Span, (Span, i32)> {
    let line_num = input.location_line() as i32;
    if input.fragment().starts_with("##") {
        return Err(nom::Err::Error(nom::error::Error::new(input, nom::error::ErrorKind::Tag)));
    }
    let (input, line_content) = not_line_ending(input)?;
    let (input, _) = opt(line_ending).parse(input)?;
    Ok((input, (line_content, line_num)))
}

fn parse_pre_header_block(input: Span) -> IResult<Span, Vec<(String, i32)>> {
    let mut lines = Vec::new();
    let mut remaining = input;
    while !remaining.fragment().is_empty() {
        if remaining.fragment().starts_with("##") {
            break;
        }
        match parse_content_line(remaining) {
            Ok((next_input, (line_content, line_num))) => {
                let content_str = line_content.fragment().trim().to_string();
                if !content_str.is_empty() {
                    lines.push((content_str, line_num));
                }
                remaining = next_input;
            }
            Err(_) => {
                let (next_input, _) = opt(line_ending).parse(remaining)?;
                if next_input == remaining {
                    let (next_input, _) = anychar(remaining)?;
                    remaining = next_input;
                } else {
                    remaining = next_input;
                }
            }
        }
    }
    Ok((remaining, lines))
}

fn parse_date_block(input: Span) -> IResult<Span, RawDateBlock> {
    let (input, (date_str, date_line)) = parse_date_header(input)?;
    let mut lines = Vec::new();
    let mut remaining = input;
    while !remaining.fragment().is_empty() {
        if remaining.fragment().starts_with("##") {
            break;
        }
        match parse_content_line(remaining) {
            Ok((next_input, (line_content, line_num))) => {
                let content_str = line_content.fragment().trim().to_string();
                if !content_str.is_empty() {
                    lines.push((content_str, line_num));
                }
                remaining = next_input;
            }
            Err(_) => {
                let (next_input, _) = opt(line_ending).parse(remaining)?;
                if next_input == remaining {
                    let (next_input, _) = anychar(remaining)?;
                    remaining = next_input;
                } else {
                    remaining = next_input;
                }
            }
        }
    }
    Ok((remaining, RawDateBlock { date_str, date_line, lines }))
}

pub fn parse(content: &str, file_path: &str, default_date: Option<&str>) -> Vec<ThoughtUnit> {
    let mut thought_units = Vec::new();
    let created_at = chrono::Local::now().to_rfc3339();
    let span = Span::new(content);

    // 1. Parse pre-header block (if any)
    let mut current_date = default_date.map(String::from);
    if let Ok((remaining, pre_lines)) = parse_pre_header_block(span) {
        for (line_str, line_num) in pre_lines {
            let trimmed = line_str.trim();
            if !trimmed.is_empty() {
                thought_units.push(ThoughtUnit {
                    id: Uuid::new_v4().to_string(),
                    date: current_date.clone(),
                    content: trimmed.to_string(),
                    category: "uncategorized".to_string(),
                    source_file_path: file_path.to_string(),
                    source_line_number: line_num,
                    format_version: FormatVersion::Format2 as i32,
                    created_at: created_at.clone(),
                });
            }
        }

        // 2. Parse sequential date blocks
        let mut rem = remaining;
        while !rem.fragment().is_empty() {
            if rem.fragment().starts_with("##") {
                if let Ok((next_rem, block)) = parse_date_block(rem) {
                    if let Some(parsed_d) = parse_date(&block.date_str) {
                        current_date = Some(parsed_d.format("%Y-%m-%d").to_string());
                    }
                    
                    for (line_str, line_num) in block.lines {
                        let trimmed = line_str.trim();
                        if !trimmed.is_empty() {
                            thought_units.push(ThoughtUnit {
                                id: Uuid::new_v4().to_string(),
                                date: current_date.clone(),
                                content: trimmed.to_string(),
                                category: "uncategorized".to_string(),
                                source_file_path: file_path.to_string(),
                                source_line_number: line_num,
                                format_version: FormatVersion::Format2 as i32,
                                created_at: created_at.clone(),
                            });
                        }
                    }
                    rem = next_rem;
                } else {
                    break;
                }
            } else {
                if let Ok((next_rem, _)) = anychar::<Span, nom::error::Error<Span>>(rem) {
                    rem = next_rem;
                } else {
                    break;
                }
            }
        }
    }

    thought_units
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format2_parser() {
        let content = "Some initial line\n## 2024-05-12\n- Keep bullet literal here\nNormal paragraph line\n## May 13, 2024\nPlain newline content";
        let units = parse(content, "test.md", Some("2024-05-11"));
        
        assert_eq!(units.len(), 4);
        assert_eq!(units[0].content, "Some initial line");
        assert_eq!(units[0].date, Some("2024-05-11".to_string()));

        assert_eq!(units[1].content, "- Keep bullet literal here");
        assert_eq!(units[1].date, Some("2024-05-12".to_string()));

        assert_eq!(units[2].content, "Normal paragraph line");

        assert_eq!(units[3].content, "Plain newline content");
        assert_eq!(units[3].date, Some("2024-05-13".to_string()));
    }
}

```

### `src-tauri/src/parser/format3.rs`
```rs
use nom::{
    bytes::complete::tag,
    character::complete::{line_ending, not_line_ending, space0, anychar},
    combinator::opt,
    sequence::tuple,
    IResult, Parser,
};
use nom_locate::LocatedSpan;
use uuid::Uuid;
use super::{parse_date, ThoughtUnit, FormatVersion};

type Span<'a> = LocatedSpan<&'a str>;

#[derive(Debug)]
struct RawDateBlock {
    date_str: String,
    #[allow(dead_code)]
    date_line: i32,
    lines: Vec<(String, i32)>,
}

fn parse_date_header(input: Span) -> IResult<Span, (String, i32)> {
    let line_num = input.location_line() as i32;
    let (input, _) = tuple((tag("##"), space0)).parse(input)?;
    let (input, date_span) = not_line_ending(input)?;
    let (input, _) = opt(line_ending).parse(input)?;
    Ok((input, (date_span.fragment().trim().to_string(), line_num)))
}

fn parse_content_line(input: Span) -> IResult<Span, (Span, i32)> {
    let line_num = input.location_line() as i32;
    if input.fragment().starts_with("##") {
        return Err(nom::Err::Error(nom::error::Error::new(input, nom::error::ErrorKind::Tag)));
    }
    let (input, line_content) = not_line_ending(input)?;
    let (input, _) = opt(line_ending).parse(input)?;
    Ok((input, (line_content, line_num)))
}

fn parse_pre_header_block(input: Span) -> IResult<Span, Vec<(String, i32)>> {
    let mut lines = Vec::new();
    let mut remaining = input;
    while !remaining.fragment().is_empty() {
        if remaining.fragment().starts_with("##") {
            break;
        }
        match parse_content_line(remaining) {
            Ok((next_input, (line_content, line_num))) => {
                let content_str = line_content.fragment().trim().to_string();
                if !content_str.is_empty() {
                    lines.push((content_str, line_num));
                }
                remaining = next_input;
            }
            Err(_) => {
                let (next_input, _) = opt(line_ending).parse(remaining)?;
                if next_input == remaining {
                    let (next_input, _) = anychar(remaining)?;
                    remaining = next_input;
                } else {
                    remaining = next_input;
                }
            }
        }
    }
    Ok((remaining, lines))
}

fn parse_date_block(input: Span) -> IResult<Span, RawDateBlock> {
    let (input, (date_str, date_line)) = parse_date_header(input)?;
    let mut lines = Vec::new();
    let mut remaining = input;
    while !remaining.fragment().is_empty() {
        if remaining.fragment().starts_with("##") {
            break;
        }
        match parse_content_line(remaining) {
            Ok((next_input, (line_content, line_num))) => {
                let content_str = line_content.fragment().trim().to_string();
                if !content_str.is_empty() {
                    lines.push((content_str, line_num));
                }
                remaining = next_input;
            }
            Err(_) => {
                let (next_input, _) = opt(line_ending).parse(remaining)?;
                if next_input == remaining {
                    let (next_input, _) = anychar(remaining)?;
                    remaining = next_input;
                } else {
                    remaining = next_input;
                }
            }
        }
    }
    Ok((remaining, RawDateBlock { date_str, date_line, lines }))
}

pub fn parse(content: &str, file_path: &str, default_date: Option<&str>) -> Vec<ThoughtUnit> {
    let mut thought_units = Vec::new();
    let created_at = chrono::Local::now().to_rfc3339();
    let span = Span::new(content);

    let mut current_date = default_date.map(String::from);
    let mut current_category = "uncategorized".to_string();

    // Helper to process lines
    let process_line = |line_str: &str, line_num: i32, date: &Option<String>, units: &mut Vec<ThoughtUnit>, cat: &mut String| {
        let trimmed = line_str.trim();
        if trimmed == "#presence" {
            *cat = "presence".to_string();
        } else if trimmed == "#reminiscence" {
            *cat = "reminiscence".to_string();
        } else if !trimmed.is_empty() {
            units.push(ThoughtUnit {
                id: Uuid::new_v4().to_string(),
                date: date.clone(),
                content: trimmed.to_string(),
                category: cat.clone(),
                source_file_path: file_path.to_string(),
                source_line_number: line_num,
                format_version: FormatVersion::Format3 as i32,
                created_at: created_at.clone(),
            });
        }
    };

    // 1. Parse pre-header block (if any)
    if let Ok((remaining, pre_lines)) = parse_pre_header_block(span) {
        for (line_str, line_num) in pre_lines {
            process_line(&line_str, line_num, &current_date, &mut thought_units, &mut current_category);
        }

        // 2. Parse sequential date blocks
        let mut rem = remaining;
        while !rem.fragment().is_empty() {
            if rem.fragment().starts_with("##") {
                if let Ok((next_rem, block)) = parse_date_block(rem) {
                    if let Some(parsed_d) = parse_date(&block.date_str) {
                        current_date = Some(parsed_d.format("%Y-%m-%d").to_string());
                    }
                    
                    // Reset category to uncategorized for each new date block to avoid bleeding state
                    current_category = "uncategorized".to_string();

                    for (line_str, line_num) in block.lines {
                        process_line(&line_str, line_num, &current_date, &mut thought_units, &mut current_category);
                    }
                    rem = next_rem;
                } else {
                    break;
                }
            } else {
                if let Ok((next_rem, _)) = anychar::<Span, nom::error::Error<Span>>(rem) {
                    rem = next_rem;
                } else {
                    break;
                }
            }
        }
    }

    thought_units
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format3_parser() {
        let content = "Some initial line\n## 2024-05-12\n#presence\nPresence item 1\n#reminiscence\nReminiscence item 1\n## May 13, 2024\nUntagged item\n#presence\nPresence item 2";
        let units = parse(content, "test.md", Some("2024-05-11"));
        
        assert_eq!(units.len(), 5);
        assert_eq!(units[0].content, "Some initial line");
        assert_eq!(units[0].category, "uncategorized");
        assert_eq!(units[0].date, Some("2024-05-11".to_string()));

        assert_eq!(units[1].content, "Presence item 1");
        assert_eq!(units[1].category, "presence");
        assert_eq!(units[1].date, Some("2024-05-12".to_string()));

        assert_eq!(units[2].content, "Reminiscence item 1");
        assert_eq!(units[2].category, "reminiscence");
        assert_eq!(units[2].date, Some("2024-05-12".to_string()));

        assert_eq!(units[3].content, "Untagged item");
        assert_eq!(units[3].category, "uncategorized"); // category reset to uncategorized on new date block
        assert_eq!(units[3].date, Some("2024-05-13".to_string()));

        assert_eq!(units[4].content, "Presence item 2");
        assert_eq!(units[4].category, "presence");
        assert_eq!(units[4].date, Some("2024-05-13".to_string()));
    }
}

```

### `src-tauri/src/parser/mod.rs`
```rs
pub mod format1;
pub mod format2;
pub mod format3;

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::path::Path;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ThoughtUnit {
    pub id: String,
    pub date: Option<String>, // ISO date "YYYY-MM-DD"
    pub content: String,
    pub category: String, // "presence" | "reminiscence" | "uncategorized"
    pub source_file_path: String,
    pub source_line_number: i32,
    pub format_version: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FormatVersion {
    Format1 = 1,
    Format2 = 2,
    Format3 = 3,
}

/// Helper function to detect the format variant of a journal file.
/// Score against each format pattern based on research findings:
/// - Format 3 (newest): Look for "#presence" or "#reminiscence" tags.
/// - Format 1 (oldest): Look for bullet markers ("- ", "* ", "• ") starting lines.
/// - Format 2 (middle): Default fallback (newline-delimited, date headers only).
pub fn detect_format(content: &str) -> FormatVersion {
    if content.contains("#presence") || content.contains("#reminiscence") {
        FormatVersion::Format3
    } else if content.lines().any(|l| {
        let trimmed = l.trim_start();
        trimmed.starts_with("- ") || trimmed.starts_with("* ") || trimmed.starts_with("• ")
    }) {
        FormatVersion::Format1
    } else {
        FormatVersion::Format2
    }
}

/// Helper function to parse dates using chrono with multiple formats.
pub fn parse_date(date_str: &str) -> Option<NaiveDate> {
    let normalized = date_str.trim();
    let chars: Vec<char> = normalized.chars().collect();
    let mut normalized_str = String::new();
    let mut i = 0;
    while i < chars.len() {
        if i + 2 < chars.len() 
            && chars[i] == ' ' 
            && chars[i+1].is_ascii_digit() 
            && (chars[i+2] == ',' || chars[i+2] == ' ')
            && (i == 0 || chars[i-1] != ' ')
        {
            normalized_str.push(' ');
            normalized_str.push('0');
            normalized_str.push(chars[i+1]);
            i += 2;
        } else {
            normalized_str.push(chars[i]);
            i += 1;
        }
    }

    let formats = [
        "%Y-%m-%d",
        "%B %d, %Y",
        "%d/%m/%Y",
        "%d %B %Y",
        "%B %d, %a, %Y",
        "%B %e, %a, %Y",
    ];
    formats.iter()
        .find_map(|fmt| NaiveDate::parse_from_str(normalized_str.trim(), fmt).ok())
}

/// Helper function to extract a date from a filename (e.g., "journal-2024-05-12.md" -> "2024-05-12").
pub fn extract_date_from_filename(file_path: &str) -> Option<String> {
    let path = Path::new(file_path);
    let filename = path.file_name()?.to_str()?;
    
    // Scan for YYYY-MM-DD pattern
    for i in 0..=filename.len().checked_sub(10).unwrap_or(0) {
        if let Some(sub) = filename.get(i..i+10) {
            // Ensure the match starts with a digit to avoid parsing leading hyphens as negative years (e.g. "-2024-05-1")
            if sub.chars().next().map_or(false, |c| c.is_ascii_digit()) {
                if let Ok(date) = NaiveDate::parse_from_str(sub, "%Y-%m-%d") {
                    return Some(date.format("%Y-%m-%d").to_string());
                }
            }
        }
    }
    None
}

/// Master function to parse any journal file.
/// Detects format and routes to the appropriate parser.
/// If parsing fails or yields no dated entries, fallback is triggered.
pub fn parse_journal(
    content: &str,
    file_path: &str,
) -> (Vec<ThoughtUnit>, FormatVersion, Vec<String>) {
    let mut file_date = None;
    let mut parsed_content = content;

    if let Some(first_line) = content.lines().next() {
        let trimmed = first_line.trim();
        if trimmed.starts_with("### ") {
            let date_candidate = trimmed["### ".len()..].trim();
            if let Some(parsed) = parse_date(date_candidate) {
                file_date = Some(parsed.format("%Y-%m-%d").to_string());
                if let Some(pos) = content.find('\n') {
                    parsed_content = &content[pos + 1..];
                } else {
                    parsed_content = "";
                }
            }
        }
    }

    let file_date = file_date.or_else(|| extract_date_from_filename(file_path));
    let format = detect_format(parsed_content);
    
    let mut warnings = Vec::new();
    let mut thought_units = match format {
        FormatVersion::Format3 => format3::parse(parsed_content, file_path, file_date.as_deref()),
        FormatVersion::Format1 => format1::parse(parsed_content, file_path, file_date.as_deref()),
        FormatVersion::Format2 => format2::parse(parsed_content, file_path, file_date.as_deref()),
    };

    // If the parsed count is 0 and it has date headers, or if we have general content
    // we can attempt a Best-Effort unstructured fallback if we didn't get any entries.
    if thought_units.is_empty() && !parsed_content.trim().is_empty() {
        // Fallback: treat each non-empty line as uncategorized thought-unit
        let created_at = chrono::Local::now().to_rfc3339();
        for (i, line) in parsed_content.lines().enumerate() {
            let line_content = line.trim();
            if !line_content.is_empty() {
                thought_units.push(ThoughtUnit {
                    id: Uuid::new_v4().to_string(),
                    date: file_date.clone(),
                    content: line_content.to_string(),
                    category: "uncategorized".to_string(),
                    source_file_path: file_path.to_string(),
                    source_line_number: (i + 1) as i32,
                    format_version: format as i32,
                    created_at: created_at.clone(),
                });
            }
        }
        warnings.push(format!(
            "File '{}' parsed as unstructured fallback — some entries may be missing dates.",
            Path::new(file_path).file_name().unwrap_or_default().to_string_lossy()
        ));
    }

    // Count undated entries to warn user (PRD criteria)
    let undated_count = thought_units.iter().filter(|tu| tu.date.is_none()).count();
    if undated_count > 0 && !thought_units.is_empty() {
        warnings.push(format!(
            "{} entries could not be dated.",
            undated_count
        ));
    }

    (thought_units, format, warnings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_format() {
        let f3_content = "## 2024-05-12\n#presence\nSome thought\n#reminiscence\nAnother thought";
        assert_eq!(detect_format(f3_content), FormatVersion::Format3);

        let f1_content = "## 2024-05-12\n- A bullet point\n* Another bullet";
        assert_eq!(detect_format(f1_content), FormatVersion::Format1);

        let f2_content = "## 2024-05-12\nJust plain paragraph text\nNo bullet points";
        assert_eq!(detect_format(f2_content), FormatVersion::Format2);
    }

    #[test]
    fn test_parse_date() {
        assert_eq!(parse_date("2024-05-12"), Some(NaiveDate::from_ymd_opt(2024, 5, 12).unwrap()));
        assert_eq!(parse_date("May 12, 2024"), Some(NaiveDate::from_ymd_opt(2024, 5, 12).unwrap()));
        assert_eq!(parse_date("12/05/2024"), Some(NaiveDate::from_ymd_opt(2024, 5, 12).unwrap()));
        assert_eq!(parse_date("12 May 2024"), Some(NaiveDate::from_ymd_opt(2024, 5, 12).unwrap()));
        assert_eq!(parse_date("March 11, Mon, 2024"), Some(NaiveDate::from_ymd_opt(2024, 3, 11).unwrap()));
        assert_eq!(parse_date("March 9, Sat, 2024"), Some(NaiveDate::from_ymd_opt(2024, 3, 9).unwrap()));
        assert_eq!(parse_date("not a date"), None);
    }

    #[test]
    fn test_extract_date_from_filename() {
        assert_eq!(
            extract_date_from_filename("C:/Users/USER/journal-2024-05-12.md"),
            Some("2024-05-12".to_string())
        );
        assert_eq!(
            extract_date_from_filename("journal_entry.txt"),
            None
        );
    }

    #[test]
    fn test_extract_date_from_file_header() {
        let content_with_header = "### March 11, Mon, 2024\n* Woke up quite early, played pes.";
        let (units, format, _warnings) = parse_journal(content_with_header, "C:/Users/USER/journal.md");
        
        assert_eq!(format, FormatVersion::Format1);
        assert!(!units.is_empty());
        assert_eq!(units[0].date, Some("2024-03-11".to_string()));
        assert_eq!(units[0].content, "Woke up quite early, played pes.");

        // Also test single digit day equivalent
        let content_single_digit = "### March 9, Sat, 2024\n* Woke up quite early, played pes.";
        let (units_sd, _, _) = parse_journal(content_single_digit, "C:/Users/USER/journal.md");
        assert!(!units_sd.is_empty());
        assert_eq!(units_sd[0].date, Some("2024-03-09".to_string()));
    }
}

```

### `src-tauri/src/state.rs`
```rs
use rusqlite::Connection;
use std::sync::Mutex;

/// Application state holding the SQLite connection behind a Mutex.
/// All database access is serialized through this mutex — no race conditions
/// (see BACKEND_STRUCTURE.md § Edge Cases & Data Integrity).
pub struct AppState {
    pub db: Mutex<Connection>,
}

impl AppState {
    pub fn new(conn: Connection) -> Self {
        Self {
            db: Mutex::new(conn),
        }
    }
}

```

### `src/App.tsx`
```tsx
import { useState } from 'react';
import { CrawlerPanel } from './components/CrawlerPanel';
import { WorkspacePanel } from './components/WorkspacePanel';
import { PenpalPanel } from './components/PenpalPanel';

function App() {
  const [showSources, setShowSources] = useState(false);

  return (
    <div className="app-shell">
      {/* 1. Left Column: Virtualized Crawler Panel */}
      <aside className="panel-left">
        <CrawlerPanel 
          onManageSources={() => setShowSources(true)} 
        />
      </aside>

      {/* 2. Center Column: Tabbed Workspace Panel */}
      <main className="panel-center">
        <WorkspacePanel
          showSources={showSources}
          onCloseSources={() => setShowSources(false)}
          onOpenSources={() => setShowSources(true)}
        />
      </main>

      {/* 3. Right Column: Penpals Management Panel */}
      <aside className="panel-right">
        <PenpalPanel />
      </aside>
    </div>
  );
}

export default App;

```

### `src/components/CrawlerPanel.tsx`
```tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '../stores/appStore';
import { getThoughtUnits } from '../services/journalService';
import { ThoughtUnit } from '../types';
import { Search, Calendar, ChevronDown, Send, RefreshCw } from 'lucide-react';

interface CrawlerPanelProps {
  onManageSources: () => void;
}

export const CrawlerPanel: React.FC<CrawlerPanelProps> = ({ onManageSources }) => {
  const { crawlerFilters, setCrawlerFilters, openLetters, penpals, addToRoutingQueue } = useAppStore();
  const { startDate, endDate, category, searchQuery } = crawlerFilters;

  const [thoughtUnits, setThoughtUnits] = useState<ThoughtUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [routeMenuOpen, setRouteMenuOpen] = useState<string | null>(null);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);

  // Reset selected letters when menu changes
  useEffect(() => {
    setSelectedLetters([]);
  }, [routeMenuOpen]);

  // Shuffle state
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // 1. Fetch from database on filter change
  const refreshUnits = async () => {
    setLoading(true);
    try {
      const data = await getThoughtUnits(startDate, endDate, category);
      setThoughtUnits(data);
    } catch (e) {
      console.error('Failed to get thought units:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUnits();
  }, [startDate, endDate, category]);

  // 2. Client-side search substring matching
  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return thoughtUnits;
    const q = searchQuery.toLowerCase();
    return thoughtUnits.filter((tu) => tu.content.toLowerCase().includes(q));
  }, [thoughtUnits, searchQuery]);

  // 2b. Shuffling active list
  const displayedUnits = useMemo(() => {
    let units = [...filteredUnits];
    if (isShuffled) {
      // Fisher-Yates Shuffle
      for (let i = units.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = units[i] as ThoughtUnit;
        units[i] = units[j] as ThoughtUnit;
        units[j] = temp;
      }
    }
    return units;
  }, [filteredUnits, isShuffled, shuffleSeed]);

  // 3. Virtualizer Setup
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: displayedUnits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110,
    overscan: 5,
  });

  // Map open letters to penpal names
  const activeTabs = useMemo(() => {
    return openLetters.map((tab) => {
      const penpal = penpals.find((p) => p.id === tab.penpalId);
      return {
        letterId: tab.letterId,
        penpalName: penpal ? penpal.name : 'Unknown Penpal',
      };
    });
  }, [openLetters, penpals]);

  // Handle routing to multiple target letter tabs
  const handleRouteMultiple = (tu: ThoughtUnit) => {
    if (selectedLetters.length === 0) return;

    let successCount = 0;
    let failedCount = 0;

    selectedLetters.forEach((targetLetterId) => {
      try {
        addToRoutingQueue({
          id: crypto.randomUUID(),
          sourceThoughtUnit: tu,
          targetLetterId,
          insertPosition: 'end',
          timestamp: Date.now(),
        });
        successCount++;
      } catch (err: any) {
        console.error(`Failed to route to letter ${targetLetterId}:`, err);
        failedCount++;
      }
    });

    if (failedCount === 0) {
      alert(`Successfully routed entry to ${successCount} draft(s)!`);
    } else {
      alert(`Successfully routed to ${successCount} draft(s). Failed for ${failedCount} draft(s).`);
    }

    setRouteMenuOpen(null);
    setSelectedLetters([]);
  };

  // Timeframe presets handler
  const handlePreset = (preset: 'week' | 'month' | 'all') => {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'week') {
      const start = new Date(today);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(start.setDate(diff));
      setCrawlerFilters({
        startDate: formatDate(monday),
        endDate: formatDate(today)
      });
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setCrawlerFilters({
        startDate: formatDate(firstDay),
        endDate: formatDate(today)
      });
    } else {
      setCrawlerFilters({
        startDate: null,
        endDate: null
      });
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'presence':
        return 'chip-presence';
      case 'reminiscence':
        return 'chip-reminiscence';
      default:
        return 'chip-uncategorized';
    }
  };

  return (
    <div className="crawler-panel-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--color-border)' }}>
      {/* Panel Title & Header Buttons */}
      <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>Journal Crawler</h2>
          {isShuffled && (
            <span style={{ fontSize: '10px', background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '1px 6px', fontWeight: 'var(--weight-semibold)' }}>
              Shuffled
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={() => {
              if (isShuffled) {
                setIsShuffled(false);
              } else {
                setIsShuffled(true);
                setShuffleSeed((prev) => prev + 1);
              }
            }}
            style={{
              background: isShuffled ? 'var(--color-primary)' : 'var(--color-surface-elevated)',
              color: isShuffled ? 'white' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              fontWeight: 'var(--weight-medium)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)'
            }}
          >
            <RefreshCw size={12} className={isShuffled ? 'spin' : ''} style={{ width: '12px', height: '12px' }} />
            Randomize
          </button>
          
          <button
            onClick={onManageSources}
            className="btn-sources"
            style={{
              background: 'var(--color-surface-elevated)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-border)',
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              fontWeight: 'var(--weight-medium)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)'
            }}
          >
            Sources
          </button>
        </div>
      </div>

      {/* Filters Form */}
      <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', background: 'var(--color-background)' }}>
        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setCrawlerFilters({ searchQuery: e.target.value })}
            placeholder="Search entries..."
            style={{
              width: '100%',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3) var(--space-2) 32px',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-sm)',
            }}
          />
        </div>

        {/* Date Ranges */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Calendar size={12} style={{ position: 'absolute', left: 8, top: 10, color: 'var(--color-text-secondary)' }} />
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => setCrawlerFilters({ startDate: e.target.value || null })}
              style={{
                width: '100%',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-2) var(--space-2) 26px',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-xs)',
              }}
            />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Calendar size={12} style={{ position: 'absolute', left: 8, top: 10, color: 'var(--color-text-secondary)' }} />
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => setCrawlerFilters({ endDate: e.target.value || null })}
              style={{
                width: '100%',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-2) var(--space-2) 26px',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-xs)',
              }}
            />
          </div>
        </div>

        {/* Timeframe Presets */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {(['This Week', 'This Month', 'All Time'] as const).map((label) => {
            const presetKey = label === 'This Week' ? 'week' : label === 'This Month' ? 'month' : 'all';
            return (
              <button
                key={label}
                type="button"
                onClick={() => handlePreset(presetKey)}
                style={{
                  flex: 1,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '10px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  fontWeight: 'var(--weight-medium)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Category Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {(['all', 'presence', 'reminiscence', 'uncategorized'] as const).map((cat) => {
            const isActive = cat === 'all' ? category === null : category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCrawlerFilters({ category: cat === 'all' ? null : cat })}
                style={{
                  flex: 1,
                  background: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: isActive ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  padding: 'var(--space-1) 0',
                  cursor: 'pointer',
                  fontWeight: 'var(--weight-semibold)',
                  textTransform: 'capitalize',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Stream Area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 20, 32, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        )}

        {displayedUnits.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No journal entries match. Change filters or import files.
          </div>
        ) : (
          <div
            ref={parentRef}
            style={{
              height: '100%',
              overflow: 'auto',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const tu = displayedUnits[virtualRow.index];
                if (!tu) return null;
                const isMenuOpen = routeMenuOpen === tu.id;

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      padding: 'var(--space-2) var(--space-4)',
                    }}
                  >
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'copy';
                        e.dataTransfer.setData('application/x-thought-unit', JSON.stringify(tu));
                        e.dataTransfer.setData('text/plain', tu.content);
                      }}
                      style={{
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-2)',
                        cursor: 'grab',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={getCategoryBadgeClass(tu.category)}>
                          #{tu.category}
                        </span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                          {tu.date || 'Undated'}
                        </span>
                      </div>

                      {/* Content */}
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 'var(--leading-sm)' }}>
                        {tu.content}
                      </div>

                      {/* Line reference & Routing button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                          Line {tu.sourceLineNumber}
                        </span>
                        
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setRouteMenuOpen(isMenuOpen ? null : tu.id)}
                            style={{
                              background: 'var(--color-surface)',
                              color: 'var(--color-text-primary)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: 'var(--space-1) var(--space-2)',
                              fontSize: 'var(--text-xs)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-1)',
                            }}
                          >
                            <Send size={10} />
                            Route
                            <ChevronDown size={10} />
                          </button>

                          {isMenuOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                bottom: '100%',
                                background: 'var(--color-surface-elevated)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-md)',
                                zIndex: 100,
                                minWidth: '180px',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                marginBottom: 'var(--space-1)'
                              }}
                            >
                              <div style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                Target Draft Tabs
                              </div>
                              {activeTabs.length === 0 ? (
                                <div style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                                  No draft letters open
                                </div>
                              ) : (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px var(--space-3)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedLetters(activeTabs.map((t) => t.letterId))}
                                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                                    >
                                      Select All
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedLetters([])}
                                      style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                                    >
                                      Clear
                                    </button>
                                  </div>
                                  <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                    {activeTabs.map((tab) => {
                                      const isChecked = selectedLetters.includes(tab.letterId);
                                      return (
                                        <label
                                          key={tab.letterId}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                            padding: '6px var(--space-3)',
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--color-text-primary)',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                          }}
                                          onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
                                          onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              setSelectedLetters((prev) =>
                                                isChecked
                                                  ? prev.filter((id) => id !== tab.letterId)
                                                  : [...prev, tab.letterId]
                                              );
                                            }}
                                            style={{ cursor: 'pointer' }}
                                          />
                                          {tab.penpalName}
                                        </label>
                                      );
                                    })}
                                  </div>
                                  <div style={{ padding: 'var(--space-2)', borderTop: '1px solid var(--color-border)', display: 'flex' }}>
                                    <button
                                      type="button"
                                      disabled={selectedLetters.length === 0}
                                      onClick={() => handleRouteMultiple(tu)}
                                      style={{
                                        width: '100%',
                                        background: selectedLetters.length === 0 ? 'var(--color-text-disabled)' : 'var(--color-primary)',
                                        color: selectedLetters.length === 0 ? 'var(--color-text-secondary)' : 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '6px 0',
                                        fontSize: '11px',
                                        fontWeight: 'var(--weight-semibold)',
                                        cursor: selectedLetters.length === 0 ? 'not-allowed' : 'pointer',
                                      }}
                                    >
                                      Confirm Route ({selectedLetters.length})
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

```

### `src/components/JournalSourcesView.tsx`
```tsx
import React, { useEffect, useState } from 'react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { getImportStatus, importJournalFile, removeJournalSource } from '../services/journalService';
import { JournalSource } from '../types';
import { FileText, Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const JournalSourcesView: React.FC = () => {
  const [sources, setSources] = useState<JournalSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const data = await getImportStatus();
      setSources(data);
    } catch (e) {
      console.error('Failed to fetch journal sources:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleImport = async () => {
    setWarnings([]);
    setSuccessMsg(null);
    try {
      const selected = await openDialog({
        title: 'Select Journal Files',
        filters: [{ name: 'Journal Files', extensions: ['md', 'txt'] }],
        multiple: true,
      });

      if (!selected) {
        return; // User cancelled
      }

      // Ensure we have an array of file paths
      const filePaths = Array.isArray(selected) ? selected : [selected];
      if (filePaths.length === 0) return;

      setLoading(true);
      let totalEntries = 0;
      const allWarnings: string[] = [];
      let importedCount = 0;

      for (const filePath of filePaths) {
        try {
          const res = await importJournalFile(filePath);
          totalEntries += res.entryCount;
          const fileName = filePath.split(/[/\\]/).pop() || 'File';
          
          if (res.entryCount === 0) {
            allWarnings.push(`${fileName} imported but no entries found`);
          }
          if (res.warnings && res.warnings.length > 0) {
            allWarnings.push(...res.warnings.map(w => `[${fileName}] ${w}`));
          }
          importedCount++;
        } catch (err: any) {
          const fileName = filePath.split(/[/\\]/).pop() || 'File';
          allWarnings.push(`Failed to import ${fileName}: ${err.message || err}`);
        }
      }

      if (importedCount > 0) {
        if (totalEntries === 0) {
          setSuccessMsg(null);
        } else {
          setSuccessMsg(`Successfully imported ${totalEntries} entries from ${importedCount} file(s)!`);
        }
      }

      if (allWarnings.length > 0) {
        setWarnings(allWarnings);
      }

      fetchSources();
    } catch (err: any) {
      alert(`Import error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReimport = async (filePath: string) => {
    setWarnings([]);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await importJournalFile(filePath);
      const fileName = filePath.split(/[/\\]/).pop() || 'File';
      
      if (res.entryCount === 0) {
        setSuccessMsg(null);
        const warnList = [`${fileName} imported but no entries found`];
        if (res.warnings && res.warnings.length > 0) {
          warnList.push(...res.warnings);
        }
        setWarnings(warnList);
      } else {
        setSuccessMsg(`Successfully re-imported ${res.entryCount} entries!`);
        if (res.warnings && res.warnings.length > 0) {
          setWarnings(res.warnings);
        }
      }
      fetchSources();
    } catch (err: any) {
      alert(`Re-import error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (filePath: string) => {
    if (!confirm('Are you sure you want to remove this source? All associated thought-units will be deleted.')) {
      return;
    }
    setWarnings([]);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await removeJournalSource(filePath);
      setSuccessMsg('Source removed successfully.');
      fetchSources();
    } catch (err: any) {
      alert(`Removal error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)', color: 'var(--color-text-primary)' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>Journal Sources</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
            Import your stream-of-consciousness Markdown or Text files.
          </p>
        </div>
        <button
          onClick={handleImport}
          style={{
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
        >
          <Plus size={16} />
          Import File
        </button>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div
          style={{
            background: 'rgba(81, 207, 102, 0.15)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--color-success)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* Warnings Panel */}
      {warnings.length > 0 && (
        <div
          style={{
            background: 'rgba(255, 212, 59, 0.12)',
            border: '1px solid var(--color-warning)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            color: 'var(--color-warning)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>
            <AlertTriangle size={16} />
            Import Warnings
          </div>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Table grid */}
      <div style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading && sources.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--color-primary)', margin: '0 auto' }} />
          </div>
        ) : sources.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <FileText size={48} style={{ margin: '0 auto var(--space-4)', opacity: 0.3 }} />
            No journal source files imported yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-semibold)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>File Details</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Format</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Entries</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Last Modified</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-4)' }}>
                    <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>{s.fileName}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '2px', wordBreak: 'break-all' }}>{s.filePath}</div>
                  </td>
                  <td style={{ padding: 'var(--space-4)', color: 'var(--color-text-primary)' }}>
                    Format {s.formatVersion}
                  </td>
                  <td style={{ padding: 'var(--space-4)', fontWeight: 'var(--weight-medium)', color: 'var(--color-primary)' }}>
                    {s.entryCount}
                  </td>
                  <td style={{ padding: 'var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                    {new Date(s.lastModified).toLocaleDateString()} {new Date(s.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                      <button
                        title="Re-import File"
                        onClick={() => handleReimport(s.filePath)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          padding: 'var(--space-1)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        title="Remove Source"
                        onClick={() => handleRemove(s.filePath)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          padding: 'var(--space-1)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-error)')}
                        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info card */}
      <div
        style={{
          background: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          marginTop: 'var(--space-6)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'flex-start',
        }}
      >
        <Info size={16} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-sm)' }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Formats Auto-Detection Guide:</strong>
          <ul style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '16px' }}>
            <li>Format 3: Contains <code>#presence</code> or <code>#reminiscence</code> category tags.</li>
            <li>Format 1: Bullet-point journal style (bullet markers like <code>-</code> or <code>*</code>).</li>
            <li>Format 2: Plain paragraphs separated by empty lines under date headers.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

```

### `src/components/LetterEditor.tsx`
```tsx
import React, { useEffect, useState, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { schema } from './blocks/schema';
import { loadLetterContent, saveLetterContent } from '../services/letterService';
import { useAppStore } from '../stores/appStore';
import "@blocknote/mantine/style.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeLegacyBlocks(blocks: any[]): any[] {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((b) => {
    if (!b) return b;
    if (b.type === "routedEntry") {
      const legacyText = b.props?.entryContent || "";
      const contentArray = Array.isArray(b.content) ? b.content : [];
      const content = contentArray.length > 0 ? contentArray : (legacyText ? [{ type: "text", text: legacyText, styles: {} }] : []);
      return {
        ...b,
        props: {
          sourceEntryId: b.props?.sourceEntryId || b.props?.entrySourceFile || "",
          sourceDate:    b.props?.sourceDate || b.props?.entryDate || "",
          category:      b.props?.category || b.props?.entryCategory || "uncategorized",
        },
        content,
      };
    }
    if (b.type === "scaffoldBlock") {
      const legacyTitle = b.props?.sectionLabel || b.props?.title || "Scaffold Section";
      const legacyTimeframe = b.props?.scaffoldId || b.props?.timeframe || "";
      
      const contentArray = Array.isArray(b.content) ? b.content : [];
      const nestedBlocks = contentArray.filter((x: any) => x && typeof x === 'object' && x.type);
      const remainingInline = contentArray.filter((x: any) => !x || typeof x !== 'object' || !x.type);

      const legacyChildren = Array.isArray(b.children) ? b.children : [];
      const mergedChildren = [...legacyChildren, ...nestedBlocks];

      return {
        ...b,
        props: {
          scaffoldId:    legacyTimeframe,
          sectionLabel:  legacyTitle,
          sourceEntryId: b.props?.sourceEntryId || "",
        },
        content: remainingInline,
        children: normalizeLegacyBlocks(mergedChildren),
      };
    }
    if (Array.isArray(b.children)) {
      return { ...b, children: normalizeLegacyBlocks(b.children) };
    }
    return b;
  });
}

interface LetterEditorProps {
  letterId: string;
  onBlocksChange: (blocks: any[]) => void;
  onSaveStateChange: (saving: boolean, message: string) => void;
}

export const LetterEditor: React.FC<LetterEditorProps> = ({
  letterId,
  onBlocksChange,
  onSaveStateChange,
}) => {
  const [initialBlocks, setInitialBlocks] = useState<any[] | null>(null);

  // 1. Fetch initial content on mount
  useEffect(() => {
    const loadContent = async () => {
      try {
        const res = await loadLetterContent(letterId);
        let blocks: any[] = [];
        if (res.blocksJson) {
          try {
            const parsed = JSON.parse(res.blocksJson);
            if (Array.isArray(parsed)) {
              blocks = parsed;
            } else {
              // Convert plain text to paragraph blocks
              blocks = res.blocksJson.split('\n\n').map((p) => ({
                type: 'paragraph',
                content: [{ type: 'text', text: p, styles: {} }],
              }));
            }
          } catch {
            blocks = res.blocksJson.split('\n\n').map((p) => ({
              type: 'paragraph',
              content: [{ type: 'text', text: p, styles: {} }],
            }));
          }
        }
        if (blocks.length === 0) {
          blocks = [{ type: 'paragraph', content: [] }];
        }
        const normalized = normalizeLegacyBlocks(blocks);  // migrate old block shapes
        setInitialBlocks(normalized);
        onBlocksChange(normalized);
      } catch (err) {
        console.error('Failed to load letter content:', err);
        setInitialBlocks([{ type: 'paragraph', content: [] }]);
      }
    };

    loadContent();
  }, [letterId]);

  if (initialBlocks === null) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '150px',
          color: 'var(--color-text-secondary)',
        }}
      >
        Loading letter content...
      </div>
    );
  }

  return (
    <ActualBlockEditor
      letterId={letterId}
      initialBlocks={initialBlocks}
      onBlocksChange={onBlocksChange}
      onSaveStateChange={onSaveStateChange}
    />
  );
};

interface ActualBlockEditorProps {
  letterId: string;
  initialBlocks: any[];
  onBlocksChange: (blocks: any[]) => void;
  onSaveStateChange: (saving: boolean, message: string) => void;
}

const ActualBlockEditor: React.FC<ActualBlockEditorProps> = ({
  letterId,
  initialBlocks,
  onBlocksChange,
  onSaveStateChange,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  const editor = useCreateBlockNote({
    schema,
    initialContent: initialBlocks,
  });

  const { routingQueue, removeFromRoutingQueue } = useAppStore();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 2. Consume routing queue items for this specific active letter tab
  useEffect(() => {
    const myQueueItems = routingQueue.filter((item) => item.targetLetterId === letterId);
    if (myQueueItems.length === 0) return;

    editor.transact(() => {
      myQueueItems.forEach((item) => {
        const blockToInsert: any = {
          type: item.blockType || "routedEntry",
          props: item.blockType === "scaffoldBlock" ? {
            scaffoldId:     item.scaffoldId || "",
            sectionLabel:   item.sectionLabel || "Scaffold Section",
            sourceEntryId:  item.sourceThoughtUnit.id,
          } : {
            sourceEntryId: item.sourceThoughtUnit.id,
            sourceDate:    item.sourceThoughtUnit.date ?? "",
            category:      item.sourceThoughtUnit.category,
          },
          content: item.blockType === "scaffoldBlock" ? [] : [{
            type: "text",
            text: item.sourceThoughtUnit.content,
            styles: {},
          }],
          ...(item.blockType === "scaffoldBlock" ? {
            children: [{
              type: "routedEntry",
              props: {
                sourceEntryId: item.sourceThoughtUnit.id,
                sourceDate:    item.sourceThoughtUnit.date ?? "",
                category:      item.sourceThoughtUnit.category,
              },
              content: [{
                type: "text",
                text: item.sourceThoughtUnit.content,
                styles: {},
              }]
            }]
          } : {}),
        };

        const lastBlock = editor.document[editor.document.length - 1];
        if (lastBlock) {
          editor.insertBlocks([blockToInsert], lastBlock, "after");
        } else {
          const firstBlock = editor.document[0];
          if (firstBlock) {
            editor.insertBlocks([blockToInsert], firstBlock, "before");
          }
        }
      });
    });

    // Save immediately since content is routed in
    const updatedContent = JSON.stringify(editor.document);
    saveLetterContent(letterId, updatedContent).catch(console.error);
    onBlocksChange(editor.document);

    // Remove from store routing queue
    myQueueItems.forEach((item) => {
      removeFromRoutingQueue(item.id);
    });
  }, [routingQueue, letterId, editor]);

  // 3. Debounced Auto-save (3 seconds) + OnChange notify
  const handleEditorChange = () => {
    onBlocksChange(editor.document);
    onSaveStateChange(true, 'Typing...');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const content = JSON.stringify(editor.document);
        await saveLetterContent(letterId, content);
        onSaveStateChange(false, `Saved at ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        console.error('Auto-save failed:', err);
        onSaveStateChange(false, 'Save failed — retrying...');
      }
    }, 3000);
  };

  // 3.5. Register standard editor change listener
  useEffect(() => {
    if (!editor) return;
    const unsub = editor.onChange(() => {
      handleEditorChange();
    });
    return () => {
      unsub?.();
    };
  }, [editor]);

  // 4. Flush-on-deactivate / FLUSH-BEFORE-UNMOUNT cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Immediate database write during unmount to ensure 0 data loss
      const finalContent = JSON.stringify(editor.document);
      saveLetterContent(letterId, finalContent).catch(console.error);
    };
  }, [letterId, editor]);

  // 5. Ctrl+S / Cmd+S manual force-save handler
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        onSaveStateChange(true, 'Saving...');
        try {
          const content = JSON.stringify(editor.document);
          await saveLetterContent(letterId, content);
          onSaveStateChange(false, `Saved at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
          console.error('Manual save failed:', err);
          onSaveStateChange(false, 'Save failed — retrying...');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [letterId, editor, onSaveStateChange]);

  const onDrop = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData('application/x-thought-unit');
    if (!raw || !editor) return;
    e.preventDefault();
    try {
      const u = JSON.parse(raw);
      const blockToInsert: any = {
        type: "routedEntry",
        props: {
          sourceEntryId: u.id,
          sourceDate:    u.date ?? "",
          category:      u.category,
        },
        content: [{
          type: "text",
          text: u.content,
          styles: {},
        }]
      };
      
      const lastBlock = editor.document[editor.document.length - 1];
      if (lastBlock) {
        editor.insertBlocks([blockToInsert], lastBlock, "after");
      } else {
        const firstBlock = editor.document[0];
        if (firstBlock) {
          editor.insertBlocks([blockToInsert], firstBlock, "before");
        }
      }
    } catch (err) {
      console.error("Drop parse failed:", err);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-thought-unit')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: 0,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-base)',
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--space-4)' }}>
        <BlockNoteView
          editor={editor}
          theme={isDarkMode ? "dark" : "light"}
        />
      </div>
    </div>
  );
};

```

### `src/components/PenpalPanel.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { createPenpal, updatePenpal, addCorrespondence, getCorrespondence } from '../services/penpalService';
import { Penpal, Correspondence } from '../types';
import { UserPlus, Edit, Mail, Send, Calendar, Globe, Tag, BookOpen, ChevronLeft, Save } from 'lucide-react';

export const PenpalPanel: React.FC = () => {
  const { penpals, loadPenpals, openNewLetter } = useAppStore();

  const [selectedPenpalId, setSelectedPenpalId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  
  // Form States
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [interests, setInterests] = useState('');
  const [topics, setTopics] = useState('');
  const [notes, setNotes] = useState('');

  // Correspondence States
  const [correspondenceList, setCorrespondenceList] = useState<Correspondence[]>([]);
  const [showAddCorr, setShowAddCorr] = useState(false);
  const [corrDirection, setCorrDirection] = useState<'sent' | 'received'>('received');
  const [corrContent, setCorrContent] = useState('');
  const [corrDate, setCorrDate] = useState('');

  // Load penpals on mount
  useEffect(() => {
    loadPenpals();
  }, []);

  const selectedPenpal = penpals.find((p) => p.id === selectedPenpalId);

  // Load correspondence whenever a penpal is selected/opened
  useEffect(() => {
    if (selectedPenpalId) {
      fetchCorrespondence(selectedPenpalId);
    }
  }, [selectedPenpalId]);

  const fetchCorrespondence = async (id: string) => {
    try {
      const data = await getCorrespondence(id);
      setCorrespondenceList(data);
    } catch (e) {
      console.error('Failed to fetch correspondence:', e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Name is required');

    try {
      const newPenpal = await createPenpal(name, country, interests, topics, notes);
      await loadPenpals();
      setSelectedPenpalId(newPenpal.id);
      setViewMode('detail');
      resetForm();
    } catch (err: any) {
      alert(`Error creating penpal: ${err}`);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPenpalId || !name.trim()) return;

    try {
      await updatePenpal(selectedPenpalId, name, country, interests, topics, notes);
      await loadPenpals();
      setViewMode('detail');
      resetForm();
    } catch (err: any) {
      alert(`Error updating penpal: ${err}`);
    }
  };

  const handleAddCorrespondenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPenpalId || !corrContent.trim() || !corrDate) {
      return alert('Content and Letter Date are required.');
    }

    try {
      await addCorrespondence(selectedPenpalId, corrDirection, corrContent, corrDate);
      setCorrContent('');
      setCorrDate('');
      setShowAddCorr(false);
      fetchCorrespondence(selectedPenpalId);
    } catch (err: any) {
      alert(`Error logging letter: ${err}`);
    }
  };

  const startEdit = (penpal: Penpal) => {
    setName(penpal.name);
    setCountry(penpal.country);
    setInterests(penpal.interests);
    setTopics(penpal.topics);
    setNotes(penpal.notes);
    setViewMode('edit');
  };

  const resetForm = () => {
    setName('');
    setCountry('');
    setInterests('');
    setTopics('');
    setNotes('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Panel Header */}
      <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>Penpal Workspace</h2>
      </div>

      {/* Main Workspace Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
        {viewMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <button
              onClick={() => {
                resetForm();
                setViewMode('create');
              }}
              style={{
                width: '100%',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semibold)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
            >
              <UserPlus size={16} />
              Add New Penpal
            </button>

            {/* List View */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {penpals.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 'var(--space-8)' }}>
                  No penpals added yet.
                </div>
              ) : (
                penpals.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPenpalId(p.id);
                      setViewMode('detail');
                    }}
                    style={{
                      background: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      cursor: 'pointer',
                      transition: 'border var(--transition-fast)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>{p.name}</div>
                      {p.letterCount !== undefined && p.letterCount > 0 && (
                        <span style={{ fontSize: '10px', background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '1px 6px', fontWeight: 'var(--weight-semibold)' }}>
                          {p.letterCount} letter{p.letterCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Globe size={10} />
                        {p.country || 'No Country'}
                      </div>
                      {p.lastLetterDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px' }}>
                          <Calendar size={10} />
                          {p.lastLetterDate}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Create Profile Form */}
        {(viewMode === 'create' || viewMode === 'edit') && (
          <form onSubmit={viewMode === 'create' ? handleCreate : handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'create' ? 'list' : 'detail')}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <ChevronLeft size={16} />
              </button>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)' }}>
                {viewMode === 'create' ? 'Create Penpal Profile' : 'Edit Penpal Profile'}
              </h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 'var(--weight-semibold)' }}>NAME *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Penpal's Name"
                required
                style={{
                  width: '100%',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 'var(--weight-semibold)' }}>COUNTRY</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country Location"
                style={{
                  width: '100%',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 'var(--weight-semibold)' }}>INTERESTS</label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. Reading, Hiking, Cooking"
                style={{
                  width: '100%',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 'var(--weight-semibold)' }}>TOPICS</label>
              <input
                type="text"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="Topics to write about..."
                style={{
                  width: '100%',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 'var(--weight-semibold)' }}>NOTES</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Personal notes, biography details, past discussions..."
                rows={4}
                style={{
                  width: '100%',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-sm)',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semibold)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                marginTop: 'var(--space-2)',
              }}
            >
              <Save size={16} />
              {viewMode === 'create' ? 'Save Profile' : 'Update Profile'}
            </button>
          </form>
        )}

        {/* Profile Detail View */}
        {viewMode === 'detail' && selectedPenpal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Navigation back and edit buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: 'var(--text-xs)',
                  padding: 0,
                }}
              >
                <ChevronLeft size={14} />
                Penpals List
              </button>

              <button
                onClick={() => startEdit(selectedPenpal)}
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-xs)',
                  padding: 'var(--space-1) var(--space-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Edit size={10} />
                Edit Profile
              </button>
            </div>

            {/* Profile Summary Card */}
            <div style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>{selectedPenpal.name}</h3>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '6px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Globe size={12} />
                    {selectedPenpal.country || 'No Country Registered'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={12} />
                    {selectedPenpal.letterCount || 0} letter{(selectedPenpal.letterCount || 0) !== 1 ? 's' : ''}
                  </div>
                  {selectedPenpal.lastLetterDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      Last: {selectedPenpal.lastLetterDate}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={async () => {
                  try {
                    await openNewLetter(selectedPenpal.id);
                  } catch (e: any) {
                    alert(`Failed to open letter draft: ${e.message || e}`);
                  }
                }}
                style={{
                  width: '100%',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-semibold)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
              >
                <Mail size={16} />
                Write Letter Draft
              </button>
            </div>

            {/* Structured details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={10} />
                  Interests
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', paddingLeft: '14px' }}>
                  {selectedPenpal.interests || 'None specified'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <BookOpen size={10} />
                  Discussable Topics
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', paddingLeft: '14px' }}>
                  {selectedPenpal.topics || 'None specified'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Globe size={10} />
                  Notes & Bio
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', paddingLeft: '14px', whiteSpace: 'pre-wrap' }}>
                  {selectedPenpal.notes || 'No biographical notes recorded.'}
                </div>
              </div>
            </div>

            {/* Correspondence Section */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>Letters Archive</h4>
                <button
                  onClick={() => setShowAddCorr(!showAddCorr)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--weight-semibold)',
                    padding: 0,
                  }}
                >
                  {showAddCorr ? 'Cancel' : 'Log Past Letter'}
                </button>
              </div>

              {/* Log Correspondence Form */}
              {showAddCorr && (
                <form onSubmit={handleAddCorrespondenceSubmit} style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      onClick={() => setCorrDirection('received')}
                      style={{
                        flex: 1,
                        background: corrDirection === 'received' ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: corrDirection === 'received' ? 'white' : 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 0',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--weight-semibold)',
                        cursor: 'pointer',
                      }}
                    >
                      Received
                    </button>
                    <button
                      type="button"
                      onClick={() => setCorrDirection('sent')}
                      style={{
                        flex: 1,
                        background: corrDirection === 'sent' ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: corrDirection === 'sent' ? 'white' : 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 0',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--weight-semibold)',
                        cursor: 'pointer',
                      }}
                    >
                      Sent
                    </button>
                  </div>

                  <div>
                    <input
                      type="date"
                      value={corrDate}
                      onChange={(e) => setCorrDate(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        color: 'var(--color-text-primary)',
                        fontSize: 'var(--text-xs)',
                      }}
                    />
                  </div>

                  <div>
                    <textarea
                      value={corrContent}
                      onChange={(e) => setCorrContent(e.target.value)}
                      placeholder="Letter content (plain text)"
                      rows={3}
                      required
                      style={{
                        width: '100%',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        color: 'var(--color-text-primary)',
                        fontSize: 'var(--text-xs)',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      background: 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-1) 0',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--weight-semibold)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Send size={10} />
                    Log Record
                  </button>
                </form>
              )}

              {/* Correspondence history list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {correspondenceList.length === 0 ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: 'var(--space-4)' }}>
                    No recorded correspondence.
                  </div>
                ) : (
                  correspondenceList.map((c) => (
                    <div key={c.id} style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                        <span
                          style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 'var(--weight-bold)',
                            color: c.direction === 'sent' ? 'var(--color-primary)' : 'var(--color-success)',
                          }}
                        >
                          {c.direction === 'sent' ? 'Sent Letter' : 'Received Letter'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Calendar size={10} />
                          {c.letterDate}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 'var(--leading-sm)' }}>
                        {c.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

```

### `src/components/ScaffoldModal.tsx`
```tsx
import React, { useState, useMemo, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { getThoughtUnits } from '../services/journalService';
import { loadLetterContent } from '../services/letterService';
import { ThoughtUnit } from '../types';
import { X, Calendar, Sparkles, Check } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ScaffoldModalProps {
  onClose: () => void;
}

export const ScaffoldModal: React.FC<ScaffoldModalProps> = ({ onClose }) => {
  const { penpals, openLetters, openNewLetter, addToRoutingQueue } = useAppStore();

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [entries, setEntries] = useState<ThoughtUnit[]>([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [selectedPenpalIds, setSelectedPenpalIds] = useState<Set<string>>(new Set());
  const [fetched, setFetched] = useState<boolean>(false);

  // Timeframe Presets
  const handlePreset = (preset: 'week' | 'month') => {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'week') {
      const start = new Date(today);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(start.setDate(diff));
      setStartDate(formatDate(monday));
      setEndDate(formatDate(today));
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(today));
    }
  };

  // Fetch entries
  const handleFetch = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }
    setLoading(true);
    setFetched(true);
    try {
      const data = await getThoughtUnits(startDate, endDate, null);
      setEntries(data);
      // Auto-select all fetched entries
      setSelectedEntryIds(new Set(data.map((tu) => tu.id)));
    } catch (e) {
      console.error('Failed to fetch entries for scaffold:', e);
      alert('Failed to load journal entries.');
    } finally {
      setLoading(false);
    }
  };

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: Record<string, ThoughtUnit[]> = {};
    entries.forEach((tu) => {
      const date = tu.date || 'Undated';
      if (!groups[date]) groups[date] = [];
      groups[date].push(tu);
    });
    // Sort dates in ascending order
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((date) => ({
        date,
        items: groups[date] || [],
      }));
  }, [entries]);

  const parentRef = useRef<HTMLDivElement>(null);

  const flatList = useMemo(() => {
    const list: Array<{
      type: 'header' | 'item';
      id: string;
      date?: string;
      item?: ThoughtUnit;
      items?: ThoughtUnit[];
    }> = [];

    groupedEntries.forEach((group) => {
      list.push({
        type: 'header',
        id: `header-${group.date}`,
        date: group.date,
        items: group.items,
      });
      group.items.forEach((item) => {
        list.push({
          type: 'item',
          id: item.id,
          item,
        });
      });
    });

    return list;
  }, [groupedEntries]);

  const rowVirtualizer = useVirtualizer({
    count: flatList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flatList[index];
      if (!item) return 0;
      if (item.type === 'header') return 36;
      const contentLength = item.item?.content?.length || 0;
      if (contentLength > 150) return 120;
      if (contentLength > 80) return 96;
      return 78;
    },
    overscan: 10,
  });

  // Toggle entry selection
  const handleToggleEntry = (id: string) => {
    const next = new Set(selectedEntryIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedEntryIds(next);
  };

  // Toggle all entries for a date
  const handleToggleDate = (items: ThoughtUnit[]) => {
    const next = new Set(selectedEntryIds);
    const itemIds = items.map((i) => i.id);
    const allSelected = itemIds.every((id) => next.has(id));

    if (allSelected) {
      itemIds.forEach((id) => next.delete(id));
    } else {
      itemIds.forEach((id) => next.add(id));
    }
    setSelectedEntryIds(next);
  };

  // Toggle penpal selection
  const handleTogglePenpal = (id: string) => {
    const next = new Set(selectedPenpalIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPenpalIds(next);
  };

  // Push scaffold to selected penpals
  const handlePush = async () => {
    if (selectedPenpalIds.size === 0) {
      alert('Please select at least one penpal.');
      return;
    }
    if (selectedEntryIds.size === 0) {
      alert('Please select at least one entry.');
      return;
    }

    const pushList = entries.filter((e) => selectedEntryIds.has(e.id));
    const scaffoldId = crypto.randomUUID();
    const errors: string[] = [];

    // 1. Process target penpals one by one
    for (const penpalId of selectedPenpalIds) {
      const penpal = penpals.find((p) => p.id === penpalId);
      const penpalName = penpal ? penpal.name : 'Penpal';

      try {
        // Ensure a letter tab exists (either active in store, or open/create draft)
        let tab = openLetters.find((l) => l.penpalId === penpalId);
        let letterId: string;
        if (!tab) {
          // Create new letter draft
          letterId = await openNewLetter(penpalId);
        } else {
          letterId = tab.letterId;
        }

        // 2. Perform duplicate checking against the letter's SQLite contents
        try {
          const currentContent = await loadLetterContent(letterId);
          const existingEntryIds = new Set<string>();

          if (currentContent && currentContent.blocksJson) {
            try {
              const blocks = JSON.parse(currentContent.blocksJson);
              if (Array.isArray(blocks)) {
                blocks.forEach((b: any) => {
                  if ((b.type === 'scaffoldBlock' || b.type === 'routedEntry') && b.props?.sourceEntryId) {
                    existingEntryIds.add(b.props.sourceEntryId);
                  }
                });
              }
            } catch (parseErr) {
              console.warn(`[Scaffold Curation] Failed to parse blocksJson for duplicate detection. Proceeding as if empty:`, parseErr);
            }
          }

          // Check if any push item is already inside the letter
          const duplicates = pushList.filter((item) => existingEntryIds.has(item.id));
          if (duplicates.length > 0) {
            const proceed = confirm(
              `Duplicate Guard Alert!\n\n${duplicates.length} of the selected entries have already been pushed or routed to ${penpalName}'s letter.\n\nDo you want to push anyway (this will result in duplicate sections)?`
            );
            if (!proceed) {
              continue; // Skip this penpal or cancel
            }
          }
        } catch (err) {
          console.error('Duplicate checking failed:', err);
        }

        // 3. Queue scaffold blocks via routing queue
        // Scaffold sections are grouped by date, so we will assign section labels matching their dates!
        pushList.forEach((entry) => {
          try {
            addToRoutingQueue({
              id: crypto.randomUUID(),
              sourceThoughtUnit: entry,
              targetLetterId: letterId,
              insertPosition: 'end',
              timestamp: Date.now(),
              blockType: 'scaffoldBlock',
              scaffoldId,
              sectionLabel: entry.date || 'Scaffold Section',
            });
          } catch (queueErr: any) {
            console.error(`Failed to enqueue item for ${penpalName}:`, queueErr);
            throw new Error(`Queue addition failed: ${queueErr.message || queueErr}`);
          }
        });
      } catch (err: any) {
        console.error(`Failed to push scaffold for ${penpalName}:`, err);
        errors.push(`Failed for ${penpalName}: ${err.message || err}`);
      }
    }

    if (errors.length > 0) {
      alert(`Scaffold processing completed with errors:\n\n${errors.join('\n')}`);
    } else {
      alert('Scaffold successfully generated and pushed to drafts!');
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 10, 16, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          width: '90%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Sparkles size={18} style={{ color: 'var(--color-success, #10b981)' }} />
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
              Generate Structured Scaffold
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ flex: 1, padding: 'var(--space-5)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Step 1: Select Timeframe */}
          <div>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              1. Select Timeframe
            </h4>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Calendar size={14} style={{ color: 'var(--color-text-secondary)' }} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--text-xs)',
                  }}
                />
                <span style={{ color: 'var(--color-text-secondary)' }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--text-xs)',
                  }}
                />
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handlePreset('week')}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '10px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('month')}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '10px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  This Month
                </button>
              </div>

              <button
                onClick={handleFetch}
                disabled={loading}
                style={{
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-4)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-semibold)',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                {loading ? 'Fetching...' : 'Fetch Journal Entries'}
              </button>
            </div>
          </div>

          {/* Columns for Preview and Penpals */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', flex: 1, minHeight: '300px' }}>
            {/* Step 2: Curation checklist */}
            <div
              style={{
                flex: 2,
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: 'var(--space-3)',
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-surface-elevated)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--color-text-primary)',
                }}
              >
                2. Curate Scaffold Thoughts ({selectedEntryIds.size} selected)
              </div>
              <div
                ref={parentRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 'var(--space-3)',
                }}
              >
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading entries...</div>
                ) : !fetched ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                    Select a date range and click <strong>Fetch Journal Entries</strong> above to load thoughts.
                  </div>
                ) : entries.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                    No journal entries found for this timeframe. Try a different range.
                  </div>
                ) : (
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const item = flatList[virtualRow.index];
                      if (!item) return null;
                      if (item.type === 'header') {
                        const groupIds = item.items!.map((i) => i.id);
                        const allSelectedInGroup = groupIds.every((id) => selectedEntryIds.has(id));
                        return (
                          <div
                            key={virtualRow.key}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                              padding: '2px 0',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 'var(--weight-semibold)',
                                color: 'var(--color-primary)',
                                fontSize: 'var(--text-xs)',
                                borderBottom: '1px solid var(--color-border)',
                                paddingBottom: '4px',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={allSelectedInGroup}
                                onChange={() => handleToggleDate(item.items!)}
                                style={{ cursor: 'pointer' }}
                              />
                              <span>{item.date}</span>
                              <span style={{ fontSize: '10px', background: 'rgba(2, 132, 199, 0.1)', padding: '0 4px', borderRadius: 'var(--radius-sm)' }}>
                                {item.items!.length} entry{item.items!.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        );
                      } else {
                        const tu = item.item!;
                        return (
                          <div
                            key={virtualRow.key}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                              padding: '3px 0',
                            }}
                          >
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                padding: 'var(--space-2)',
                                background: 'var(--color-surface-elevated)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-text-primary)',
                                height: '100%',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedEntryIds.has(tu.id)}
                                onChange={() => handleToggleEntry(tu.id)}
                                style={{ marginTop: '2px', cursor: 'pointer' }}
                              />
                              <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '2px', flexShrink: 0 }}>
                                  <span style={{ fontSize: '9px', textTransform: 'uppercase', padding: '0 4px', borderRadius: 'var(--radius-sm)', background: tu.category === 'presence' ? 'rgba(34,197,94,0.1)' : tu.category === 'reminiscence' ? 'rgba(139,92,246,0.1)' : 'rgba(100,116,139,0.1)', color: tu.category === 'presence' ? '#10b981' : tu.category === 'reminiscence' ? '#8b5cf6' : '#64748b' }}>
                                    #{tu.category}
                                  </span>
                                  <span style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>Line {tu.sourceLineNumber}</span>
                                </div>
                                <div style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: '1.4', overflowY: 'auto' }}>{tu.content}</div>
                              </div>
                            </label>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Select Penpals */}
            <div
              style={{
                flex: 1,
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: 'var(--space-3)',
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-surface-elevated)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--color-text-primary)',
                }}
              >
                3. Select Target Penpals ({selectedPenpalIds.size} selected)
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {penpals.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                    No penpals added yet. Go to Penpal Panel to add one!
                  </div>
                ) : (
                  penpals.map((p) => (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px var(--space-3)',
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPenpalIds.has(p.id)}
                        onChange={() => handleTogglePenpal(p.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'var(--weight-semibold)' }}>{p.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{p.country || 'No Country'}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-4)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePush}
            disabled={selectedEntryIds.size === 0 || selectedPenpalIds.size === 0}
            style={{
              background: 'var(--color-success, #10b981)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-4)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-semibold)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: selectedEntryIds.size === 0 || selectedPenpalIds.size === 0 ? 0.5 : 1,
            }}
          >
            <Check size={14} />
            Push Structured Scaffold
          </button>
        </div>
      </div>
    </div>
  );
};

```

### `src/components/WorkspacePanel.tsx`
```tsx
import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { JournalSourcesView } from './JournalSourcesView';
import { LetterEditor } from './LetterEditor';
import { ScaffoldModal } from './ScaffoldModal';
import { markLetterSent, saveLetterContent } from '../services/letterService';
import { addCorrespondence } from '../services/penpalService';
import { serializeToPlainText } from '../utils/serialization';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { X, FileText, Mail, Check, Copy, Sparkles } from 'lucide-react';

interface WorkspacePanelProps {
  showSources: boolean;
  onCloseSources: () => void;
  onOpenSources: () => void;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  showSources,
  onCloseSources,
  onOpenSources,
}) => {
  const { openLetters, activeLetterIdx, closeLetterTab, penpals } = useAppStore();

  const [saving, setSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  const [showScaffoldModal, setShowScaffoldModal] = useState<boolean>(false);

  // Lazy tab mounting state: contains at most 3 letterIds currently alive in DOM
  const [aliveLetterIds, setAliveLetterIds] = useState<string[]>([]);
  
  // Keep track of blocks in the active editor instances (to serialize/copy without re-renders)
  const activeBlocksMapRef = useRef<Record<string, any[]>>({});

  const activeLetter = activeLetterIdx >= 0 && activeLetterIdx < openLetters.length ? openLetters[activeLetterIdx] : null;

  // 1. Maintain MRU list of alive letter tabs (maximum 3 in DOM at once)
  useEffect(() => {
    if (!activeLetter) return;

    setAliveLetterIds((prev) => {
      const openIds = openLetters.map((l) => l.letterId);
      const filteredPrev = prev.filter((id) => openIds.includes(id));

      if (filteredPrev[0] === activeLetter.letterId) {
        return filteredPrev;
      }

      const next = [
        activeLetter.letterId,
        ...filteredPrev.filter((id) => id !== activeLetter.letterId),
      ];

      return next.slice(0, 3);
    });

    onCloseSources(); // Hide sources if we switched to a draft letter tab
  }, [activeLetter, openLetters]);

  // 1.5. Tauri Window Close Interceptor: flush all dirty active letters before closing
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupCloseInterceptor = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        
        unlisten = await win.onCloseRequested(async (event) => {
          // Prevent standard abrupt close
          event.preventDefault();
          setSaving(true);
          
          try {
            // Save all letters that have active editor content in memory
            const savePromises = openLetters.map(async (tab) => {
              const blocks = activeBlocksMapRef.current[tab.letterId];
              if (blocks && Array.isArray(blocks)) {
                const content = JSON.stringify(blocks);
                await saveLetterContent(tab.letterId, content);
              }
            });
            
            await Promise.all(savePromises);
          } catch (err) {
            console.error('Failed to flush letters on close:', err);
          }
          
          // Once flushed, destroy the window to terminate
          await win.destroy();
        });
      } catch (err) {
        console.error('Failed to bind window close interceptor:', err);
      }
    };

    setupCloseInterceptor();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [openLetters]);

  // 2. Clipboard copy action (stripping markdown metadata/badges)
  const handleCopyToClipboard = async () => {
    if (!activeLetter) return;
    const blocks = activeBlocksMapRef.current[activeLetter.letterId] || [];
    const plainText = serializeToPlainText(blocks);

    if (!plainText.trim()) {
      alert('Letter is empty. Add some content first.');
      return;
    }

    try {
      await writeText(plainText);
      alert('Letter copied to clipboard successfully!');
    } catch (err) {
      console.error('Failed to copy text:', err);
      alert('Failed to copy to clipboard.');
    }
  };

  // 3. Archive & Mark as sent action (with non-empty validation)
  const handleMarkSent = async () => {
    if (!activeLetter) return;
    const penpal = penpals.find((p) => p.id === activeLetter.penpalId);
    const penpalName = penpal ? penpal.name : 'Penpal';

    const blocks = activeBlocksMapRef.current[activeLetter.letterId] || [];
    const plainText = serializeToPlainText(blocks);

    if (!plainText.trim()) {
      alert('Cannot mark an empty letter as sent. Add some content first.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to mark this letter to ${penpalName} as SENT? This will archive it in your correspondence history and close the tab.`
      )
    ) {
      return;
    }

    try {
      // 1. Archive sent content to correspondence table
      await addCorrespondence(
        activeLetter.penpalId,
        'sent',
        plainText,
        new Date().toISOString().split('T')[0] || ''
      );

      // 2. Mark draft status as sent in database
      await markLetterSent(activeLetter.letterId);

      // 3. Close the letter workspace tab
      closeLetterTab(activeLetter.letterId);
      alert('Letter successfully archived and closed!');
    } catch (err: any) {
      alert(`Failed to mark letter as sent: ${err}`);
    }
  };

  // Get matching penpal name for active letter tab
  const getPenpalName = (penpalId: string) => {
    const penpal = penpals.find((p) => p.id === penpalId);
    return penpal ? penpal.name : 'Unknown';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-background)' }}>
      {/* Workspace Tabs Header Bar */}
      <div
        style={{
          display: 'flex',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {/* Special Journal Sources Tab */}
        <button
          onClick={onOpenSources}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            background: showSources ? 'var(--color-background)' : 'var(--color-surface)',
            color: showSources ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            border: 'none',
            borderRight: '1px solid var(--color-border)',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)',
            borderTop: showSources ? '2px solid var(--color-primary)' : 'none',
            flexShrink: 0,
          }}
        >
          <FileText size={14} />
          Journal Sources
        </button>

        {/* Dynamic Letter Tabs */}
        {openLetters.map((tab, idx) => {
          const isActive = !showSources && idx === activeLetterIdx;
          return (
            <div
              key={tab.letterId}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: isActive ? 'var(--color-background)' : 'var(--color-surface)',
                borderRight: '1px solid var(--color-border)',
                borderTop: isActive ? '2px solid var(--color-primary)' : 'none',
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => {
                  onCloseSources();
                  useAppStore.setState({ activeLetterIdx: idx });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3) 8px var(--space-3) var(--space-4)',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-medium)',
                }}
              >
                <Mail size={14} style={{ color: isActive ? 'var(--color-primary)' : 'inherit' }} />
                Letter to {getPenpalName(tab.penpalId)}
              </button>
              <button
                onClick={() => closeLetterTab(tab.letterId)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  marginRight: '8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-error)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        {/* Create Scaffold Modal Action Button */}
        <button
          onClick={() => setShowScaffoldModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            border: 'none',
            borderLeft: '1px solid var(--color-border)',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)',
            marginLeft: 'auto',
            flexShrink: 0,
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-success, #10b981)')}
          onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        >
          <Sparkles size={14} style={{ color: '#10b981' }} />
          Create Scaffold
        </button>
      </div>

      {/* Main Workspace Body Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {showSources ? (
          <JournalSourcesView />
        ) : activeLetter ? (
          <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%' }}>
            {/* Metadata Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
                  Drafting Letter for {getPenpalName(activeLetter.penpalId)}
                </h2>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  {lastSaved} {saving && ' • Auto-saving...'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  onClick={handleCopyToClipboard}
                  style={{
                    background: 'var(--color-surface-elevated)',
                    color: 'var(--color-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2) var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-semibold)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <Copy size={16} />
                  Copy Letter
                </button>

                <button
                  onClick={handleMarkSent}
                  style={{
                    background: 'var(--color-success)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2) var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-semibold)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <Check size={16} />
                  Mark as Sent
                </button>
              </div>
            </div>

            {/* Dynamic Editors (Only rendering MRU alive editors, others hidden/unmounted) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {openLetters.map((tab, idx) => {
                const isAlive = aliveLetterIds.includes(tab.letterId);
                if (!isAlive) return null;

                const isActive = !showSources && idx === activeLetterIdx;
                return (
                  <div
                    key={tab.letterId}
                    style={{
                      display: isActive ? 'flex' : 'none',
                      flexDirection: 'column',
                      flex: 1,
                      width: '100%',
                    }}
                  >
                    <LetterEditor
                      letterId={tab.letterId}
                      onBlocksChange={(blocks) => {
                        activeBlocksMapRef.current[tab.letterId] = blocks;
                      }}
                      onSaveStateChange={(savingVal, msg) => {
                        if (isActive) {
                          setSaving(savingVal);
                          setLastSaved(msg);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Welcome screen when workspace is empty */
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <FileText size={64} style={{ marginBottom: 'var(--space-4)', color: 'var(--color-primary)', opacity: 0.8 }} />
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
              Journal-to-Penpal Pipeline
            </h2>
            <p style={{ maxWidth: '400px', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)', lineHeight: 'var(--leading-sm)' }}>
              Start writing by choosing a penpal on the right and clicking <strong>Write Letter</strong>, or manage your <strong>Journal Sources</strong> to scan daily entries.
            </p>
          </div>
        )}
      </div>

      {/* Scaffold Modal Render */}
      {showScaffoldModal && (
        <ScaffoldModal onClose={() => setShowScaffoldModal(false)} />
      )}
    </div>
  );
};

```

### `src/components/blocks/schema.tsx`
```tsx
import { createReactBlockSpec } from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

export const ROUTED_ENTRY_TYPE = "routedEntry" as const;

export const RoutedEntry = createReactBlockSpec(
  {
    type: ROUTED_ENTRY_TYPE,
    propSchema: {
      sourceEntryId: { default: "" },
      sourceDate:    { default: "" },
      category:      { default: "uncategorized",
                       values: ["presence", "reminiscence", "uncategorized"] },
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef }) => {
      const category = block.props.category || "uncategorized";
      const categoryColor =
        category === "presence"
          ? "var(--color-presence, #4ECDC4)"
          : category === "reminiscence"
          ? "var(--color-reminiscence, #FF8A65)"
          : "var(--color-primary, #7C6AEF)";
      const categoryBg =
        category === "presence"
          ? "var(--color-presence-tint, rgba(78, 205, 196, 0.08))"
          : category === "reminiscence"
          ? "var(--color-reminiscence-tint, rgba(255, 138, 101, 0.08))"
          : "var(--color-scaffold-tint, rgba(124, 106, 239, 0.08))";

      return (
        <div
          className="routed-entry-block-container"
          style={{
            borderLeft: `4px solid ${categoryColor}`,
            background: categoryBg,
            padding: "8px 12px",
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            margin: "6px 0",
            width: "100%",
          }}
        >
          <div
            className="provenance-badge"
            contentEditable={false}
            style={{
              fontSize: "10px",
              color: categoryColor,
              fontWeight: "var(--weight-semibold)" as any,
              marginBottom: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              userSelect: "none",
            }}
          >
            {block.props.sourceDate || "Undated"} · #{block.props.category}
          </div>
          <div ref={contentRef} style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)" }} />
        </div>
      );
    },
  },
);

export const ScaffoldBlock = createReactBlockSpec(
  {
    type: "scaffoldBlock",
    propSchema: {
      scaffoldId:    { default: "" },
      sectionLabel:  { default: "" },
      sourceEntryId: { default: "" },
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef }) => {
      const sectionLabel = String(block.props.sectionLabel ?? "Scaffold Section");
      return (
        <div
          className="scaffold-block-container"
          style={{
            borderLeft: "4px solid #10b981",
            background: "rgba(16, 185, 129, 0.08)",
            padding: "8px 12px",
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            margin: "6px 0",
            width: "100%",
          }}
        >
          <div
            className="scaffold-label"
            contentEditable={false}
            style={{
              fontSize: "10px",
              color: "#10b981",
              fontWeight: "var(--weight-semibold)" as any,
              marginBottom: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              userSelect: "none",
            }}
          >
            Scaffold: {sectionLabel}
          </div>
          <div ref={contentRef} style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)" }} />
        </div>
      );
    },
  },
);

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    routedEntry:   RoutedEntry(),
    scaffoldBlock: ScaffoldBlock(),
  },
});

```

### `src/main.tsx`
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

```

### `src/services/journalService.ts`
```ts
import { invoke } from '@tauri-apps/api/core';
import { ThoughtUnit, JournalSource, ImportResult } from '../types';

export async function importJournalFile(filePath: string): Promise<ImportResult> {
  return invoke<ImportResult>('import_journal_file', { filePath });
}

export async function getImportStatus(): Promise<JournalSource[]> {
  return invoke<JournalSource[]>('get_import_status');
}

export async function removeJournalSource(filePath: string): Promise<boolean> {
  return invoke<boolean>('remove_journal_source', { filePath });
}

export async function getThoughtUnits(
  startDate?: string | null,
  endDate?: string | null,
  category?: string | null
): Promise<ThoughtUnit[]> {
  return invoke<ThoughtUnit[]>('get_thought_units', {
    startDate: startDate || null,
    endDate: endDate || null,
    category: category || null,
  });
}

```

### `src/services/letterService.ts`
```ts
import { invoke } from '@tauri-apps/api/core';
import { Letter } from '../types';

export async function createLetter(penpalId: string): Promise<Letter> {
  return invoke<Letter>('create_letter', { penpalId });
}

export async function saveLetterContent(letterId: string, blocksJson: string): Promise<boolean> {
  return invoke<boolean>('save_letter_content', { letterId, blocksJson });
}

export async function loadLetterContent(letterId: string): Promise<{ blocksJson: string }> {
  return invoke<{ blocksJson: string }>('load_letter_content', { letterId });
}

export async function markLetterSent(letterId: string): Promise<boolean> {
  return invoke<boolean>('mark_letter_sent', { letterId });
}

```

### `src/services/penpalService.ts`
```ts
import { invoke } from '@tauri-apps/api/core';
import { Penpal, Correspondence } from '../types';

export async function createPenpal(
  name: string,
  country?: string,
  interests?: string,
  topics?: string,
  notes?: string
): Promise<Penpal> {
  return invoke<Penpal>('create_penpal', {
    name,
    country: country || null,
    interests: interests || null,
    topics: topics || null,
    notes: notes || null,
  });
}

export async function getPenpals(): Promise<Penpal[]> {
  return invoke<Penpal[]>('get_penpals');
}

export async function updatePenpal(
  id: string,
  name: string,
  country?: string,
  interests?: string,
  topics?: string,
  notes?: string
): Promise<Penpal> {
  return invoke<Penpal>('update_penpal', {
    id,
    name,
    country: country || null,
    interests: interests || null,
    topics: topics || null,
    notes: notes || null,
  });
}

export async function addCorrespondence(
  penpalId: string,
  direction: 'sent' | 'received',
  content: string,
  letterDate: string
): Promise<Correspondence> {
  return invoke<Correspondence>('add_correspondence', {
    penpalId,
    direction,
    content,
    letterDate,
  });
}

export async function getCorrespondence(penpalId: string): Promise<Correspondence[]> {
  return invoke<Correspondence[]>('get_correspondence', { penpalId });
}

```

### `src/services/workspaceService.ts`
```ts
import { invoke } from '@tauri-apps/api/core';
import { WorkspaceState } from '../types';

export async function saveWorkspaceState(
  openLetterIds: string,
  activeLetterId: string | null,
  crawlerState: string
): Promise<boolean> {
  return invoke<boolean>('save_workspace_state', {
    openLetterIds,
    activeLetterId,
    crawlerState,
  });
}

export async function loadWorkspaceState(): Promise<WorkspaceState> {
  return invoke<WorkspaceState>('load_workspace_state');
}

export async function getPersistValue(key: string): Promise<string | null> {
  return invoke<string | null>('get_persist_value', { key });
}

export async function setPersistValue(key: string, value: string): Promise<boolean> {
  return invoke<boolean>('set_persist_value', { key, value });
}

export async function deletePersistValue(key: string): Promise<boolean> {
  return invoke<boolean>('delete_persist_value', { key });
}

```

### `src/stores/appStore.ts`
```ts
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { Penpal, RoutingQueueItem } from '../types';
import { getPenpals } from '../services/penpalService';
import { createLetter } from '../services/letterService';
import {
  getPersistValue,
  setPersistValue,
  deletePersistValue,
  saveWorkspaceState,
  loadWorkspaceState,
} from '../services/workspaceService';

// Custom SQLite persist adapter for Zustand
const sqliteStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const rawPersist = await getPersistValue(name);
      if (!rawPersist) return null;

      const parsed = JSON.parse(rawPersist);
      if (!parsed || !parsed.state) return rawPersist;

      // Fetch cleaned workspace state from relational table
      const workspace = await loadWorkspaceState();
      const validOpenLetterIds: string[] = JSON.parse(workspace.openLetterIds || '[]');
      
      const openLetters: { letterId: string; penpalId: string }[] = parsed.state.openLetters || [];
      const validLetters = openLetters.filter((l) => validOpenLetterIds.includes(l.letterId));

      // Re-calculate active tab index
      let activeIdx = parsed.state.activeLetterIdx;
      if (workspace.activeLetterId) {
        activeIdx = validLetters.findIndex((l) => l.letterId === workspace.activeLetterId);
      } else {
        activeIdx = validLetters.length > 0 ? 0 : -1;
      }

      parsed.state.openLetters = validLetters;
      parsed.state.activeLetterIdx = activeIdx;

      return JSON.stringify(parsed);
    } catch (e) {
      console.error('Failed to load workspace state with cleanup:', e);
      return getPersistValue(name);
    }
  },
  setItem: async (name, value) => {
    try {
      await setPersistValue(name, value);

      const parsed = JSON.parse(value);
      if (parsed && parsed.state) {
        const openLetters: { letterId: string; penpalId: string }[] = parsed.state.openLetters || [];
        const activeIdx: number = parsed.state.activeLetterIdx;
        const crawlerFilters = parsed.state.crawlerFilters || {};

        const openLetterIds = openLetters.map((l) => l.letterId);
        const activeLetterId = activeIdx >= 0 && activeIdx < openLetters.length
          ? openLetters[activeIdx]?.letterId || null
          : null;

        await saveWorkspaceState(
          JSON.stringify(openLetterIds),
          activeLetterId,
          JSON.stringify(crawlerFilters)
        );
      }
    } catch (e) {
      console.error('Failed to save relational workspace state:', e);
    }
  },
  removeItem: async (name) => {
    await deletePersistValue(name);
    try {
      await saveWorkspaceState('[]', null, '{}');
    } catch (e) {
      console.error('Failed to clear relational workspace state:', e);
    }
  },
};

interface CrawlerFilters {
  startDate: string | null;
  endDate: string | null;
  category: 'presence' | 'reminiscence' | 'uncategorized' | null;
  searchQuery: string;
}

interface AppStore {
  // Penpal State
  penpals: Penpal[];
  loadPenpals: () => Promise<void>;
  setPenpals: (penpals: Penpal[]) => void;

  // Workspace Tabs State
  openLetters: { letterId: string; penpalId: string }[];
  activeLetterIdx: number;
  openNewLetter: (penpalId: string) => Promise<string>; // Returns letterId
  closeLetterTab: (letterId: string) => void;

  // Routing Queue
  routingQueue: RoutingQueueItem[];
  addToRoutingQueue: (item: RoutingQueueItem) => void;
  removeFromRoutingQueue: (itemId: string) => void;

  // Crawler State
  crawlerFilters: CrawlerFilters;
  setCrawlerFilters: (filters: Partial<CrawlerFilters>) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Penpal State
      penpals: [],
      loadPenpals: async () => {
        try {
          const list = await getPenpals();
          set({ penpals: list });
        } catch (e) {
          console.error('Failed to load penpals in store:', e);
        }
      },
      setPenpals: (penpals) => set({ penpals }),

      // Workspace Tabs State
      openLetters: [],
      activeLetterIdx: -1,
      openNewLetter: async (penpalId: string) => {
        const existingIdx = get().openLetters.findIndex((l) => l.penpalId === penpalId);
        if (existingIdx !== -1) {
          const existing = get().openLetters[existingIdx];
          if (existing) {
            set({ activeLetterIdx: existingIdx });
            return existing.letterId;
          }
        }

        // 2. Fetch or create draft letter from DB
        const letter = await createLetter(penpalId);
        const newOpenLetters = [...get().openLetters, { letterId: letter.id, penpalId }];
        set({
          openLetters: newOpenLetters,
          activeLetterIdx: newOpenLetters.length - 1,
        });
        return letter.id;
      },
      closeLetterTab: (letterId: string) => {
        const currentOpen = get().openLetters;
        const currentIdx = get().activeLetterIdx;
        const targetIdx = currentOpen.findIndex((l) => l.letterId === letterId);

        if (targetIdx === -1) return;

        const nextOpen = currentOpen.filter((l) => l.letterId !== letterId);
        let nextIdx = currentIdx;

        if (nextOpen.length === 0) {
          nextIdx = -1;
        } else if (currentIdx >= nextOpen.length) {
          nextIdx = nextOpen.length - 1;
        } else if (targetIdx <= currentIdx && currentIdx > 0) {
          nextIdx = currentIdx - 1;
        }

        set({
          openLetters: nextOpen,
          activeLetterIdx: nextIdx,
        });
      },

      // Routing Queue State
      routingQueue: [],
      addToRoutingQueue: (item: RoutingQueueItem) => {
        // Guard: check if the target letter tab still exists
        const letterExists = get().openLetters.some((l) => l.letterId === item.targetLetterId);
        if (!letterExists) {
          console.warn('Target letter tab is closed. Cannot route.');
          throw new Error('Letter tab is closed. Route to an active letter instead.');
        }

        set((state) => ({
          routingQueue: [...state.routingQueue, item],
        }));
      },
      removeFromRoutingQueue: (itemId: string) => {
        set((state) => ({
          routingQueue: state.routingQueue.filter((item) => item.id !== itemId),
        }));
      },

      // Crawler State
      crawlerFilters: {
        startDate: null,
        endDate: null,
        category: null,
        searchQuery: '',
      },
      setCrawlerFilters: (filters) => {
        set((state) => ({
          crawlerFilters: {
            ...state.crawlerFilters,
            ...filters,
          },
        }));
      },
    }),
    {
      name: 'journal-workspace-store',
      storage: createJSONStorage(() => sqliteStorage),
      // Partialize: only persist layout metadata, not in-memory queue or penpal list
      partialize: (state) => ({
        openLetters: state.openLetters,
        activeLetterIdx: state.activeLetterIdx,
        crawlerFilters: state.crawlerFilters,
      }),
    }
  )
);

```

### `src/styles/global.css`
```css
/*
 * Global Styles: Journal-to-Penpal Pipeline
 * Imports design tokens and sets base resets.
 */

@import "./tokens.css";

/* ── Reset ── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: var(--text-base);
  line-height: var(--leading-base);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-family);
  font-size: var(--text-base);
  font-weight: var(--weight-regular);
  line-height: var(--leading-base);
  color: var(--color-text-primary);
  background-color: var(--color-background);
  overflow: hidden; /* Tauri manages window scrolling */
}

#root {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* ── Focus States (Accessibility — FRONTEND_GUIDELINES.md) ── */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ── App Shell Layout (Three-panel) ── */
.app-shell {
  display: grid;
  grid-template-columns:
    minmax(var(--panel-left-min), var(--panel-left-default))
    minmax(var(--panel-center-min), 1fr)
    minmax(var(--panel-right-min), var(--panel-right-default));
  height: 100vh;
  overflow: hidden;
}

.panel-left {
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.panel-center {
  background: var(--color-surface);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-right {
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
}

/* ── Scrollbar Styling ── */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-disabled);
}

/* ── Selection ── */
::selection {
  background: color-mix(in srgb, var(--color-primary) 30%, transparent);
  color: var(--color-text-primary);
}

/* ── Typography Helpers ── */
h1, h2, h3, h4, h5, h6 {
  font-weight: var(--weight-semibold);
  line-height: var(--leading-xl);
}

a {
  color: var(--color-primary);
  text-decoration: none;
}

a:hover {
  color: var(--color-primary-hover);
}



```

### `src/styles/tokens.css`
```css
/*
 * Design Tokens: Journal-to-Penpal Pipeline
 * Source: DESIGN_SYSTEM.md — Phase 6 Spec Formalization
 *
 * Dark theme is default. Light theme via [data-theme="light"] or prefers-color-scheme.
 */

:root {
  /* ── Colors (Dark — default) ── */
  --color-primary: #7C6AEF;
  --color-primary-hover: #9B8CF5;
  --color-surface: #1E1E2E;
  --color-surface-elevated: #2A2A3E;
  --color-background: #141420;
  --color-text-primary: #E4E4F0;
  --color-text-secondary: #9898B0;
  --color-text-disabled: #5A5A70;
  --color-border: #2E2E42;
  --color-error: #FF6B6B;
  --color-success: #51CF66;
  --color-warning: #FFD43B;
  --color-presence: #4ECDC4;
  --color-reminiscence: #FF8A65;
  --color-presence-tint: rgba(78, 205, 196, 0.08);
  --color-reminiscence-tint: rgba(255, 138, 101, 0.08);
  --color-scaffold-tint: rgba(124, 106, 239, 0.08);
  --color-routed-border: #7C6AEF;

  /* ── Typography ── */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-lg: 17px;
  --text-xl: 20px;
  --text-2xl: 24px;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  --leading-xs: 1.4;
  --leading-sm: 1.5;
  --leading-base: 1.6;
  --leading-lg: 1.5;
  --leading-xl: 1.4;
  --leading-2xl: 1.3;

  /* ── Spacing (4px base) ── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;

  /* ── Border Radius ── */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* ── Shadows (Dark) ── */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);

  /* ── Animations ── */
  --transition-fast: 120ms ease-out;
  --transition-base: 200ms ease-in-out;
  --transition-slow: 350ms ease-in-out;

  /* ── Icon Sizes ── */
  --icon-sm: 14px;
  --icon-md: 18px;
  --icon-lg: 24px;

  /* ── Panel Widths ── */
  --panel-left-min: 280px;
  --panel-left-default: 320px;
  --panel-center-min: 400px;
  --panel-right-min: 260px;
  --panel-right-default: 300px;
}

/* ── Light Theme ── */
[data-theme="light"],
:root:has(meta[name="color-scheme"][content="light"]) {
  --color-primary: #6C5CE7;
  --color-primary-hover: #5A4BD5;
  --color-surface: #FFFFFF;
  --color-surface-elevated: #F8F9FA;
  --color-background: #F0F1F5;
  --color-text-primary: #1A1A2E;
  --color-text-secondary: #6B7280;
  --color-text-disabled: #C0C4CC;
  --color-border: #E2E4E8;
  --color-error: #E53E3E;
  --color-success: #38A169;
  --color-warning: #D69E2E;
  --color-presence: #319795;
  --color-reminiscence: #DD6B20;
  --color-presence-tint: rgba(49, 151, 149, 0.08);
  --color-reminiscence-tint: rgba(221, 107, 32, 0.08);
  --color-scaffold-tint: rgba(108, 92, 231, 0.06);
  --color-routed-border: #6C5CE7;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.16);
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --color-primary: #6C5CE7;
    --color-primary-hover: #5A4BD5;
    --color-surface: #FFFFFF;
    --color-surface-elevated: #F8F9FA;
    --color-background: #F0F1F5;
    --color-text-primary: #1A1A2E;
    --color-text-secondary: #6B7280;
    --color-text-disabled: #C0C4CC;
    --color-border: #E2E4E8;
    --color-error: #E53E3E;
    --color-success: #38A169;
    --color-warning: #D69E2E;
    --color-presence: #319795;
    --color-reminiscence: #DD6B20;
    --color-presence-tint: rgba(49, 151, 149, 0.08);
    --color-reminiscence-tint: rgba(221, 107, 32, 0.08);
    --color-scaffold-tint: rgba(108, 92, 231, 0.06);
    --color-routed-border: #6C5CE7;

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.08);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.16);
  }
}

```

### `src/types/index.ts`
```ts
export interface ThoughtUnit {
  id: string;
  date: string | null; // ISO date "YYYY-MM-DD"
  content: string;
  category: 'presence' | 'reminiscence' | 'uncategorized';
  sourceFilePath: string;
  sourceLineNumber: number;
  formatVersion: number;
  createdAt: string;
}

export interface JournalSource {
  id: string;
  filePath: string;
  fileName: string;
  lastModified: string;
  lastImported: string;
  formatVersion: number;
  entryCount: number;
}

export interface ImportResult {
  entryCount: number;
  formatVersion: number;
  warnings: string[];
}

export interface Penpal {
  id: string;
  name: string;
  country: string;
  interests: string;
  topics: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  letterCount?: number;
  lastLetterDate?: string | null;
}

export interface Correspondence {
  id: string;
  penpalId: string;
  direction: 'sent' | 'received';
  content: string;
  letterDate: string;
  importedAt: string;
}

export interface Letter {
  id: string;
  penpalId: string;
  status: 'draft' | 'sent';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceState {
  openLetterIds: string; // JSON string of string[]
  activeLetterId: string | null;
  crawlerState: string;   // JSON string of filters, etc.
}

export interface RoutingQueueItem {
  id: string;
  sourceThoughtUnit: ThoughtUnit;
  targetLetterId: string;
  insertPosition: 'end' | 'cursor';
  timestamp: number;
  blockType?: 'routedEntry' | 'scaffoldBlock';
  scaffoldId?: string;
  sectionLabel?: string;
}

```

### `src/utils/serialization.ts`
```ts
/**
 * Recursively serializes a list of BlockNote blocks into clean plain text.
 * Strips all metadata, labels, and badges, and joins paragraphs/blocks with double newlines.
 */
export function serializeToPlainText(blocks: any[]): string {
  if (!Array.isArray(blocks)) return '';

  const lines: string[] = [];

  const processBlock = (block: any) => {
    let text = '';
    if (block.type === 'routedEntry') {
      if (block.content && Array.isArray(block.content)) {
        text = block.content.map((inline: any) => inline.text || '').join('');
      } else {
        text = block.props?.entryContent || '';
      }
    } else if (block.type === 'scaffoldBlock') {
      const label = block.props?.sectionLabel || block.props?.title || 'Scaffold Section';
      const labelText = label ? `[Scaffold: ${label}] ` : '';
      let inlineText = '';
      if (block.content && Array.isArray(block.content)) {
        inlineText = block.content.map((inline: any) => inline.text || '').join('');
      }
      text = labelText + inlineText;
    } else if (block.content && Array.isArray(block.content)) {
      text = block.content.map((inline: any) => inline.text || '').join('');
    } else if (typeof block.content === 'string') {
      text = block.content;
    }
    if (text.trim() !== '') {
      lines.push(text);
    }
    if (block.children && Array.isArray(block.children)) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return lines.join('\n\n');
}

```

### `src/vite-env.d.ts`
```ts
/// <reference types="vite/client" />

```

### `vite.config.ts`
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react()],

  // Prevent vite from obscuring rust errors
  clearScreen: false,

  server: {
    // Tauri expects a fixed port; fail if that port is not available
    port: 1420,
    strictPort: true,
    // Allow Tauri's dev server to connect
    host: "localhost",
  },

  // Env variables starting with TAURI_ are available in the frontend
  envPrefix: ["VITE_", "TAURI_"],

  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS/Linux
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari14",
    // Don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});

```

### `vibe_snapshot_env.txt`
```txt
# VIBECODE SNAPSHOT ENVIRONMENT
# Generated: 2026-05-30T02:55:47.824550
# Platform: Windows 11
# Python Version: 3.13.13
# Executable: C:\Users\USER\Desktop\APPS\vibecode (old)\vibecode-project\.venv\Scripts\python.exe
----------------------------------------
aiohappyeyeballs==2.6.2
aiohttp==3.13.5
aiosignal==1.4.0
annotated-doc==0.0.4
annotated-types==0.7.0
anyio==4.13.0
attrs==26.1.0
bcrypt==5.0.0
brotli==1.2.0
build==1.5.0
certifi==2026.5.20
cffi==2.0.0
charset-normalizer==3.4.7
chromadb==1.5.9
click==8.4.1
colorama==0.4.6
cryptography==48.0.0
cssselect2==0.9.0
defusedxml==0.7.1
distro==1.9.0
durationpy==0.10
filelock==3.29.0
flatbuffers==25.12.19
fonttools==4.63.0
fpdf2==2.8.7
frozenlist==1.8.0
fsspec==2026.4.0
google-auth==2.53.0
google-genai==2.6.0
googleapis-common-protos==1.75.0
grpcio==1.80.0
h11==0.16.0
hf-xet==1.5.0
httpcore==1.0.9
httptools==0.7.1
httpx==0.28.1
httpx-sse==0.4.3
huggingface_hub==1.16.1
idna==3.16
importlib_resources==7.1.0
jaraco.classes==3.4.0
jaraco.context==6.1.2
jaraco.functools==4.5.0
jiter==0.15.0
jsonschema==4.26.0
jsonschema-specifications==2025.9.1
keyring==25.7.0
kubernetes==36.0.0
Markdown==3.10.2
markdown-it-py==4.2.0
mcp==1.27.1
mdurl==0.1.2
mistune==3.2.1
mmh3==5.2.1
more-itertools==11.1.0
multidict==6.7.1
numpy==2.4.6
oauthlib==3.3.1
onnxruntime==1.26.0
openai==2.38.0
opentelemetry-api==1.42.1
opentelemetry-exporter-otlp-proto-common==1.42.1
opentelemetry-exporter-otlp-proto-grpc==1.42.1
opentelemetry-proto==1.42.1
opentelemetry-sdk==1.42.1
opentelemetry-semantic-conventions==0.63b1
orjson==3.11.9
overrides==7.7.0
packaging==26.2
pathspec==1.1.1
pillow==12.2.0
propcache==0.5.2
protobuf==6.33.6
pyasn1==0.6.3
pyasn1_modules==0.4.2
pybase64==1.4.3
pycparser==3.0
pydantic==2.13.4
pydantic-settings==2.14.1
pydantic_core==2.46.4
pydyf==0.12.1
Pygments==2.20.0
PyJWT==2.13.0
pypdf==6.12.1
pyphen==0.17.2
PyPika==0.51.1
pyproject_hooks==1.2.0
PyQt6==6.11.0
PyQt6-Qt6==6.11.1
PyQt6_sip==13.11.1
python-dateutil==2.9.0.post0
python-dotenv==1.2.2
python-multipart==0.0.29
pywin32==311
pywin32-ctypes==0.2.3
PyYAML==6.0.3
referencing==0.37.0
requests==2.34.2
requests-oauthlib==2.0.0
rich==15.0.0
rpds-py==0.30.0
shellingham==1.5.4
six==1.17.0
sniffio==1.3.1
sse-starlette==3.4.4
starlette==1.1.0
tenacity==9.1.4
tinycss2==1.5.1
tinyhtml5==2.1.0
tokenizers==0.23.1
tqdm==4.67.3
typer==0.25.1
typing-inspection==0.4.2
typing_extensions==4.15.0
urllib3==2.7.0
uvicorn==0.48.0
-e git+https://github.com/ajpop3y/vibecode-project.git@92c71967ae074c7e10de604d3ba13ffd41d436be#egg=vibecode
watchfiles==1.2.0
weasyprint==68.1
webencodings==0.5.1
websocket-client==1.9.0
websockets==16.0
yarl==1.24.2
zopfli==0.4.1

```


<!--
--- VIBECODE_RESTORE_BLOCK_START ---
sha256:423bf4130ee46238237a3ecad15054adb51ff0c56db98bd326e3360b3cc01ca4
eJzsfYl/2zay8L+CuN2IaiX5StNWsZN1bKeb3VxrO9vXz87PoSXKZiORKknZ8XP8v38zg4MACB6SnTTbZ763jUXiHMwM5sLgamnsz6LBWe/Ez5b6bOnvweAsZvFodBRlYTYO2D/jWRL5424Wd98E0dQfszfhNBiHUcBeUM0gOYqo0ub8j6jJ2H7mJ1kYnVZ1txOcs/0gOQ+SXq930z6hgWg6YcksYpk/S0I2DM6PonDE/hYkSZyMg/Ng/DcWBX+wFeYdRTBEJqrJP8X02cgPx8GQXYTZGaO6bBAPA6MdUWvqz9LgKGofRUsdtpQOEj8bnC2fBlEAfwXH4SCO0t70EpchnEzjJGNxehSNknjC3jx/wcS75xP/FFo5ilIA1SA4nvrQ8SZLjpa2+0dHb9MgSeGf/d29o6PeaTAJo/DoyIfFPE388zC7PDo6SfwwOjpaORmMgsFg1P35QfBj98HaaNj9eSXwu76//tNacPLzzw8frEHN6ZQGdrz6448/P/hh/eGPqw9X1nrT6PRo6SiKZ9l0lh0Pw4SPYGCPYCdIP2Tx9Oho682b/aOj3/PVndLqdqdidY+O0mTQpaU4OiJIYPu0IlGMgOjhPHvBxzDNUi/vt93nsIUCE/9DAG+Mr9jENAmjzBsdLb2I/SHiGAccwBMAyRC8fXalAfP6aAnqhZNTmBMBuxfDYD2tBDX7DduN0lkC7WStlO398nSLRgv1ehNEgHubrIVvW2KEvEH8DLMDJM48/lk0ttpj62sf1zloxZiPln7hyIGjVl8R+8UIj9fXRJtJkIb/G3je+loHSrY7YuR7QepPpgDg096LrVfb/+/1vqrYS/3zwJOA/T0OIw1wHXa0lA9nqY2/37z6hfrF0a712OraTx/hf6Xj1b7rI4ZX1pDhTQdL1w8am6sbtT6s4rjX1bj/vvYRyzBv7YeHH+F/7apJiML6PKCKNQ9402HYUu08oFDTeYieHVN50GNIJz34j3Po8qMc9Dfs+fZrlmZ+NPSTIcMxp322+hDxpcMewBo8fEDrQJOAgQ7iYyoE0zwsK/aOlyNSooLwYgQsECuyMGKqEUkEqnAPOEsQDT0dgvjfDtWtgmFb7/Nw5R0HpWIDZQBVwAJQ8sIw0ImfbR4tAWCOlsRLGu3moT4W5pzRO1GBz0MMZ1Mb2Wr/HTF7BP0ParGAsVWsFmwA2nK92mcDP2InAcMpDhnMJBhk40t2cgnb4ngcX8AunVwq2EZpccX01eqwH1bX3mmljXUTINFmKtsTHVjVbrSC2NY37Fk4zoKEwUKxOIJ5ZWcB/AEjys78jPoSi8T8wSCYZqlipccwE4v+4A1NsJr+tPq1NJgvGZKfhi6v9mmNgo84KLZL/4RxxPyUBQJYatfZjmfjIW1icqdnWTILaHlh4wmue+zXJCQk8Nl07A+Cs3g8BKiM/PH4xB98YCMQMDhSCKjJD1kMssaUgw3hgfwMFvACmgugsRQkBpDgsPqfCTedbUnM3xqPCeVTls5gZdN0NBvD+ksIDRH/lECwTCXvURMkOakP235yGveyeDJGoelwCkCBCQAuR/4kgGkeLVVIHCBfwDac4rphyZXeam8FXw4DEM1CvqD4YYsdkIR4vgZCIokzSPNEKlniRyniBa6e6IoFQJMh4DDMNGa8UzYOsgzFImjen2VncUJEd7R0Gc+OlmC8ILio/tZW1la58HM4Dk8ckznO4mPe7rGczDGUxDooUwbd7HIa8PbpNS7BYHip/oY9IAsH9PMddXMyC8fD7jBAcg6iAQwe3hOEu/QJ2rpiOqzWsKFR4Gcg/3D2wa6pJVcbDWvz/qbj2WkYdYehP45PZWnr4ygt+QBzmp7EsLt1J34EiJDk5UAoHQaFkazaIzlaAsoLzwE5aExU6/j3NC9+FCWz9I8xEpjd2Epvfb3Y3sksGoJ+IBocnCVxFDuqPijWpM5FvdksLK6CY/TnD0SFCJQGLPNjjwYNP4/H8cDPOCI9wHcmKdFC95IUCWkUsQnoCF6bXXHCpyLHVKTfp388oMVruw34a3kQTwD4w3RZIKtoEjQfRsjZ7yP6wT9b0+k+/vUIZpd/nPoJzLvfv0qD8ajDDs7i2elZ9jYKs2tRkMACBUC1gKXyx7Tj7Ms/VakMRjpK9V/Irfr9N/Bf2SUtBjYFXR+EE2jnbTaQLSDI+/238N9HtIcfcszw9vNejSHsBCez0w7bHsMG1n6HFWikXhIg/R4DzybQD+DHeNsHRXAJS01nJzC6ZDZAxQ71O2C+s3EmAY+fkZ9cHg/iWZT1WQh7ev6Jb0nHAinsrxd+EgFjAinvP8FgYx+4UnT6uEPr9iXmI1T5fa5taRMCuDI+Gn0qsEuRclX2DXt1fBv7aXYMClc4CgNXu/Sdq87O79UgdMBeQI8wvt8X6C5mDoTDuzqWrBqHLmRTjvdMVCTc35BE8FiKpA4otFn3MeNosaHjSEcUeSxhu7yMWiTIVAE7wB3glxkK+h43IOztsPtsKwNwiM0ctiQmbAdviDKi4MK7rwbQfpQXCz5mUEoo4FkQIaS8dg/mfQyiR+R9Cj6xALbhY1h5r93uzaKLxJ8exwns9IAWoiVQjrGhe4g1E2CI7P79/EX2MYM3V7mgmQTA1iK2m2Ajz6NzwMohgYfh7tZjr1Fe7E2GDEbBelCdPqbMB43cR9E4GILMJAYFUIJxiXHQAgp4gR67F/iiYZAyYHJZPm/xAuY+Svv9BAoe5+1poMpH3ZvAvAMYM4KEo9Y9T5cBE9kbiH7XyL+DdvvJI21EoKH+Al1Pgswf+plP00McZhLHWQacKh+jKsgHKX/edHiqXWucsluD7I6HQB2SiW4AD30Mo5EN9GQpb+6B8Jqwa+GOh9PWB6M1hpKW1y4bHYzFHi2iRTIarK+v/1ysJ5kF1IOpAF3EF4DsVg21XqCGv8E9S4p/eWNexjev4xnsXmnH4jQdxZ7bRFt826N/JfPw7gsE7DCTLlXnoFYC2P0TYL9cFvUHBCvPB5k4HAAUu3w2fRBdYUwB+57eoWCTaXxgMiNkR7GCuFRveNIDceEDzFtfqMAgJx0dso9QFVvoacOora3mscMHR9a9EO1JJHR8BG4TDGYZMNClnd0Xuwe77Nne65fMgCv79R+7e7vCpneswATDeYKYcphD7l09/u08RYYDgr1H4EKpHnQxKdG3HbRQOki5AfCByWF+nvHxPuzhKeg+p+WWZk9Jl/niCdiRhPmWpB7YCo7PH3Cslyumrbbaj+WuoF4YNJ7vD9EnFuX7g1ZE3yneRh+A1CKl6FIBcwBFmKuSsEm82t/dO2DPXx28LkDfC4edHPidfAYdkzd0TBZQJFpNIGizvHf2n60Xb3f3mfekw+z/byvbEu1rQn0gWvcn6b1DrRV41GJ0zPf54B3vaSbme3Najm9qjlZ7xoTRopFLRPIxCLA3DlBTKBSU9rF2LS5zdqRZ5iWK1mG0GAejceQGrGyG5oP7JpvQRAsn/hRxyKxPGASDAoxRXBn1qdM4uewU2I96Q8p5NJucBEkRmQawy8EKHPtZ2xxIFToVMKoJVtG0Z70CVon3NC/nFzlX90c5f+fXAkyqSulwcpazYOcej4Kn9f2d9nsefCRqd7H9a40XoQoQZl5Fuwfa1rxNpYXX0Infrz94LlUQH0MdaUSFtnpTR95SKBGvrtu1Cs9pIHnJMcoOs9SrVHR0bQbVUkNLfFzQaYQYvrhkgqJNmk0yKZ9MkwBIxNw59mHf3j5gn2GP0LcIp1jwem9nd489/c0SPXd297fRRlNE2DIpCueaxBcpAWqS9f6YBTAIqOkdvuuwT/Dpk45JgGRO/Vw+qKNDnR6srrfSflK2GeWFVt2FuNYuC60VClnquyy47i6Y6/Gy4INitxbGy5I/FEoa1CSLPTSKXbclHTReBEI4sbqbaHnhmrWUn3CDSnB/osXSoC7q9Kaz9MxLqrrTFFmxlKJuPbEmwSQ+VwqGwMJbtE+cxPHYScN/qobxxTQJ9/C/hI5QMXXn/uQeKaAS+qaaMX0DeHPgUIqxPsdDKvia3CyabZLT5bDqs5Q6HJ/tzUUzH9/y1mJiNjFbModqW8lnExaZycbUU4rSq5urpinMOQkuObp4VjiiQvvxBM2/I76CbQ43sZQ6JyNoEB8jhe9oiW292iFwsMeE0rJdfHivnOvxdk3uZvcNyIE9Sxxp2O9GZb/YZnWvsHjYq1zD+l5VycqOsVmzY/7fYptKTqDpbO1vu5AG3/PO6uWf+9RHU+7rlixsreMYTc3H8CLx+Iu2W/LQyHI+uYNzBfG939847lg84LFDDhEUWCWF5CylXACxqbZKBikuTZUcUiaxPCyOU/GAvNSPtyGwmFxjHrHF1EIWEV6MFmrdityT3tSr2MxZaLj6dM/g22zwhZx/L2hatV4y4fZ3fuPal+ODjjWFj7PpsPjxC3kI+aS3OX3Ctj2NQfPWYXCC+3FKDvji6MpkEz7dY44oc8glLtjqAgUf7dcn3S4vs+2zYPABNy2fDRN/lIl4E24NOwtTGYbij9GvcskN7WnevTS8C6D15ZQ9AQhm/gtsPWf9ZDRBhw+ImnxrABZRpl5rFhoN87jkImJkhMyiVgN3UNpSOX7DzxbNsWUYwQ7vqwq6sYfvPsBkPH1TMZRWfVtoy9DAfA8VkgA2wQd4XD6PNkkmJiwtw2MS89itRpiBj/CDQv8vCu3R+ABd84GZ3xRI7O1JcIqjJYKkKRuWbjnWh3zaxvZjG8jIrSbH19TBILbsOWpE8UUzf902zYdC5viwijqahrq6PVjiJ1mCc9AKaJbihAY106or0LiZk0DDPa1rmCr9p87W/oyfUcB4QT59gZuwn+88LTOyC0gNg5GPZkhRxXCSN4basXSlE/C0yWgcvgJSh+9adQDKUUZrf1G4KJHRAZnmGrWScIqUW0a1LoptSq36Ng840RvgvmyU0Pd6RJ3GNl4M+Dw2V3KOjVVN1BI/3Lt7I3PSQputwuwt7h3ndv5lUIgw6pY2S3OOqsKvICOCZCLw+vUe29t982Jrexft50AfIOZTxOrTre1/7b7aOd4/2Hu7ffB2bxfjU45mKyv+jzCJOMHzJnuzcSB2XtrvK+hH6+cWSMnk3tuvt17s7m/vep7anfVdWHXCN2OdgT9pI7uyNgNbUdGiM9gcrK2c1ZfNtDmFIw43oW9Y7rdEJ9oe0Up1aQUjUQDzJtOaZXz7ZmfrYFftG/u7B3orKNZw6HKw1kCpZGtbiNnxUUhglET6zGkRHMf+8HZZRFH2tjSF23cWOTiSlMsrRVutXlMqsqTXwiriw6XXXHKtWeAXBnJTGNUonkWlXsYS9cuYTYPNYeInH+TKp7e77F+nOyHnEIKChGaCTKZONHLwhFyvwdqtzlfCJHBZ5QRhm0sr+KUI35KIRwGn9mYFm+uHIJiyMHvCnru3yg57/YoJ/8j21v721s4uu4iTDykDRBQj4WFsHab6PiHrlb0UJwGgaZDiYQdcERjzJPDRsW2WDcdjoQvj9i0XJfNPxtDF77M0k+2FeVPtXi4hj+MUgeWfpMv4UbWAQaioaXfxVBNaatlFwKcv4NG7Bf9MhZFsEstQfqRR+CVdTY841eIbLmpqL/jgtRcE+ymIRo8qO+MN/eUscuL4eZ1FriQsnbzKaFAufAkBARKQH1yWuiyehgPXB+Dlwe2Y9uRHRZ/k/RZW9PDhg8d6GfS5i4IlDrkvZCncjpOENig8W1R/mKDKTMoPUYaazoGkLKmbfYI/oUAA0xnKCAy+oEJkLIMkB1BxuUXIgtPAWmPC5NOYYz91IKNCRKcvVUNG53eJkM6PAikrvbCcigp7OB7rh7HC5htOgPOF6XEwmWaX+Ykj2t/0IwCCHCnqFLhxEvwxg4WsjfHHvX4euxMBi0QD+isPUD0WdhCjvAIfHqmUf9fU4SBFeyn9UVOaYAyF6d/ask1sYDcSkutUVtJTOdoKQxkPoBLg7ORQ6oj5d/jU5jefzRtmO9dgFjasCUN7uWENtnBzZyFy0O09VjCvHK1WWg1bMy3z8Wut0ERubh0SKKPtFeQUX9FrFveJV9D4fCGEAmnmCx7kkPxzowanPTLK9jhuTXsKu6Y9Db+mPYlhUJLj2FSPV4VfToO6fKSZZvv121cH3ndtrmYOzG2x6DnBwVFUqL6EFc2/3PofT1vI+buxMEHriVqSrGGaBzRwyPHQBRex3V7AY5HuOO1VRRyY8Yuu4AKxvZYHF2h7bHl0gdxoy2MKxG5bHkbgCg4ohhDoVO4OIRDAtSleFv6pXbD+FelfFv75NoITJNLME5Yg6iwUkCDq1vMtDsv5xbSCXHont7nktjtprFEQou7/F+KHsGng2dFTBAz8rYUPmgdIiypkI5On1p7B2UutVYf3q42bBd5/jKqYRB9py7TxJucWdWZ4OUCNdaH1TRxje9LR0O1Jx8ClJ50cTZ50FBI8sS11Wstz2Ozmk0kXMPPXiqSAQP+mANZJAGAdkCHTP49h9OM4FTazSY4wniFLFJh/uw+CP2YdMvlLuxFWmfvKgkJPYX+6oXTTSLWYN+4kDzXRDkF6Kx0Sndvtr0hfWFRF0F9VaQvN9QR/ODw2V+uG4V34vmgPUvzEYfBxG3v0ndM0Vbl2UGkDbr6JWuYvaVQf+BEyxpOAUQPle6roWE2V51wQFq/79+0Puf2rdEQ7qsYEzeQ4hBDYRCKcGJiGqiWbad2ukUazqH0V5g6Lf9jhQQq22lkAHfv1+TSxdjRhRgt233xrAUq05l1m7HBbbgtMzBX4kg9d5272edQiJ6HG81nNZ4e4Vf5i2ytMYPz5px0XxJPCqUaLBAqCkBnMqX3Ojz/mXd2qKUAPC3UaBcrxk+NolXFAW/JyC4G2v1QcQLDPKDgOQLr066KZwPA3uI0FC6rhY9Ap5tLBscJCCjhWrPVxKu/k7Xoev7yj8Vc5ERqs7tvCvMNSUgqHqeGwUsMZsn/uv37F/CTxL1k8ks7t5ztp3hCGN+QRfIivTsMA9yj6F2OM5Mh0EYcxV5/QmyjO2VWzOEK1cLyPOVhsGTz414aTdE/wc8YdYmWlaZWGEvJYfUBTqAhdxURPKE1Af6vtZvKIHTFogZrLJhYUOwXAdUwY1bljVhdPdmIPxfxaGJdt79QHaX4rkQrzQnPGDSpASjy9caicTQWN/R4mu7j96CjLJiCPM2h4iSnuubcrzFCtmIQpftT2Yv9Ckpd9kMQiycoDJfXmgnlRmUsrNlVoxppV02R1u0dJyHhCQ4axIuBrx4tGkwneEpCD1BJfKE0O23yMRyN9bbSopR3TB0uioXAtHtFPSqPk3HoZwP/Dd1acOXfpAegR8w3E0QQLsZHrlqXd4WnAcN8Ddr09DnxEn+mZjxHTSTAKEpS6UualQG4RprYe8ZTQ/qkfRml+MskMztJSl0l4GkkuEfFV6tZ+n46l4kHa+zr02zUGXKQiSjt4LGvZ0k8u/4QU/63K6UKQPF4FI8RtpQqvDdze/Z/n+wf70nS16joj5bJOEd5aptYcfQuxpJwH5haokT9Og3xu+FDeRrInW6hkAodLeqE6Sa0jhE4BoxBTHnDER0O9ddJaUERIp7xt8jDUx5E9ABSiEWs8rQ1ryNSN+iyd4DoKs2CcFtQAxP3irApF82LXj4pT1nHPQlAtq6Q5Jx1HsTdhFbep0zjh9HyE0YYDpLUA02NeGhSXyu2chI2hzB4o6U/ZihxjvrfJjN+fPpmLea96wRYPu5UtVCTuEkZ+m7Wbxcjgb+0Z3JBfGLfDvG83Vrpt4FOUfIoA7Rjg65QJLeXJqyohNUdY6bUmwri1EXwK0rdjRnnpojRuTFaz6DjEOGWrwci82doPP6zc/df4LwLm/83oMg/2BvMGwFb5r+Cy+x9/PAvUWaOtoT+ltPN3cCyDY31YEgH3+BwBO4eq+iG4LNEt3RLw7ZkAYaRK7JZS90LCNU2Zix3/y1FNQkOwPpijw8sLb5ucYVE7Fpdvz00HFzCic5Je4Q/as8/bbUu6tebU75O+skdOimD4Kt6LL1LZBPnUrPoBfcS/tFx9cjvkF3mBriNnPApglJra11Gcs87kcWtIhG+ohS9mtJjX3GCjiQcT6PAxtw1/Rp2VIK83h56O+cxFxwJMN1HS+UGTz0D/X3CZ9FxjC5JwPdxFYuk5QV807MKMc0NujhJX2zA76ZngIDTueDBudcCNDrPDhhm3U5KMu//vF3hdhxJ16aa+X7de4BmXgPJsBeFphKBAAwJsqHgp4ATvy8NO016e2h/aPZbNeMMTkQboPnZueoDliF3rm3/t9+liOdGQGZCxJ+Kk2BR28okPGnLjw8W6rZDXPuaCrCdVeJl3DgHAr4QBcBwtmQjlriqgdYzQ4lVfvxI1eV0A3nEOPEphHplIQG+UfAdTnSGXhK0owlXTIM8QzkPkwm/2tn55uYWG00SmSerxygB7kHAifuasCkQvZbNIejCj00toATMimuPFwcGS5oukL6zXNhZUvzMid7gR1PjGypmGBJ0+egSdvTNqUELdVmRo3QDVX9sYdVo/PsGt0wujwXg2RI0nQcrMJ7O8srJ6HHJi6AE9wToZSkLFMttjvb/qVBZIdXZS8ziU5IwnyYYnUBn/SIU/Rh1Co7z32gvp3iFQcCJ3+XIE733Jr/kRjprB6BRUtSzxJvFJiCf4RCn+85in+5zGYZS1cz4P62/dc9PvP8UbbjAdvzIL5UDr8buGPH4lDv9xzK8r6vcR2GaCc1dpvKehWUl1odGxuNDIVTGMzuMPwTFo+EPQozwxB3WtqHhvm96BdkQCWAVzy7wu3vb7gl1A38W7TQp+zEKlQn7g+irOLKXNejLvXChMWYRS1c2YO3ZBKtDPYZUOQJbWjjHUljVCh2tLFwOfGg2msgpAQx0Yr4YG1+EVNPjP0gHI0o6cIbV1HEkEauvYx8+L01QmjdqZKvORGL5lTiodi1bP5dxpUq+gbDapVFAumlRySbZaPSPFLHQwm3qf/On0k20TxR0QbwdGgUjcAAw/LRsZtoHCjc5B1QesjZeSjVUbzmLBxylsxYbMCVgdj88DuoePWiDpDkMt9PSXGgqIq3qlyVMEZcSJmQpNPuLyMIXxUBr9+N59fb4Nhyo8ZThSs2fXSBGmQhzk4FS98WsWc9FNHLoenpjJRWUjQtYcnvANI5da70tps9now1yUlk24xg0j7fEdypMbNfeSkKxXLC9FB/n7Wsc53JHtTYyYwUfQPIydTw2Yq+sXZ3hxEVTnB/3p7kEY2VjcIMQH7pRW8LY7Ia58cy+XI6I484YY3nHsp3QlAAhV7Q4oENEwvkiP09lJeplmAb9pT7zl4R0kWpp36FVf3gibHgoiZeMrlelwyN2uJt3C977UgFg6OAsm/lEEJXia936ZjLy2svoA781iP3IPW8q+t1VGamYL4YnXnZ8FTrEc5VWcPhT9Kgx8X9t/ETAHCOC+nf37DmalMNve20XnzsHW0xe77Pkz9uq1dI8WL/oRCtTQ5G0Hu/9zAOj6/OXW3m/sX7u/if0uT7WuFcPWX7198YK9ffX832939aJ0WMRRVAaHG9eOVZRR9zy4y1iXdKBxbfeX3T27mH7PBD52Mbaz+2zr7YsDBiDkPFgA8vmrnd3/sQAZDj9aAnfKIfP6lQ1kz7qM7A5va2ndUEvuILYIpVvXMbnpvILWyeftKGoe9yi2ZBGdSuxeVk5RXWsWicIYMdkqClzy2f7H7va/PNXw81fMa01BxEWlrdXBcxQT2PHTgfxttqt8EYWLK0pm4MgbX8ZhbEbk4jIqrFKdB3TDpSEPMpaZx4MDBzLvmqDDW4/mbErcLVZozAbbHU9ryNOEqeMOVotwM5UjpcjHSviXJnu4GZM4vlrBkFr26fH6ouLga5NW+bnYRkV1ZuGaixZ442YidyhXS56m8e8OZItQqX20rzGx5gee3AieH7i0aYULA/l3kgZEYsj8RKXa9HWxxaluaOeqXN/1U12u789e7+0+/+UVTo15alZttrf7bHdv99X2rmJlGPpZTODYcNc3AS0MJNiadRwvH8EdG2jGBkTE8B2sFqF/GW59e4Qv8olWbZL8WgDBCER54gLyvgDODnIWsOhm+mVJXMBSo23xxiTqhq0IuGit8Dd3fGEuvpBnur8D2aLsIc9x3JhL5HHmlTZHPRF3CbM4fNdykbHqwCBjSSpNyJgPpIYO5dTlXTeKHFUK+Hwgd4TZjDAt3/EdzBahzMLB1zJzobRmaTQqdl5x8NZ99Lh8984JsnCmxDA3GscSK6SBq+uWYx93CBCaavycLjYpniY+ivLAXWAVwDA+3zFh7XQwwYRLHHw+ZIvFLGReK4ovWu073tCQN7g8sl/FGL+2/1bxhkKUuorYrtqy+WkIJ80V/fU8rHGZm89XtbjmKJ70+yIg4OQS0zBi5PkUA3L6/cxXuafO/ATIjYKu1OcrstgH0ZCOdERxdmy8IAJewQjmS6x+rQwEk5Mw8jM8IRFPZXQUj7fFaKBsNlVRfM95nGuHvaHxw1sZag3jplAdHMcL+ne4P/WjRyXZ+tPZFMd+RXAQ+WO0S1877BlB5j/cr8APS2aX04BhoxstHw+oaN1s3G/5mC3jsZmRgzJvYLSFSKSx51/sQJWnKDXJqAuKsoPv1jmKbw798Ti+8IaBj5F1Q8rcocojXCmqV4pr8FscMFYH2eFrWyXAH0Usn+rxGTQaJF4YTWeYPgwmQEHEz+WhHHjRYWZDelixdMxQFktookeABzjRuDzKswuVtCM/vKsOwwPfjBbU8wCZvKOlb745WmpL3Gi3ezRKXtw4NCRb4OCiEW/aKFZRjToG7PK04u7OMPJHVPJUZ70RBiGjuNiWSdHMq58ERNrttg1wJYAiaOogTv/cEN7hSJTSxkz3VqfHeLBAwrwkcRrRP/whDi3x3wE/vySOMWHYlIBQ4eu/wggI7cA/bdvZ3fTVoAkJwHyJddT7q1ysaSKJ45hUm5oFK9JbIcsFUaYrKZEskAQYhcWTmlJv4juPFbunPuvL6U7IBwvvLF2z+MTpk8D/UDwWjw8//ebAZdVXoTUEfRR8zI5r4e9I/yBhI/viZ9H1FqqJ8VGxOQDMPa25EvAZA8BV4/kCPK2mPnZHP9fFV/rq5iCx6lr1SjNjSNAYwK2iiHyJnrjBkjfENje1wZaBxdm52M9remsMDYKIM8nB/M2Uwvna4E2UM0U2yhc5LTIH2g2asAV9mzcYgrWxIEKp7Zyu5i3ZowsZ9O64yh1XueMq80CDIPKnchVT+GcOFiA4D7tWvEccAeNwVykY74vUHCIeSL4QZ8HMi7DwE8/OhcKKpuIUJBUzfK2Et2iunE2ViRAVoXFJjltZEaVoqIIMUgXek/innyld7XHFjoEc1uUMkJuYgXOOECPa5pAHsyRBIiLn8aYBADwVLEQznl5JDka7Ll1bHBT8BNtXbLggDHK1Q0MfTKzEKcQkY0y1pFosZOzU8glRDhxKPI5/HJ/MxvDJuy+bdHISY504N9GWtQy7Mb9JxeW17kock3QoO27l0R+FojSfskIijhAvjDYiBSuveZePHQ3XzwmheW0ttLCvlq2kihli2DctA/0+/7kqdLCyKWtXGOR/VwDz2t4JTC6T/wCqWZNUo51RJorg3pm8rCYcMI0vaz3l4kG9YIAPFw7mFAtERUmFxGuhFXFrsi0HcdKD76Xbqk5QVHF4PDQb8e5TKz3Jc0uborUymYrRbI8jA8zsb791/zbp/m2I1206MocX1tP9uhTjStkKn4iTsZTBZBEmoz+LMRxjNIswH/2ZmxHpTyOmZFS4EYPSn5sxK0dL8zAu/bkNJmaAaF6Gpj8F5mZ8nIuAOCuTLGRumQ9TBvujgGsqZDnL2MgPx6m7uK3QlAyuvE+8CSeO0tkEmbMffeAC3/Lvs+hDQx553NaE435faJwFOxy9f/y4km/eEHZNgeESj/kf1pkTqW0bbIpbuu8TnwIh1sxNpYuwqLNNgqHQ6oQKl8t84nP1XRaYXKJotSRJkxKDbspmiu2a+16XWfueVb+HlD9FCXMUfpTlRSZFpX/KkfBVKO3ruzn7+u4GfR3N1lbW1ubsMK9U1iv/R8GU2itZKS2DZQE7893Okf41T4Q1GJ16WZBSjg3M6JEFWupQzTn0nVJNvjnEMsIBAxiKv46F7+yYu9LMUWqmBjp6iyOTR5UJP49gIN8wgMuD7soP3dU1+N1lTwnl2Sr8+E7+wC+vsKcxw/PFvN5L/5KtrneoPrwRABY11o+WHpkjkRqdoUZiEhWcR28yxPwpBLujJTWiVczForWT/8VPGh8Hf9zzuEQwDiL0gfygF7cLHa6862kdF+GxVFeb++gcwzTWuq6V4jbaYavm8e9CtVVj6GqRqke8WjbitXlGvOoe8XrNiNdcI16rGfHarYx4zT3iBzUjXjdGrCN89aDXb2XQ6+5B/1Az6AcuMK/XjPhB2YjX5xnxA/eIf9RYqvOcvuH3X7vz+9/5/e/8/rm19s7vf+f3v/P78+fOQ3fnoavu/C/nobvz+99xlTuucsdV7vz+d37/2/f7F43UxD4MS6h8kMdUW6zl818RDSCnUt/HXzE2YO0uNuAuNuArig2YhxFZsGzIlPTnLxM90JyJGdX/j8YS1DA9A0R/jViCGwcH/J/099+yO3btFt2x/wqCKeNhCAyvekmg8FmQBLlHFm8DOk386ZnWiOWbfTOGjRSAfoEl5CD+JA/tg6/FQ1vRjulsrViEW3S/VrSz5vJLWsu+NJdvswQhFvNylvkMG7n/1u/cf3fuvzv3X260uXP/3bn/7tx//Lkz1N8Z6qs7/8sZ6u/cf3dc5Y6r3HGVO/ffl3T/3cSnZ9dVN1RsVltbdd/jP4Ix6IR4ldg0iQdBmvLVyDsQr2mpoOFP0mAu4S+pmCtmwth8375EncAL73G49pJ00EosvvEKn2zrVRN7fX5qA+kPmLO8ouNoyUb+7wY+t4TlRUrYXuFEiGhbv/Kjon2zWG0fDfwLzf0Ic/sN+NLV+Afm9Afk9v9BpU17cev+nNb8Rtb79XLr/VzWesM6L9nkIp7/P917r3OB/OxsXrvD7uscrMOp2bzslb+zmZUFovzHnfv2r+e+pYvTU9xR5VYFG4+xUxF6Bj6IycC1tMXGgv55HA7hZxCgYMZE+t2qmc69I9rPLfibvwzpNFiSOwfff7+Db/3WHHy5eHQUvRF/shAvS8UDmKaAcxTtaT+1UgV/39so809PgYyxTGUva3/Nc5qSNjtFhvMnOBDtha31GurDz4XjP8HX6EK42gOc+uhN0fv2jn5WtGN6Ok1SqPVwViIObpxqL0toBy1snHFkbZnV/TX3qFa086AC2+oO3D5YCNvmPj9a4wsGjiz8wGh1QP4sDrY/4naI/M1a4c06AQdZuLQJvPLD8wDtHdLhGiRDdBHvwNwSfk83jFz+Kb24dJ05aT39N/Bfl/dWc6/u5y0ZzZLbtcO2URMhVzFyrd0/Omz3D9x6vjmkwcAOihfV4XXptFUM4Md4m18b/o5PULhtHeolfkW10vDZ4kvD+KKUfkDa5/uvOUYeLf0GT/fly+7OztFSXlPpk4U2c9VR+pqgPR1P2KcCmdMri3ryFotKZqFTlzaZK4JkmLIUSPOrrh6qxq+L7nG1Ttvx9NKxWthWgM5PQz+V6yDz1Wyy1Y7+Zg3erBlv1uHNuhzCcm7vGQGQ6PoyYCPDIAsG/DYCPjl27gNWgSwRgw4qLxcmhbzHG9kfxEnA/FPQstKMS+uiJoA1CxKQjQGjiCXhavkJFgjJnJr2eRNdMUC2jlbQC5SP+uxFHH8gkdu03vAX1koDc017VlurzIvHQ6stET0z8ZMP/KooSjeCLOc78a+W1oOUPFQuuNXaan+NeZNwOBwH0P4Ot9CxEVDSiY8auwhq6Q6DcTgBFjjk1jDG1fEUoDG+bPeUeZODXch1ppmTLJfOlcf0IMJyj//iAngGsNrs0ydnEWs/1MVHtw1EsE9lnJKNEmRAHwaZ3fs0rjLVkY3umEBqGLyqksbA6KvyvJR+ztdQjLt+hqvGDOtKr+nbSSkt0a5Cy56CbI+IxLcGhsNkE0CYcDqWdJb2TFs31+jz0Bg77Y/aXQwrdkRRWSQCbCr7umkeJf0A9CsRLIN/PqYABFmzR19hUQcxEMsgK3jW8qLCiSTt0S43XAjfVwzXW8g2+AC4FG552kL2PZCWWcJUuu7f5x8Pw3dogG3B/5UV+B7k0TA99tNBGB4Pw9Mwc7XmydJrvMFOi+jGfMla7WLFED+taKW7q+/YPbu0pWOa4OPmW6zwqEGxlUbF8tkXDtOw72FXKNqbGwxRwtzZ5KrDtql7NQSOAy4cavqZZl7qGK+fsr8Bw/zbb/b74fLfJsuO1wxrFF6LVnxXS/AtKHx7J2YhKRJjLD1tIXu4bx2jB+bTaJJ9YooGUWJDmkWHDELMswDICbDDoFa7F3/wlHerhHMEHzOMLYQNlzYNbBb+xk2XLhb2gt5pDzcrsR13cyWFVGNkE6bmom01om1udqQBy3Y9y59Wk2WMri3fZG9IVkXSN27lVisvB71JFXpUiHprPxEyuqf8msoWvj/wI9qwc0FRihNqiQDzwoit9Hqbsg/OLoB/BYMPCPnZibe6IjNtHceJt2JzG2VRhbJoe1ItnQaZF/Z6QEMrBRsTjG83Smcg9aCYxP34fAPinB1WDVlNbqVE5CA5AjZ//PfscnoWRCk6FqLg1MebmtglSEYpX1kM9lWLpzYxbdQwWMWk0cQF/0z4BEEASQGvPw2AIxU4X42Jmi5qBxiUYzX02zGotsL8RuF0BFpyIi1iUW7qZeZ50BQ9vfTTzLkTg5DiEmB3SPZKpdTqR0OWxDPctKEmrrA/nSbxFKRgIEWuKYqaz0dqaSlTIgqnl2EwHsK6xkS6QxDcYYZB2sllwzBFseX0NEhgr7U2fTE8ccuR6e4WiG/5vI94+I1XdKQakguP1BNU3NbJGDdpalR4ArTEf/Kz8AvkVkXxl7IH6JQ0CpOUR7K085JKUOToWi4n5rWrnLoF/8s3dh4+2TJxOWAmw1BMT7RwKGsJntF7V3r61PK6WD4XswMnQejQ1RpaiCaM8cSpDmLcnLzW0VHUKiXLwkLeF38eQlsgeK0CHOa2lRcaBQF8aUFyNvcNCTT1dy9OjnEoHkhcTfaxtrETcfretJQtc/htYyeSBHDhJ+hCrIw3s4NH+L4gOq1VsDAqSRiSBNu1BqZFu3Q0gPjpMeiTwchr6/7mkpS2qo/Vz9XHWt7H2g37MHzjwGmRE/OmAONngGjAR1eIW8NWewZbqa5fd5AVA61cwBsfdtfTIKLjMuoGXdEufEdJAyWLyRTlradBmnV3RzAF9EFw6xfs9EONfVOrQO5RK4N2M9pWBJfvKXZoHvXUXMugNtwzISJj7dz+ZxjkM9E1xlkEvrCxRHHUpeJknUBRwrQAiwF0cQCWc2iRACZ8yP8ZcmcljxAw5yF5PNqqANpZUPSkq1j+nFu4eb0A4z0jPvErO/6fY2/Ds//GZP77EgB4qJuvtqtPs9omUSlVfclj//JPybY5MvCR3PPMmkdLz9AogVedSvZCtOQifbQrrT4A2IA6Iyge2PwlOwEtIExJDiRrT8/QNvFxKUm6KpTrKMci2k/Hw+NxnKaXuiaqezQUM9smtjiLDMEThViEA3qXgXzf7O0AiFGxDX0tk4iodMw566bNvkgPxvHiH5+y2SeWzcj1giQZ0SqhuWgW5cYiIF6z0cfArZH5lXLGq3kX7upaTRK6GA/xEA2uBfVaXANjOFWg9Kx4C95/R42qfdvufFMgKUjHo3VDuKpy3pOTWgzf4bnfAgidYYSnKKGLaZp3zRxP3n27UyK9mJ5BGvNq5Zi7bEva4qdxGGWU5lmOjn9oOLjVusGtOga3Vjm4f85SGBadTc2Pt4qM069iY9xpw1Gu1Y1yrYCFTkzRFA8DTbSetSKWDUj4STX9nsTmy8nwGOPcsWyH/dBhq2t5dvKy1LtGLxT3sSbiPj5jP6tryys/LH/+XiiQ5XN385I8YaurHfYS1fN5uluH7lYX6u5naB9Z2Zy9/TxnZ8iIue2SOkGTQjP8rlDqyvDdZPIVDRwtbfeX30K9dPnt/u7econx1JY36uJAtJ3EDZk5BiiGdIzb2mUvo5Tf1nDypP96l4tAVZ6vKoseI+uKKCT4JIZ4FbEWefev8YeAzabsjxkIC6ChJOPLDvLQS5BEpiQRWQFenrW5HqvdVdlXpDHMMR40QzpXky9hXRCY7LR8wzAr3fPu2eLKAgFc6/Pn6NcCauohbG50IBBujdOYMIChbDoOhF16CNwtgGbO/XEQ2cqhPJRFFbjl2Fp8g4fcYO2P0yEsuzjr5F5xfRTNl9xcM+im4bJBydKVW/l5zpAiCkjWskoks/QPTNrR72/HURSQaVoP+Ukvo0G//3IGcsYjacnemk7HIT/nzgOc2Vk8Jg8CGkP2//0C4T1QzYHsexZGoL8wakYYqbfGFCfvYxQG8wd0rCdMmQoWQlNBguIg/AvvJ1hVajpRzIBxUB/DELtIeZteGgTs6db2v3Zf7RzvH+y93T54u7cLCwEVV1b8H9nu8DRgGEmUsvsMdhafPYcVPQXFQ0U9iMgimOM+TU0LKxqe9PkUNnJYqTwO4WQ6dtYaUcwb4g6onXlFMo/vB+ORcT2K9Rsf1as6nRXpzPfasd7LMI5eln7ERYZxodHoCuV+PrZr7rhrgUY7yFqPaOi8yHbiX4yD5I0fBWNVrLeMeUSAvYNYuayXMKr+GicfKFVERWWzjFH9TRBN/XFFXa1AixBR+VFgrnKvANgAUzlMz+KLfTIUACNPg2w///0OaFoCgnulJHcSriGxLW4Mw3M2GAMpvoItcPNoyZ9Ou+lZMB4fLT2WwL9a/g5Px7wIRhks7Hg2gQX+T5hkM4HAAliMT+u7ZWUC2PDTcBgY7U+xTHcMTWkdQEljSXTEiKOXfuSfBmJim1ceHSE1p+sBMgfta63ismp8Y5lG8ThnzjiftR7bBoDDqOWMDvyTE5iMWjzHdPAoi2M2A2rInI+JA/qEtFXbvNJ+XJuz3h7Hac2k+bpa9V5Pg6gJrNygwhlakFrvsb0QtFUFKI6iKePrgidy5lj5JCTFVweVThOuZeO/AFHpb8RjYkTBR6IpYa9B8niUM4YSUraYxR5yho7GMzr41+5oFOBr+PNlMInpj71gVMFPoEBOD4kq+PfMBzr1Bx+WqUr3nJexqxIzxSA+xRB6sH3Bi3TZF5+MKqdBphlWU6NakJyHA7zGje/N+/y3UV03ympVMbdQahTcp2DBDuwjIKcMfRD6ts+C8ySOduKLCENnIxAgADAw0LPtC9XWeDaAdesqKEGLSB4jJCl9Ld4k8VQYaywa7zOOt+i8t1abcz69mT5fxd6z7Y1C6xhY5V3ZzWM8mjyEztu7YgNe9RmZ2Dg33bZexUBYL4KM/5hyGugwfzg8iPfiGQYq/nsWzHAVN/VVFRY52RF5TncI1QB+/I889JrHZ0I7ySW1Yw5LcHDB/TMNB2jAOlLo/F/3Sx++e+wdvtOHdDiOfZEdK8he8L/du4eqQe75l0E0Q15D9fb0N0bfXGBjn1g0G48fe/hfo600wBi3YKggi8zKfOdoL58GNqVOssnGUMrFmuziLIgYcKgZBohFp/wstSJxz9OzERQ7VpC67liT1rveP5uNRuMgPwInZham4suQJvVc/ayBbsqL7Qei4n7+26i5oo0BdudnAfk7kQSVuAlSAzcai+nnvSScbN8KZ6mP4i+zwSGwgW8YQt4GxTgX3Hhb2B22ceGHmc2cvCp8z5UBC3vRq+8rCR/Lw9Q83buPPcfjoEfn0rzWMx8U6iHa2tEjKChDHHRvQc95W6MQ2OJYm4M2T20thLwpnaAlKKND0ctRpWrOOuagDDIOYZPq0mYpgrPT2YkgGnJhwx/5svHVDIZy3cQWZY4qHDHvnsZJhHevLUU/nXGIyfLW/4AWjXrxi/giSFCPUH4FRxvSMeFlMxpGNpN6s9lCL4wG49kQJJA/2jmwbDamujcgddITdIZwAXaPIVvjMM1y0AzDlOu8lbDRz7Yd9no9A6Ay9gIBmFOvhnXoDA5BOk66v1FUsSgiP/MDqgEPulUH3U6zM9Zlq4/g7WO2Av90u+aVlTT836HKSwrQG8eA0fRn4kfDGFaOfSd9f7r6zOuh41z2hhG5fqpv8FpxVUIW/r228O9YGDtQX8zAL4ELM4VIuJ4GRDvM4IIaJ9MWFwRMXXrah1an+bpOfTxni/LXphDENv5x8PLFTni+Oybhs7ipJPGF3uCmJZ95VxLpZ+gVNhFHrJhQPIGb7A+SeDwWfUnJRA2qJ84Bi/JBmoVAtcE+9CPLrq6uiK8xemUHPojQP9Cbaw0IL/0pSRhq68KwORIyGBon03x2HPtBWylFcrEumsBCaUs82BXM9DsCwrybTSnU8Egmb8pn2gsxzwbggX/S4wWeD3M0FF2ZFkzo8fmwTzXkL02R542gUtCXXT8Rf/QoUrXPWm+jDxEImULVaKna15I55/zDJZbp2PUPICLYnRMuoiFYVeQ/sGncLvgYcbgalM+oGpdrZHkQJrNZXycZm+1a0owkf4TfiuS/j/Qwq3RGFqFt4feVkfrkJaM9Tf8iN2azD+A6u/7gDJcXp/NCQNxcaWPbZkWp1dM+8qCMQXI5zWLBg96+fb5jRQLwCAUNFrDgM6OEOR7jUxih6e9NnJJVCxYc9smWWTkEpM/8ybSP9qugR5ExujlIZ4U6FL//PudWSnJIkj5l8LD5bi5CvM9FCJL08A+BGN9emTO57r+HjT1JjNicfLH0AWjYmiOJsbAcM9SwQNVKMu/9Pp/QaIaiCo2HBxRQjoZvr/T5XrNh4o8yL23fe5+LOWbAYEWrFe2BTMlhgvvat1fasLUy7zV5SQmOhjqgsedqITun2QNY/FGCvIB867Bbc3JMbPp8w8/fAmHygoBJF0HwoQX6RmsCMsgZ/QUCX0snB7FzxmiI36SDujvk0TWEoamP8bAeICePv6EG8DbnfWGC7kGJfTpPtdZh2skQIamRL2OHB1B6Q47F1Mb7b6+GGN/+DMDyG4g7Xvu6++0VNObR65c4bGDnuN0bH/gY29fvDWSaCgjgGRmaettm7ySN6vOkiefIK4V4hAWV5Z1deoUi4WhkliE3eJfqfo8pBS85PgM/7z4ENr5qtwBLYsGcN5aKxrCHtqEVmEq4zqWUkN3XYO3xHnRGISRwoxSHgKJSi2xssHJEKsCVQqV3zOlQw+bidph6KZa2owNmgTnKjm82y6t5R4Bk7OoR3xc70SmawwsAsC2UoKf+8DTYRtsgEgdlHOMqj6GAXoTEvOGzDnvUa1sy5KbVzwckRJEWqEzTrirwyKyoB+SUVjYKqQaEobGskhEh2HKBocbyLmw9XWFT5sdF0awMsLkcB5tXV1JUBS4HYvRHUGzxn50w4Z4WeD0gEy18OAvQzgpvVldW/ga/T+JkGCR78uX0I+zfY5DszgFFu9DZOE66vEy7xa6vDdM/t8wehBmIQPfZP7hD+uksy2BZDZsvzkiNFfgWKtXQG++DjOHdB201mKcxtDCpHU2nOOvfZyBmjy63ZVxni7d9EmTAAXH2IOefRs9Bc0kRJmSdN2Zlj7XQg6uBDjv1p9Z01tpWu9Dy2Vre8AiGyHUBUQ3DmLrjU5wWfvtVLhP/ekE/uyng30k8HmIpAoYqwEFDjUxBqfeTSz6Af4pjNYKQN5bP1oxBXeVqGB2c1L/BkCk1omvQqytTBAdGX56CwBDBPtZKTk983PJWMcXg6s8/d9hKb7VsqGqUCgX9YThLVamEfnbTCZbIUQZR4iF13QRK9hLgI6drzXQZp2oU1j0huZehEZY0w4cTohRzHOjeCQcfpIPmyh59qQUifwyTomm6yp/ykyNmdd3CZ5XSzI8ebovnXC2EP0hEKXZpvri2fkto2tV0FNOQ9UkJOjELz9IZORi6IFueY5Rpu1UIWxboaTZ+cRZmQaE1k8AKLXFMrudcdj03S1xtMwuFSjp0k87ENVc33/mYusAyS1IiWwqoRD7nasxNgpMAhjBxNGqTiv3dyV/tQkXyAjZThV0WE9jIfVMpwGLzanXtWttxr0xMSKdhRIjQus5J/iIcYuR+a3WNmFG+q+Jv6F3zV/Jnj9Rl6M1gAcucBxhlm/MIy31lEZQuQpxkUZfr5anMtSKfJnS3IEWVMPw7qvmvpBqBZTX4a+6U8pcuNQplgmL8/hQpsVQ2LkJovW0LOUYf6oO9u+M8uZecPadk49o8CzPNjV1JMKZD50VZQTQm2NWDa2d1/wTgMINtq8Mwjgb07BVUMqf8j1KBMQ0wjEyKjBbn2qBU4yYmYETAJmb8wzhY89O5P57BsDRvzXWBeZHHESScQMag2Fqm7uzps6DHrWw9ahs0SatFWNxBgPF3QQKDEoCS5/56vab8TnF00ovm5Ya3yNbm5k5uUlkz+eC6zRbZOm1dTVh3jdTj5o5pkZGZ7GXZwTVMCiIj2R6556sIaEHx22gDawKZdBpRI0alidAXTYBoRJE/3Zgg3SSpiJLH9tsfJVlKow1mxgF5xi7WjDhzy49Fmp94MEeRRMupro7uFqK8xWlvAeprSH/Fn2sPXfS3EAXOJaHYipfF7y1N9/8moQgb5k3IRJlB74gEn780kbi3r9xZ9UY4q259E7vyDlsHeDrgV/TwdBj/Qe4E/IVHDHAULYroIGt7m3v8x/5JMHaZmISPiwb8rwB9GFSUOzzyrshEQn/0CwV491hCeNr63NNmWYRMq7cGXJfOi8+H4HLzijpz5E4XVC3qFui6YFnT3YSemm6RJquokilu6Pq2EE0uiNk3IeZqcnaIcWLqtjHYVSin+gfScOucc63SLHucU3EuEjI+cfQynqXB63PQGCQL9wIZsXPAuTUte4+DZhthCKTgNmi4kEZ2Mctu0INctGIHBas2sAI3ZThNTOaRSGbuRW5mJj10Lv/O7fEyZBMdzYvXsRxz8Nt0pxUYGzkFy9hamG7xCMFNRpf/IMvCLoFX5ZdQwEvaoPvmO/hxKwwM2nHii8GdXAKFcUuPMfZ8uC6p4nY4mALdnIb3ai5X1qqq7DTAa2LfV8cL6wQLfEoNlyufhz1qbkNXRRzsQeJHKYYIoD3Mn4YZRUQ2Y6guZuTC8sVZkflLNya+xINX+5h+acK24L/lBkWluGCw5WgcX8BMz8LhkPzC9crMlTgNUfCSlhrzNJUGo9pgVVacDtMVPLHbYeg0Xen92MyvrTzPbn/0/z6PhjTbFYdGZjs/1h5cG74C9HfosQWVxnyHwdCSjdvGfVFXzqBaFR1UBVkn0fyE8EIE3kJA6DBoqDRa0HkVq0yUeSKhbHDWY1zlE4H2lFFSnIfCI/sywVgJCICLFWZm7yWjzSsVPNzQNWrFchTU1BzR/VkWOwyHDqyvNNnZqFSYRtVeI0f7/tsrMw4bI6AOYuA4yEK99vX043sH36lTgRtMpsi8CqzLMTTxk4jME1KGOLC3F1+UXVsqQglnmNbQQPnDvG4vRDJ1JXakkxp4akLIGLjDO4pJqUZGVOK1anqEJY/PnvXE7RR29TIBBh/X2vKHpBhtEvC75C4rPKzTpTkaFehN6fVXQAfWGkwCH5P6ikj7kopVMg4+TsZcVpgsTyuln7mFqvx7HaqKTvIt9z39DUgb/OZ9q4OKbK1AEG0XRYiJNTGsPCjZ+t36kXNLx6ccKRgG/p6e+ifjksveUMTdgSIUGKt0otLlYizAfA8+l0sACQI6ZbU1Bn5G+Whbg3h6aZsUKurzSFLfa/l57oblj109GyNsGv/cf/2qxyMOYb/Fc0tl17dVdYHbzDLlqcLNSR16Km/KvQj41KH1zfz0Wis3EJn1FuayCcrHjcLrlXXqXOL5U+buLa/hVFcryiv5/DTxT8oLlq1yCbHVatW3EO1Y6JEC/rRQGGdsroc4LY9qVjXH2DdXWtlSLHfG37lGVhM/SRrXgpKf+VyJPIrkAXjLExQWHQGNx1+0qVjdoYVFZL4zDCtWM6ZGU+53bWJFZBTito840yeTSxcTibV4Gtl/mIqkSJBPjVeD7irnd+XTaACNF5g8F6SBIKHLyu4zcSiJcR2yOZRuh2xk1MkBSga1ISeCofHCNh/BS45Ow6j4cbUOtl+YBmgJcD155Bj+fEUnXm5CxxVV546KKbRQZnjTn6KlzTyUpEnTyrJGIrTLsqY/9Vs1fxb0C+jPgj4CYxQ33vD1dua0l+nPwlF89jOnEU5/mhnY9Ke5+MGfRhF69uOM2KupVS5K4lNJPhRmFg2lp36l6FC3H6Kcmia11DCNW9YshZWbtEarxcMLhUYrlBf5NKXhOfXJ/En4tlquO+bPiQpwrFQjtQq3ognk3d8Og7iRZpA38XH/zB+SLUvQA/1sWj83iDaB/CSMfpUq/E+lvk3zmZchLKKXyMdhwW4wKZI6VNRsZRxw8almK7WMpZkxtxCyKI75lAk5zQ5KzRkufBuSE3+4m5ft4IloTCKX1sKoEHvleq7yPA+V5vMvtw5NQCZawI6hJPmXBg3hSFZ5OleucmBgbocGc20Ez4J1vqSxRiO9qe5hBkwUQ9Hnw+UFItcrJ9dEvs6f2pAc91MU0O3EABoB8PQlPLuQyinSrhPV80ctlQEqvDlBQTv/XXOOsXg8sihX5gu8UstT5dNwdSh5Kt4RvJUfu65+ShyypcW/kuU/fPcF17eEj/2Zy7w9DvzkM6xwM3ZJJQ0uN/E/KnPR6g8cJFJE+U05Hxufw2nOj64KjMDOY1T3SAfaNr+ZktKcmUl0VGoyPWlRlVPAfKpcbO5ng+K4mpcXDjl9eI2pA5/mKo/+zC/u6s9C2rD5zGujdz35ZvvQsdnO19YNrA/mcwu2HavBuY0b5oP3E3EWrDjlPA00ZX/8mSc0U3F0O25SGdKa7xN63w1iNo2uCSbzdNWY0+PjPsRQ/Yitl+7bBdW5+ebLH3FPLx6EFoxxLjgaByTm48fycez6KsXAvG2xnL/PX5VhCjroWKWyDHn+NBC574ncd2pTWKT1PiWbxB46RmPv5m2s+ZbEn/nIUhOkCuxkzqbqbIrmc5VnF0SH5Bw9bSzTRtq4t6YAdEbYurpfTJgq08jn9EBZ+/PXpuPB8DBUZIgnhcsTIzZebefZDiNFI4ZyzK00NEe2ZhE/xUfXSqogYcdHk0AggViMkl5EVBByx9yj0M1ifZk3ZR4QmErYvBVv4HnKH1MQLInCdj+6NrjazFSsV10oYNv9SMZct4JRnHV9HkdFKza3WHj7Cm0cjcJkwt1JzCvhCdcNN9jPovNu1G9bdfylvquqFqprV30t/1b2xZG7yR6a45iwI+67+MW6ruOR82IOkbRMJBz5TxhcVFzPoV3KUXe7D6VR9rn1eCf0x/GpfiPHLAm7/nSaLk/Hs9MwAvaKJewLNp7T39jTDJNY0y8xXryvtgMa/yQ+D4wpzHsRR2nl4lUc2OcBsOEOezPGAR0kfnq2pt2+0WFbmOP1IAl9vLKLruoYfNgOkwH+eB6N4or7OYy7NYqrkt+wgdka7bszDlP9BqLi7UMbRoO3cv+EvKqOqvwqflTeEpEPlme6fZny/vbVzyaXVuTtjPCyBXmdyC1fn6CjnmckCpUX+Cx+OwKNWx19ECv3OW9I0AGl3ZDwzgQnl+T4xEvBKRdaLSkzV9DIM+yAs7ocRMI65w96xtMM81zCfims7DKzIlJgqm+e4oQIaHZXlKEdqlhl8a7JIMKrDbFUazLEc43Zx6z1jl2/01qS+cjxfvlZoD5oWaPVnQ58BkY+QJFUHNMm4918gA7RIBhrmQ+1gzlQZjfCIHt2EQDQzwPmA6dMEv+SxSM64cLwauzUBBy+xwu0EdO3sHAvTOlfLx/Qkxy8/fxSl/zMA+W9lu1Up0UvpR2eFj3DIyS74tBOnjFdZccfjyWiyKSyh0jbh++MVjhndaVXF9c4mFOX4KHhG+C3Eqvn96ukCs8Ku4eChLkDGzP7fhPb6FHSbxrko2In2Ayqy9CTbLEH+mCYecuHy0fwvFtu96YxXhuH8a3YtRlKr/+NK2T2WEhOzh8Nwvx+8PffXsmRXCvAYgAn3l8oj1eNUPt5bx0CdPUvmTuG+ui/JdI8bjKkXq9n1EW3wQUl3z7UBvuOfXt1cf2+XTUqHU+0zO51yeVvbYmK0M65uRAPtBn14QeMpzcBluifUlgz/Lw24H7tYAyUb9QgCRvMWMIkPQdylPNjDrFiMlKzhpmhXqHSt1d6z/mt8yTPfHtlDPya4Gxkw6+atA7eEgTTtx6teN661qRju6vGFJGZX2x9tF+LNbx+f9Mt2bjIIgit3VWiozP19py7bXNhZ16+eAtUpC93LYOrxmA+GuQqL8IUYXk4B+/TDwAuzuxk504+58R4czllfQ19C2RZRZRJ0NXo0oSnokyT9hafrD7w2nle35QI9+TUPisdotrYjApJ5htwo4nX2gKp7TKeMRLf8I8LP8rouhLeJN0ezCX6J3TpsJ+m8SD06ZIP7fhbyi5C+HoSsCFIafC112prsFDCmAbSz8EOOAtwaNEOJmD21BIKM687lJe/EHr2WnmtxdEA2sWD4beKBI7k/zXOgIfN07/LkeCJGtTYZZL+0iwJt3VapiLa9KEdcrZRMCWdrdaechlXB4Dm+d+l7iUWfGP5bNXsbHrDE1VGcNBcZ3vE5g40myCVB/6kG4/wgod0EMazNMIbwV/6yYchxs6D7oGGHme6gWlpAl6nQ0e5S3T12pBu3R6Q0nDCMn+DhJnTKVBp+J8zZnzBQ9CNM5cuYKqvC7uojqBpECFTHwFjGupvJbRCrHT3DAO87ACLRQMoarNqmQSLlk55lOShfZRE0BRKejpNWC4BVyoZsZOwp34UmSzyKjcOWudM7DMlDeiGkr78tIpJX37ssNUVSvuy+kMBf2rOX4ghlVS7IeGs1xFOBXsvFv4CmO4OmyqDUUOyvy7FQM2GXoqIGtKUZjTSc+MgCkphqnht+pVDJr4lXFz74QdAxlXAwx/4lS1F4Nbgohjb58HFGyKfCy/KxntjvLi1u4PqRZtKEcuRXQ9GZziCSvFWsVCJjKaoUZDVZuOCvPqC8qO01ngo8E3y7zvFpivDeudddFg4/Mh3G7MgBtOGPDwWSlw/vrq43lgeh3b+MXMT21iejUvFKZtgDzAAg50mQBClIvU8x/Ian7qrpC1+jVTxlFh5RjPh8Pnq0nHdbrIySTPwfYVRVHqD9GWs//VCR3p/BXAe/HStR+UbUy1s6CyGP8MM6HKlt+7Knq2lQuMA4KpHbsy6BHGuDnQmjDIil+IlOvpVdNvxeOxP04AzBvrTghqmXyo9kebOULGRnYHiWwh12MgSjU4/w9mqec6ULHKZGc2sDu2K0hw2hbjDdoLMD8egFGdnt9o23TV5260KM/9tN/vCTzP2Mh6GozAY3mbjJtbSyW/qcIs2Pvc84GVi4+6yC3k3spN4eFnMXyd5FW2NqXtX5IhP+2LaC4fXC9JAWVDpRjZscI9PeUhqMcvNbd2GeIVXmAujfGXIVIM8O/McfdWtQvzCsAuA4dMk8D/AmxP8t0u5fPMxoqGzYoyAFEV21hz489oPzYeTN7uiK8bhr/8ECQYzOKPXbjzQBlm/a1OUlszjyvBRfFkwlx0ptDCsYvD5Vck9EIgyycHavSx+EQ/8cYAf5Z3U1w3K400BovzhO4yuOwNeghjbHYanlB5vEkYzvNJCvSqLhr8x3Nycswm1Nks+7jBsY/EuXjdfFSxfGx5PUUIgmOY+IzJFVUTGu4PXhVvWy7lBVXRok4h1xwnYyuLN47IbIXllA3MdUSvLGNRkPguFi1cFPM9hVR3MfYuA3Um9YdXZh70W5V1VJR8rXJr5oCqNT20U9hyURG5M7r9ZgJCw9h0ZFZ+/FBmRT/a/gIh4fPZtUNDcsqFDtSgYv6hUQbGAd6i4Vwb361Yxiiof+EnBKJY34KK0RfNXLZKpai7TdDPDdJnr96FVrsod4r6BVC9hGJFJZKEc0XqhnM50OyYtSm70nc9ipqsu2On+GYiJH3h2C/Mix5tnKDUk4zlzkWKAfhydVs+uqOZwhSZlW7Ms7u4EGTdNs19m4TDobyzzRsvN3mUrv+a8zKHG/P2AgGxa0lcfTl1nODfGoRg6W+9T/lg/jFK2MYiHweNv5CU6G8v0GwMIxBf9Sh35Vd11k/mnac9hJtc6W+2zp7PxOAAo4kaTmwkRIMw7oW8IlQ+Yq2kcfghEz93CWL4Tb9o1Xa712RtMqA2ASfzTxJ+epSwN8AeF1V2yYDLNLgldUgYcJEgYpe89o3gXx4Qqzfxzn1jiJ9V2h2EWJ3OcVaK/QK6qOLMEBbbhbRY8HceDD69i7YDT30/wVQSvlov1VHEK+3FUmfhRBtAyKqWDs2Di5yeOlql4uszfG0XRecBnLTSoDkv988B45Tz3xE+4u449wVS3ptN9AKF5YgpfpMu++KRVOVoqzmdZbOFperREEVbLyyxIAS/UedluhPSPmML+TgeqBkk4zbq80HIUd4OPmCE+zLp+dHkUjWYR5wYRYiLeSPAiOPUHlwTg1OMQooixw3dt8S8PAaMwPfNcBC/dVvc68N8UFma84ea7k0LQ30le81H++qSH8yC/xNESXQAxRFvp5dFS2w6zHdPYyWewyU560ySepk+kFYQv2qdP0AoBT68ocjrTNArHPU5Uinv2hKkfeODjnbsZvIBLa1B3aj8xu+ozTxvzEzxUg5PtM3n/NLcV9LWZdTgjgkW5umbX72gYefSfgJ8mefR6vRNt+ySY9K14U1I+CKjPQTpRgDPeI+RMkHKdhSztAqqdYqv8llB4rFblBaRmk/JtobH8ejBmNKYYe6Gpbe3L0ZJxr5rR9rX2t1ib/CySGRBawMZ04I9G8XhI1FKOj6jq6QiZ8t3xBd0sqQ+clEI+4H3RNNvnhQsoK9uWt3Dq7Yu61qJlqqxNBJ+FGGCvAlLljMSmCJlv5KMIRgVG8BE9tQjbeAR/0wVw8cnvMPkWfvhIYLcD5GGrh10TJInnEXG8+l7ufcTJq27u6d3Ah3t5Py5ob5+F42FCN9EUoCI+CbDIgg64TAJQxoZaU5gjxWy/g1Srw++dNqDFSFyhBFGQhTwm3WrY2Wc6DjvIuwHTsGjZQW99eyH1IgIk/ZIdyoRmu4p0S5esEAcO2zXBtLZ3fd2tHo2djA41UnQFmS5Q32O6VPUGYcdHIXPkyNB4qh9HvEOeeAh2DXNjRsw+j+keJCy7D6IKSWCqOAgvpOKdxDEoGIBf4qSUEX8vWrgunI3WR5qfit4oTOAxHpQ2JtEpDr7jHCO8vS4csQaMyEJ/zGvTweXn+hvj7DKXTFxHl0FEWu2xZ3QEWLSoNmoQfCboHsFyJUd5Bf2DQLitdnfHSd3CkcjiwZ+CUOm5Mu6hcmGsrnmKMz9Xwgv9M40j6/hI4WymuvfYT1I6CEwXAdEvu6VHZr0i2fA22oWziEwMGlrnRayWXKfg8IHVAWicB4BsdKcQyTt4vkOpQqLh0u7MGYgDUq0jWPyjqCVuNJtyg5jD9MnFrZbqzX0dt2BTSjyjS5BaUjibWjJZ8WK2wkVLhl1Kns6wgxlvY4b187vh7Oy5aTO7NpFWCP/mKWjTRiZnnA9FG7g2UjxK7j70JWQPya0R26tUm/YjQsFJeIq6NkOBiz6w9MwH5Ukz6VnMx8u70Odv8jpnIf0sTtvmGM70Bcg4BEtVMMBz9lD/UcUImwDROM5J/yhJQ2N5WgoDlcJNslc6Q6v3q+4YVpOz04TWG0urrIil14WWGhJdBc6snK6GsjGfq8JpkRRHo6xlA6nCZYUR4HUemdoa4HV5BFq+1coG5EpsXhUyoxrrsXll/FSFTFTdvDJ/a8WsrRpLWq9E4WXDkKTLOoVJ1Ak8xpDFRvjnSEKcoRQmoMlB7smVCEOmTHMz8Sjd8ZMPL+NhwGUj9dPII+PZZhah/FyE0TC+4BoQmhRHIHcPW0VRmJfr0T2xL4Nh6HstTFY5CpJUOjDQfgYABML40Kb9CIoGqVMcxoORuURcK3ZhEIz/71mAt5TPP5JHelPcYYqOLw9KvFQN46ng3XNSaHVpzgCoF8hJqUOOmoEqH2TPHw6pLWw0iAKdv1eU8loDWmXgzmKUBYMOh43WBj8G2rAZW/gyx6Lqz9l5Wb1ruVdY6W4CIg6Om5bVV8ot3BQreKsgFcXoi6RzbXZwRffDAhHDKGcqWdWzJJ7sae8BGpu6NdbTMyWhlRfVYiiPlutNYcLe2CNIHADpbAj6AQQRBR+XqR1rPZRt09kkkANjf9AIQtyYKOEKP748DQbhKBwwnvFb7hmZf1JPIJc0J9rpxP24cp55Ulf4yNO6wh+9jHzBLwRPos3aVkMIqbWGqxPXBMIvgBeF+vYomTFCjKjb9Qdn2pgKGhPx84P4eZSCTkBsHeZl6jck1NBkeGE0yJGhwbAOm05ObhOxKjmteOyJLYhbxhPeimlkKxgsC3YUUcsy/bkMfXY7pqFFtEMvD/gBd7x5uRcOzWM8rF+YhtlQs3YKdtySauSPevLEBQjLdlvSgCxlzsKSyyQnaLaMh2Qdt6Bg2detj6TxlI3Qsg4L8CjdyBy5qSeB4Octhny5CcqeST6XcrzHx2UP1Jd2bozIq94AK2hui2MGwbhKly1T9UtWngrMv/oECjcG0AitTNfmb6LR67auSmh2XmV68tOMsAP4oOC1w3gww9vCD63fklF32aptMVKtWCq3aCEkdisVR4MHv+vkQ+gA+PwRbBZHS3UpjmQKm6R89Cvm5fA8WVriHmfDkeb1cagnAWw4gTlWt4XiWgkvue0fdnAUw1k4IdEnC8aXLA3xvlZpPoS9m5MeyCb6rjyb0pW6ucHQunnbAoRKIGK7mJWBsGM12e6RDcEzTAayGcsG4ehMzU9EH5I3mjzRpqDCyzXdwd3iFmd74dAAMJcPTWktnysf8TtNklrvsZ3gJJ4B8Ic8jgVhxbx1xlXytM2+Z69FXn4WxWggyIU6Lp9y3UwU2TStt/Ug46UstYzyvHRYC/g5zAN4fCuHLmKzKU3KaDzdTYiX3YgSZaVzqTrHkmIxutxFSqRecwP1YE4cxYebs6uw1XEnfBF4lDWmw97j+yHzMaObiuJ3xu239YxuTc1oObaMyKDmsJyVDq21n9djR7O1ldUHKP0ml9pqG4wEsHp9ZWVFoLiOvz/0gNhOUWPCQ3k+WpGGUiPiahsbC32qQuinMAleq23mLBKMB7SNk5zTypsqbJm8SBCeRZ6W7qdqUgdPep6pByMxF4n2QY89G8/Ss24cdYcB6TYoDiyzZy/e7v+j+3T32eu93e7bVy9fv311QKQQzaYVk3ePqBGdzUVp2rYAs3guuT9lrD3xYZ+7SEL8OaNsubOIPEhopw14ktEVntt2HKeFjKKRUmfnILgqQtObrNwU8oWq4rOApdtZMv5+H1ZpezKEfyewKP4YddVBwMlIaPu1qikv96/gki7HVU4zEMHg3UkM+O8wu+BqYtwyDAJKUSLH3iTIfPjRxjiAoPchuCTecAHggMXAjtGElbaM5Q7o1hFoficY+bNx5un03hBl5kQaQ7Ao3Sr2yf5oMo/SdKqLMOcF2fPtM+gKFl1g0i85llWz6Vth1MXMebnMLQyMRfMc4BxmqVKGNYHU1axStOY01NU0WE6snSIMLCtbHO2AvifMnNxGvZP4pwVaE/5p/wK3C1TU/AO04IyCpHcaZLDGvtfypxgr6KNZYvljV0+npyBKOxK2gtEzzp2plBQdeTJnlnPav7BDfurMQ3UqcYP4t5mt8Vq67qxcrbUU2plLd3UGwJj6aoWmynXUmVMddSqiucp5rUBpgvSmCma5enkLymVRtZxXsaxUK29JqSzwFDfnM7ne0RJRKqG65HoY8amxPUdCTaRv/xSPEtXTOE7dom2KCc7vfawkcW3kFfup1cEQ5sSFAjxjNIinly3XZIqJIWV7nIGhlxH/vdZf83nzT/xv9bnoRS73IdffTY4l+mxVe1N2B1LuR7Y+TMJIHu3Qb2WvOwZkeJbnP/tTmzhHp6M5rmJ0n3VBaVgrJh3h+UkD87yMAKoJGj2Tj7hLtWFWhQ3jFECRqjev+L9GrE2GHkK8+0/69hiycXQYHi0x5LljHNjRklZpefGTE2/objfKd1ZxcCI/LSEIp/LAxHynCK7YgFxtfCTSjiR/AaC3Y5BjUxjwEA/MdPAqDvOV85wDv7TOdc5BNl3eSPGeF7zBgd/wgjpph70EZthh+0EEcs82iJioLXfYL+P4BAZ44J922NM4/vB6ipGy22fBeRJHeJaow+11DW980dam+qqXK8ZnC8PDmJg38gdepPEquOBCttOrmLeh7obgtVGg026BlC+b3MaiWjwHpFfO//+IH0YLLbQotKCFFscB+hNpgv4YUnac1mOPF+NtCz0QzyUxaiTVesT7Pqg3TDFiBBm0WsbQBqgRg9CDZbf531XFKU4kSDMZ4yl+VVXJ4mk44OUP6M+qwniChpdFZuEqKqZt4WwBAAPjO4rzYor2a2MZzM+u23nO4ostTokcLfLfNVcC4YDUTqbGot6Y2JACS6KVh69BCCodrr36u9BufvKJtyp+V687dE68TI4EfpSDG2OkJG01CcXVqK/8Uh2T0DAcldfojUAfk3GSUxDxyW5gk6U9OnPF2cUZ6G8oevmiWXQByDaWkSHwC2gqzHeFHnMhi1J3m9hSLG4IU50iY7HA4Wgzt8WEQ1cC9gaXNVmDDLXwRic93PjuJnMdzKubijIyV6p5jIlheRJsHrhbQVYulXBJw0XW1wNITbz8eBtPnN6iGxrQExT8MQPCG2o+AAcko+BCYSYHp74/e5zFKv6pcUbJ8YiZ5eDOQ8tNyhBLYe8wnuq/Zy2a3EE8uTHoYUDwHYE2Tz75XVxIPjncxji5FPPKly3eW5JTbmfxbBIhW4VjRd3rxiGsy00Fouyw2163z7MaNIlFVmPLlhP3ZyeTMPuMy6PtQGKV1GvcVIpxioIapXkdhi3OrZC9kvno2xQUmtsDrytWvCAbO5bd2n+NbVMN1WaN0h7bahU+7eibqiThXBowL1qYc8NoiiTj+PQ0j1xugiOUowEld5SeJWrx/q3rdZBXihI9JBnt6gwhJ8qvgpS0AkoulEUUkWmFuDAoS3Da0z6T/KcGoFOkQXMkI5tOPHWch9Oe7UCWc8vXTpuS8TKfhvFaDNx4x0fbskZSdaVG83QMpt3Cvk2DZ+iuu06jIsPZbaUbVVYRS/XHLDPVeTh4muDbzK8o9u1f4+QDzXRj+WytMuf+SzzPpIqz/UESj8dsC7bEcpgqI4k0i/w2t13kSmqG3DPGlUAzm/rieFPM4eLMdlmS/8pKYnVlf3ftbvpjUKlQaovliqmYylNf1d1tPvetIPhU3gxCrdblzZozuTw+jW4JsRPu8KfxTSGy8AIXezdJ31V9lwI+De5TwKfRGSH+NLl+wYVSn//CEb2XW790BJ9ifl5piKvIn88YCCPsVXAhdniL7vO0XuYH5Id0exxlbNHYn6h3a+zIeTsA9C/NAFVpzl1jWTijeRm//qk87+mrWJlDoKojCbkEsis5WiEhOX/kvPVToq6+7Qs28odSKaPFpCQnXD1T549LHZ0aaqijRoUiZD5l+ffqsh4umpfNaGOBHG3F+nNxe/6UJesur9E8iyId6AgFwfERilnlX7ojP80qeqtn6Pyp98iZj5ZMbD5smIdry4T9C6Q1nYNtl/ci0cbdyWLpgue78E7LwFeZNvjzpTSfkppYmc4ceXtvLCKdMBIPjzSqE40o+Jqfi3cLFeYDQImc+sUqv/TFcc1Qh62u439+5rcM1ebtrr7jhCcRzKkb+cpDnp9w4bsUyuB1LTT9KxtMq7A9ttIWbCutVkXm0Y1lBFdph2Uk0jxD/W3d2njTTPfNSWCuy5EeOLMfGo2T51PKZCtVaVVpcYXthC4FBpFCmCHK17CeuoDLc2Ma2dJqqGdxUKwpFNfprQ6dN6SLuCGEHFOqRO8q4MyP3WVf2u2CQFdIXlu4nsq+k+ZaF7tR5BY+kDdJjBmiuV/XEL6vPNNaoDzFn5j5gdvEinYEvCQBgxLJILx55W7tiemS6RtG/uvbEfzXnXaIW7y0bN4rySqygGMIxObRkvjsyPptydS6IFwGYWHo6SvPvgs33fd2cSuEbZVoqOUUJcqmcFb724pDXnPleNZiPSo11NLk0htn63V2QxHTdIONtpQGWpIauSFRECUtGVnPrfcFkGwsn60Xrs8xzY7irYvFbIzp0LGDGCje8RY2yAKJPJhLZHm19XKXfbexTOMsDj+MprOslJR4qGzx87k/nsF0SYp0kpnIaSKkdGnHD8Q5+R7Vd1ESwG4QnMHgQZM4WuJL10oZ1naNQ/qeyknStVnUWSdvrr7eRHVdSG29gZlyzpjF/JnLvllkRTaD+SsR3TYevtr77fNQnRBEGxKedJfNS3uiHsPjKDyDwh2R3RHZ10Rkz18d7O7t7h/sfx4yU47whoSWu6DnJbWgd4rnWCm1WYf9I/xA/27HMf5xR3d3dPd10d3B6zfPtz8T0fHYkoYUJ6I75iU3Xg2jIPmRY/8knlEOwTtKu6O0r4rSXr0+2C0nNOzMB923XD3DSKem+hlFRc2voCVpjNe4iMMAJ2FMGVEvGbeWpGiOwEjnMB3MUrzwMy0htCS+SDevHlQYV+5I8OsgQYomEoWDJAsHoKGXtvrMn4RjpKgwOguSMLtVmnbbAcVGk5LptIhq/5eDlu6ilMynWZRS+TVtTWKainybjtNVGVrLTZ1UVbdwioD+EuOm02K7sYzOhUr/hnRs8KveHcFF1giFaRzdGNZBoS8cIImDf+Wfh6dksiCKpZh1dLMwDot07jCphRyjczkuKvwS4hjhnPtiwwtHG1w0uvAFo81CYpqEsjSk+9r4lQphrnIjXmm0ZzX0rJRc3ymOq1AwXwFtyqL/5sAoeZbAOshwI7z6iqSpUlFlQYGoGfIuilDW5bmsfgP6koTSDLXJtVYdGcC9b3wrqcBp87VL0NO3pP3ZBNeNbVtXxYr6BiefB1sbo2Z9MoiqExy37oovUW0bOWXrDnPMGVVmshYZYlZwrhbX6ba0bC6g8YguJ6B/TQioF/BPTZjC6lpFiMxnC0syQ5LWygNubFi7Y5NUbsRg6A5Tqoin+WxTxCwUC8xQD6KDWa6o+DqvpmCbIhdro+7KQVEYSdOwrc8YvVYIzqqAJGMvYMT9mnnMHXHlEh3cpd1MnbP1LX5P6tMy0byJiONMy6o/jqu75MMPpRo5R2yEKgulz49+2gc/rS74MdD87D32Jm8jGCY+3tb87RUmZKQrUyg7o5nxT+uzyXb92UxmNTJTnaWjkb5xqzazW7F2LWjz+FM0oDlsH82tHy4M+zLntD7zSS23ZKtvUE7zDGO/kt9IHoRHEr6xfLufJbNBNoOtWprOP+dxrjlFyVuW1uolTqzDc9/FCbpNZtNpkAz8NCjzqNza7rpx4J/WRjwrV3/TLbAZDPn5hAYqq2R4aFhAVl41IXvbV2ENQliMAnlTjltKnG9Pv8MgtiGzqNWi0Q73iuEF84w7pf8L8Yl77O+Q6TMhU7NDKuS9ZffZ0zD+ilCow0gW3MctB8WgJOiS6t0UtcipLHVa6VpGfyN3NzPY6lBaHPbmRzXXu+KmbGeu41trrdmJRFhujKgzJgmoFV1LD2yzRpODEZ/lgFfFAY0SMQKNTw+aYdZtHmvk8ljKtpLBWXiOiUQeuIZWpk+63DB6lqB7WkJB9wGl6kPRDX0yjbQkt2G7Wj9rfkp5Trv2DVSkGi+LW/co4R356tChEB8odkwGnxfxKXvjqxvX3cyi7GhLhe0C27U4RPEkmGN0bouRfeSrMkXY9Z9p5CY1vOKQ/E0TTSzGcmrZX+OkFqK1cj6BT+1ZM/4UWYqRSlTPFFp6WrIu14Irsbb96FhipFfjDnw1CiQdJ0thbuyqyFKgeFRdf9xgZHfQyMksJnfDRBEL+hb5k9MBiDxsparo3HxVVlqQt+LTPDNFWXKHUrPynljEMstxCUsVn78MeVF23j+VtHh+4C9DVqqvO5L67ySp/SByhM7jU0lOZVIKfatICFESqs8fQYIYX1ZOgOpIWlJ94t99Mk2k5qyPOuZP+WlP/tRTc73zgz9z3SdRqPz10M5P5bl88FkwOoY/C5BeGT24jRqLYnV5XDx/NJwVuvDcaCuTzTbFXDNqXjgO5D1kHnwNIzIytcspjQfIr98Rx1+VOBrH1eNzi5RUJYjVxNLzZ+FccPWAbOBTph6aWExugDmlkXsVsskCGHAjuaS5VNI0fVxjrzM+c3me8Vkw2VwZ08drbRpkKkKbzR6Zjd10UipkFaLm+WPGzvPHYTk+C/EuoUu6jNYZ5PK5E3XCqIrXrDTI2vl5vC372ByUDDPAsYFwsBTSgTZMzKw/r2LlFLAut3Ak/KzIGuVO+smYA4aUAXRQngFUQJDSfQ4w3edXbLq7QS6223curNal3KOEguWfm4g8+Cy0VcuKlX7D6upSje8Nb2YwGAyCtG6wZeICPtU53cqHh7qqNKnjqKQ5qMLMLp+a5IYNckU24zVzp8n7DEnxBiIitTYhXiVIqvPl3a4n1+207cDmFQX/MPF9zJNWUOPVsAM4DGqUrcrcleVxqIUMf67Y1Cq/b/mbvJ257yjcH/ijEbCBl/HQb3ZL4ctgEtMfe8Hodu8qBAX1gF9B+jYKs9R59eDv8SyJ3HcP4nU6xp3XzgY4lrvqa31XX1j4P/q9hICAyYcxHirfPgsGH0rvH9QB858wyWZA4/9LNwfy8n/P/CjNYKddpirdc16GX11IkvKIXyOhrdcbvM6Yx/OihTlOgRK4hfk8Doe46IV7D436+c2HG8V2H+MtJ1eyYXZdcTEiRgoLr7Z1MSJdMnkQ78UzvHno37NgFtTelYhnwNQ9cvvyl+N2xMf2DXSwJKriLv+7STVEHEplA9Ve8L+NaidxDAwkeuy4gg+wLAnF9YK7/G+jqoZTrqv/RByJuHw6Na6FlC+N9vaDTM7iMd7mxeCF13Y2KrOsp87LJudulm4bCvjNlc/43zVAwsrLywxviB8leE3aG7reQ7tSkfuO+Wu6PYj+Qj06CD7QZYUToOSzVvHm8gzQFO/+zm+kf6R/BskR2wMxPZpNTkDexAaiXhbLq+p7UIJQC3M3t1ZaZnVUoXzCOmwFpF5+6RS08f7bqyHekP5sNh7/FsDe0r7ufnsFjXn0+iUOFyjwe7ZqfuBjbF+/V7eM4eVXUzFzlFdoym37wjgiBn2eNHH7WnQOCyrLO7v0CkXC0cgsgwNiXar7PUwSmxD6VfchyEmrdgsTlFcMmPPGUtEY9tA2766StOvlAPV4M2ZBQat6MT7P/PoqugfchpnEDgtodGP3jjlWas9cuQ5TL8W6dfRZl01Atj7vFPCf65wsiIaY4B82SfCP6n41+xbJe4pH0rVogu0VrvRqvQGKBLBxjgAKF+jQHKHorDn8D50mac+4Xk5chaeGzDSu6GXJTL+1S/AB43WD+yP1Td7T2L1i3/lttwq6BCbjIkmC4tYsi7tifv54zASX0uEq19Jiq4rNYZtcO85mBOhshmdpNNyb/8JK0T0yEpaKndW4tlItUV4TdyEmxBvZgHZXHWA1fBhrwNXWxbgZzsa0X0B1n6ohnVzSqucYh5r9lMMFv29KGc+8vFQrm/aFaUpsGR1m7nLQxNW1GIucBwBi1x+cKRgXMQRZLUB+KJC69TbCP4ctBTBCfD6AQ/z0rs30X1D98J0qrH/pTWfpGXYs4SP/ANjso2REVMDCCMgNdC0EKCPbBC8lblx7ffI74E/vQ3CZerx1JdD3UmjF8/wOO6HJ+b1xPID13QYx2wcB5ySX/TmiDeV24mk6P77UlOOQa3/GFAEuh+9Umet2fg2ugLN1/Sv2HmUop28KgX3jHwcvX+yE57vjYAKf8oul80qjsZ/RXT2VmIAWwj7bShL/ckNNAkVl2L3P6OY42r9xFtoSqhtn1Suc2JPCW6wGbzW8Mj6l5je17tePJRbw3yZq50hI7008xPlwRNGWxJyPvjgwkff8Nezy1Bxh7vX7jrmgYgF7FYvbox/aqppIzD/nY8ef9hFC5+DV8GkNDLMLDh/fAp8z38M77YU2lGuDeAzCwM4VHpoQt9AxiS90zWfTUoU8hWAztMxJPBTWXzEu2D74TXoCg6XCo1BdHroS5YM0C2FDDrihwQujYfDRxYFw6jAi2ekhFXxnMh8OejHtFeMbQRPhzQUTgTGq8PpDS5gSNoYXwrAtVgOxXpofnkirNx4ONvoy6z5mqz+sqI5W16rL/pQX/Tkfk3jz409ykQXw8LwbbF8gRq/ysNdrXa6PT0/HAXH4SyFihHHh7lheijZdlKXdd07Ly5E/SlEX92VbOdJvjcWivTM/xbuntV2ZXg+hXqbfSi2ER7MUqKV6ESXSOMSEj5l5BWc+d5Q49K3et7ZWHQRSmxCkb7CvhWGR4y68FGgkLvsKqdFQOxbMC8OY5RxFBajaw2vNLz2ECGlKOngNjUWrrcFdtpIzKa2dfD3KFqSyulioG66UuK+9Bk3V3dyL4KnSrL8soqpu3fN/A7uCEkFRzJTDldabgjaOFUo1j8Jke2hg5ppjnf7hg9QQYHw7Hr8St/DWqB56l3KdF+2RGFVVh/oa42YqhCAlwoZjPHWvAmysUeEiBz0NU4UCL0D/HKltkFxOs7iXAKDjydu3z3csswVpE6nEvMN3pjQDq7nawwQz6EhhPKBH3RiIMwTRHv7hhZEdeWIu8mbteMSKyGpvhFNJA/LqQNA7hvLuQLywj0Av27SNBPw9XoOgWmBP5GJjphX0wIjrEh7lLmkr8wHMdDdKZwlwWJmAIPNPWPAxxPOgXhBmZ/DKB0o+D1BuJ6NyB4R2Mj4u80R0PGeBZnWHlqiZTd1eKabHr6oe9xSs3JPkjfAhPS8Ks0JOgE6sLAswIXH7B3INPaeCXkq2q3RlM9+Dazg2y7CagZH05E+9lh4MAGNbA7QKEjrYMZxNx+EARzpAczbqQv6pH5LN7SwQbbdStv/vF3i2XMgX2oHQQhILIfBwqUxa5uUMCzZ7Tw7XTCwh6AMRAIYkiS7nwsq0235kBjqQEGT2ff++NZoepdFN/5nGUSE7hjMnBx8NrwVj+Of+61c9EEDTwCtv+JHdCI6M9KdemNK/Hi/ddmbo4N/yLfJEJPMoyyWCrXsnmkgqGdFTShmMUqX+FcR2ycz4NU8nvSk6AZ6AbjtLBoGAeGnyEHtlaNsSbVhNFACBjythiONqZ/OFsswQ7HeTxDE8aai58JPIe38o3Rxse5ZQ7sV3LLfAUDMsXzNiojlBDGG3JuFBMOGALAV+irAOJtPssv++w9RQrMEbQ7eCcZA7kO8IGoJFpc2HKyRhChsbMI7hJbC5NBwGGhEWyUMNFZFS7mBq31KKY2GtSD7h6mDbHDdiUd6q1EgeGzuvPoIphwtudXE0CpNJIdTk/Y6C5y8zzI22hRv3vSOAyFH07VWhs2vctXDSSm6RAvcZ5hiV0DkJgoimDAVg0Tg645p+e5VvSdfAtzjsery/nZhdxjN24UcZrT/CHRbgwr9kXnYGwL8IQcJPgnQ2znCfyXEh5ZiQtp+8N2dorzttCAIsbvSEpZgFj8gY9SGcMupX7JwwkwGdD6zGJfWnslQWSMGyV+4UufyIyICMlCb22pvFeo9xP56SKgUjPA99Ajy29geWMKopypOgY6CxSwuNtEp2WBqzi4DD3U/T8DSS5RllF0/ZBKeIXQBShAm33d3Le8rRXnLK/9/et7C3bSNr/xU22a+WeyxZN8u2Ejd1fOlmTy7e2G1PvziPS0u0xUYStSIVW/X6v5+5ACAAghfZ6e52z/LZbiwQxHVmMABm3iG9LysoHYI9c1VZy8wX7gscWlzGqIVFnrbJ67P+mcnIatxrpVHI5S+TEfgfGOUkUkF5g+kwa0yThJMgTvzJjO+sGtPoxtE6mrAzPh0y14VsR5T+mn3FE/Ma50V0Lz2+VdMtnNHtki3prkiXCAfkpxuryiRjDasqmNKHLDVRbBt8j4JZFmwzaDKaRzekRhxxoUzcaHpGZCf4AgqUJegIWDLNBsLSuVI7RdMYNNvB3M7NjD2cs3cWz/JGgo8EZUHZ7xDOy+xOYPbk3toboTATRTuXAgEhpuZ+xnsV5FY0OcHt7hB4G74TOx0p9kWhv0bhtLYGKWvraTNsFVfs9FJ5wpZlVwu8HLkOpsEc7w3oikssCDCEpGvHX61Z+2hh3FAzt83iOEysXXpo9Kyl3ixlyKvwNjBYElk2MT3Gs7GDW80Nj/7rYejgnS3DQi7fBLqCHXOJXfRvr/CIE4/2mnYLh6C2HZPa0McYE4t5rTu71RomzfSUCZIZPt5lz/hQRN6H+GGUIp/qmaU3ya7tTDLxb38S73a2mrb9N7xVNma7zc8j822R6XqVaOeX0e3pyB9GN6mtKf3MNh+PaK/GlHEUDoeBUVBqTqkZi6HZN1n5eH+mU2rTztucyTzb1HzkWDMfz4Qym13Jl6bY/L/Mjtda2ctcBHTDU9PU7ouFkHWEp5W2Y9JKc0czunZZQApRt+E9bTUvd3fY8jgbheLxiLqrg5rYysH3QhDrgHFSZFvNtaF3HfaOLt8f5VMthLi1Ocwzqq4Ab1LipvMgqPkytxfT8tme0f/RKGTTGqyMK0jWiypleXkGkuF5jWKEJ3kOk+MCpaTOz/DSXyTRI8E0HL4SjDUYzLxW3+Ojbs2QzPJMcThZ/sOBfTIuAjs5ZtqtRqY/GX6w8YBWRgwheBO3bLLxpR8A0MT1kVti5ZgSDpv0bom0s3nKJeuo4Fz38FLXcOFiq2yQnDbfLufa1DKsimvtCoBLq/ipPs5H9UEItqti2D7CPXVFfxeX64iTWkyXjYqE920S5Xo+PJ7+hOFbZeqTxob/ob0/Eu0VYXT9dQGqjDSQfoDnJYvkXq5rUIH3dAUIGwu+RjfbrgnD5X8P2ivwrs74dpWRaInrflU/6AfScGVAujM8b/4J5tBBNAVuxr8fPQmj7v8QFD9/TIIig/oVKCoXWrc0qoJmMO9oIQhKhC0e7t0JJ58vFUjqDxdjwLM2XM6PV1z3fueQA7yjEki9vM3MZqsUBkrOPvoDE6nA341Gg/yB2dfiL8LwXliuZr2CS5Dysyn2bvaA9r9sKAiyDiMT0iG1DKnm2NSutOcjJF61eZ+EU3U+2Wk2nYqB2mO3++o+nC8E3fgP9tkgPvnMw01pO6bs4eL2ARzxoEWhHHqkyikuP4UntPyUx+J0jHyx4MqHPc2XNA87pxUlPDLi3heTPEVS5yErXyX50m4wA6X+udLAN/Zqd04Lxntl0ZBxDM+BBHfSwDy42rtTxu8rrm5FoJHZI77HktmqkroCzIumHDHeghOgpeoeX3hTKYvPRqMIeOUr6Wv2D25pUbT3fGwDcebIFureHE8UaPUZoBbloflcNL3+1rkWPt8Ubz3/EqhC+aolgsJXhqyR47s6rM8/exTfRraHHhSDoXxwUSfLnUQe6ja8s/kSxzu8ugqQPXnQvwy+j1sW4FOGJTMSQvOXP92Z7jjoBnsWJf4Yx6S2fj+7/SVnA1EVgU+7Gp8HYx+Ndb8Ihpaj4eInnUPX1tkBQgAovI9u8q0k8XH7/6RfNyxXIPvJugahT11h9jxvodw2Gv6XqasH+4Z9lefwkV+O5sbxasr+oXuqcMsZxGnpnrEUNB/TgsL95NOwfAiLSpsI+F2ATINPNSQlgzT9S9B0FkWoffJJML6FG/5ff8a0XynPVxXGkh+Nb7URIUWiiFNV29OoML/Q30Dnwc81szC804DS1suLS+Vwuwz5GJ8iWKcSYKcqdFJ93quDCqbPSvCC6aNdkpVnfiTSs3weEmzDbsaDIMbwefwewnwEjZkRi8o+K6a0Ulorw5pOH3HKSbvly+g2Hw83fSgvHkVlpW9Jq/HR7oG0Q9PUt7CmLQj5AL/pk96A2WcxpYOYB9+qP3TN9u0dNYo8o0ux1LTvihDVshZ07Q2v1cH/291FE7qWCR3Y9DjEU9kpbRmkGj93+rIrLdTJ9NXxBn1zy+L5Gn2vMkTFCGtVcuQv3C5vIvMR6DsLXQH56j+KgPP5v6UIdH5/RYA8AP5lVAH8qE5D9cXVgVXvufXnsQdxVmmPhkE3S3oQHLp8qkNHp8+jVJpHQavLRzJsRf5m49/wN55/HjUY50p0U+Go2X7+EAqTcwvKME2P1JyoxOpFKb1Ej3jYZqTX30eNcptmWjTlmvjKBpnVFJ/K9icZQ0geHsx3OpqH00+wJFarskgZ3FWnf3nxTlfXAE3dEmgCHeSuEQ6dTmkIeG46CAhUmBTPTnejtbu9sdvdIK3Tc3w0h+3bNERYKf3DVmd3Y7e90e721JfSGaS50Wr1NjCD0GSFDCpujrAHr9aEpzuXW4OrHtX6tNfd7u5cViQCfJ7eaTVUYJmKam21Ca98kh9OQY2FhrIfHv58S0CQVbchVfRskc/NoZXAiVuNrsuYGntAoyyAiKs1pUqu55ukQ/1e24ecw123ZM099F4JFNlMVTfaHWU1nnO9/rDbbNdV2X9us61M/7nN/oPfZndSFwUGmZE8VLtz4/886C7bITQdbiVfMHxrnkcGiA2JdfOYG8n2P+tGUkIAQUuCobcMkob3fYS3tALO6sSfBmP8DRkQIOirlaRx3hWkHDK6e5oVxhUp3LfT2Q7iCj0i+GX1nfyKh/mVdu0pCUBGr4qA4ufL7NT/qYHKVtmRP2gn/ogd+MpBLct2sivsYDM711Re4tZ1VrLdLNqxckmlRTzoeD9/P+oU2CVhbzLBPspuuEjvnRFMWKnOmxtKZIXAK6I+whuF3RLCVoA4PeCfayVNKI4Ckq9m/55xQIo8P4+jKPlHOHvzmchKwmhlpXZF13A6qXXApbj9JvU8+W7hv5dH8orrwEOl/8pbjweblT9Agq+wUjzKrfogg63kNPIunusUNfM+Q6TC9aAAwRKFThGm5uNJyEYMyJ2gHF+FEj+FfxwhrUAVDzKnKNdlytTMSsqldlJqv4qg72EC5T+CYGDX0mxsedmjimKAAcafSx2zbU2AUGFLoBwKoAiyvyoFp/opmn8igqAtTEF0qqOrqwB/GIGqvnh8KmEXe0pnivGP6MChvtzMvjS+ZYSvo2EIpWpf6clGfiMek/aBkW58AcL002sR3GoKYxH7n4PHhMMCPrWig7q+522g63vIEpKF5ll0goGjzxA2WStikYTjeFPmIucT4/ubOcgj46PvEn8xD+swN1DveHEdTuuDcTi7jPz5sD7xp/51MLcDdR2HYypkw3vjh2MRpAv+iWbLNHZXbtAuPfKWSYxa6K14FN2Iae97IgwSnZEKNUC9M0Jz4et3MHrut9nAXWb1WuQuR7s4dJfVto1skzYyzYAUR6AvI74Xw+5KxLpbULWxRP595l9uqPOIsjhf/mcZdOuU/qwac2vsx/iFiEX1Wv6qEumLhkPnIK7eTq0W2Oq1/9uSAIUnuGNAx4E4oZAPeG6PkLmIPz2JoN6OgvWLJfTseInLBcMXH757o7WRkuXwcvCufSPJ0VE9tpho3X8HwQytPUCsR1cSohHDt48CiZwcsDRCcF/UhGKvRvjggm1BEM+WhNYWLRJvjlwBcmDOYU+EGTGVQ8iB8Rt/ZgQasULE+NMlNPLb2t29SQY6NSEqsElc3re4pH39dSb9uYHhLI7tXuiJH6xPPnp9aZgtRqjVQJlAU+W9ef8DBz2GseJ5SXGnYVwm/m04WUxgInm6cGYjGDIaC7X+1LKBmvRGrKeI45wjM7M1jG712RWeAjvGdt96v+nsTUJXZ4GTZTQsBHIDbQGKRlxY+CfFhGUTb1F6I5wOxothYOH+c1f0Yj40P5K2ofcurV+3HxP2X/rHOrqg2VIBrP8h/dxZgabYNBoNvWi7X7Ab+iq3maqYj1pPpQU/Iu/HoOAHteaG13EEPzEFKcg2pKg/I0IvXzkSKvAN/AIGGggQQp9hCDXSwrIwbIreQiOc4sd1nV63Gt4ZLoHeT+F0GN14HJnxFS5Rg2CWoPZ6NSYQ2/EYtNV5spSszlXG3mVwhQoPimxgywLqRZzzxRRZIpjC2pQuTuve34mPEHs7ZScFdw/jN6Nmaa1yhxPIQLDK1eY6SA5YSIpu3iu4cF7Za4Ym4M/CzRvKuKZfTXJp8AI9G6wSa3rG9C/ZX1UdfN0QE/0++NsigJfDmuhK8BmKy3qWYMiFOb3D1QAPmoaefzlfzBJeJ/W8lK0x4+yHwZW/GCc183pVLY5GjDW74U40W8TcZYjksZr+ZOQnAjjZWALETTNKt0kwieZLsygxt/AdqBeTMA5cgkiMC4Hfu/xtLND07NohI/d80FHrs343KIxEKbAwVEdQNwLvSNR2Xp7CK/Wp43KbaSGjTtf0Zm7IgstBy+0c5i+uTAxzA+aupg97DmhuFu+5KEIdSQhJEejxTYFjs8DPVtMtKn+HOwIqCxUxWDSSebQk7YKZEauCGibhVITEMXuIrCU+Mkg+By23AChX69ol1Cyrp155oSYb7R5KdFt9Pc4KLy2igDRmNukb6VFKDqOZMrHmrJIFf46oR39iubPxSA/zGQS7hgQ7m6Gyifs96ChybOJjEMPNS394Hej6GZ9N4V7nLErLyw8rmaOtyDGvxr3O1VbErjMKm6ld4Z5zs6ixpNZG9VUDRmJSW8/GgBHKZBgzKn/D2x8OYVWeqGgVHCC0PBSMIVQF2cpNaU21IxPSUdQP0xYyWapNqoFVrIERuwk9l8yJIPD0K0PSmaCSnFVrQsOEQNYiBXVgoOaDEa4KX4NiPP+EoQ1iHC5Je4TcPI2mdRpXBC8Lh7Rvz5Acfn4q4nw8lNaqBaIxqM2OkPKImDR/IHo/8KfTKCF5ANssJnqpY4opfDgPYBtkjq+yQR1+2QdtEmMoULQePZgCNYdcoqW6awVjwLadHr09e8GIQQz5LwgwJFUEikM2Ms6gIGuCpo3su44iHpccXIpVIAZxwaYNVAX25v2gZAAiezlSxEZGIxI82DcFQ+a0TBskJ41qu5g1rE4/DlZzrqWlka4bSfTq9J2KZB3PxiFQwdnaOm7L8BJzTY2EtrPhVYX4mncheFixiBWTY3gLWEQu/djqmXmuWHNvpsyKOg2xNUmjlXg38phK7nuIMYyjo/yyXfLVwH0XhDNM6WLolq827L6ArE8lJtGtyT0CKF+DpLdE5/dBksalEBKGBAsFBdR3YLLzwp07SE504aRCPOUHn3tYeC6hueQJvx+mn6agSXCg1nwU/AL771zTK9tSPfemKn1hmjvhDbY64oTt72Uscctf+sZ1djkGfdH9zYp30A83MZQ2bv/Td+GqlF4h5TmL5UK9n86CASw1CtRDnFjgSFrGANlrTu1CWzsjNnYF7hvJ4puyCvdkTgR1K0+eaWDJTaI+09rxOFrG59JjRbsEcZVaUGqKmV5mDWg1uugWVtzBSkZbxRKg7NKzADo7m3HFK1fNXsQasbazC8bYucbB8DGpaMch74dy7z4tvtH4Jb3uNDnucAlyNRyIKz8WWQan3WXOcBO8NwmHt9mTE4FOEu/zKrLnfaWP1ddf41cZRfjV8NbYx7u9cF1m2GSNqR9sZCyT8q0xy60wK1pf6hyqev4F2JPKfjivpJ8TzeoteyDB4pNPtPiU29KXAmTW8uFvMofYrkzaFV6Dkc9BCb2z6a1PhOiI2ec2xCyy6a1izVvZjrfKQsJP7nKSteqthKUpFoM8ArZCaKy2HPBTIZQFZStHGq1mx1t5MUizu5eESTAMF+7PKjkoPMe7/IIwAnljbgx3OB3BJjzJDSvwWm1b7ww9nc59lYJdFSe0OqdaeyJdGLsMfiuj1z6OQB4S84Q+rERZBsixOwt7lUrBnWuS/yBj9i8ocVzCLpq+iUCKvgPNX6H41wJ5gMQ+Ng2axwaNLKzyxkDTAeC6ExJbFr1IHlSyPYXZKlzcp6LRtF2cUxko1zz2v7fVKBEwWQFqsiXUPp9FvqQqqm9gaipwh23rwRdr/0Z7mlV2Kl94CyKgmv8wO5BSgOlqO4rHc3jWTHfdWf7vwObmdsiOSOaK0aOczTMLp8Wyzr2STDA9FchPAQ1x0qOel9Fw6YpXVdV30PROuTO3mMZW6LnDsFPvGPrAGXZK9vc5HoE6z/Ye4rGYgfc2T9PciN5vxHWgfT7mamumQWVh9SrHe3LE5KLkUbssLtftuDgu1+Pi0uFziOffeFQrphNPaS0dz32t5FiAn2+O2uVRhgps1yt7Krl6cqdsIe+BwslQBM8E1rzzRbvZbnv7wAh1Tke4e2f7nXgIufEYVkWldwY+pJLyI4hYvhXW/fXvEBik3NPyIciK/1IhkiptWVfe4j0KubKq82g1794VPHurnwm4XSVXWO15Fg9ci7IiH7cbZ/Ulv6AOSWOuKpwC5Tkym1z8e+6NsUfW80J4uiSK41xUvazM9dKE4MuyO6lZpVxeELal0m75P9ybPv9i3JtD9br7Uy7ZS6MYJMtCurdfrAJfI28P2Cco9mrvpuOlx7b3uLyjpTpbqLPtJmwaomSEpnyMx7K5mJI/AixmZdqf0p2r66UuTHfX+r7KFQc/6qJjzPccphtEappunIc5TpsZjp2LsRHZC2p9zPUKP0VQp/kQp+UXLvyUgWCoKdTPPmk2iy4f+KmO/pPmzwsbgk8VQNOVEP+f625yebXKAaw0nLjcsDWXQloQ1leFsQK8ymbLQEpcoPNOJX8EuGmo0tNFi2odK/E/osfSJL4uayUFGRCEUBhWQLcwV1UUIft7hs9VDdtSkDu3i3mddwveXHCarLG1remUgyZkEG7Q4CQYD9BYLh7MYdvr3Yzw/9TJhLQsBfmafwxQXaZm9twKNsgdwdk2qXErDS1cFR8XD8caSeuqvKefDVmYj5mDi+L9U+r53GzsuEPa/5OPDcQJUR220xJVKZwFCOZnk1vmOOD5TB+m25+EcOw2GaikKDi5jjJqKzwmkiC/HQcUwCgXz5yiVpMNM2oSl0tvMIrIEcjzpW1YxB6Ccyw3DRCEWWSMoJ/QBFpo/yo0EEzh3GMXXDbblLkt84k0lhC6Gg58NDoMQb+RIYHs0ZwVs256KOg4T7RuDt6TCqXrRHcZd1Bc8TVZ8Nx8Ka7LC28T2ElUp2DZyEoe77xmbMaDUTDxLYf3O29A56vk+UsrENp2Sd/l8yff0cfTKAk2yYH5/InuC00fvIWXp1Q2umyQw5EqKHaWNIjmARVkuSO/f/fD2dHhxdHbs/c/X5z9fHIEC975E9h0SdiC8yeoKlNmx9dpPvjO1S2aBbFwIfBSP1uj0Cxm82jGfeqnKx074Qn8BEiXve1DI6Fl9xtmxkPy20WSyM0oIU/7gnb0jIupeAt8PDx/ko9nRXG6QZh/OH8i8VshOw6cBtLKKVaZH1VT5L8DuV6cPwmnJIm4Yn4vRoL3DbDA3bE6ovyUCBzB5WmagsfyFw0c3zjFlP3737ONe+YuQhxJpKNhANPqQ6AP2At4Yy4TnGvDe9o9Ojg86K6b+ft2seZYFhWt54Tij4939ntbmeLt5tAyAdm3D3r7R8frud1/ef3F+l4HgZ1seIQRvL2z4bWbWxjvoofxLpo767/PiOiVtrewwg5U3Wq28mo1i4qFXNSLabW7WAK0u93ZTYvJOuDqQtjaOw3GfhzjIf2elDd1CsBRJ3KtC+f7YG62zr1/0q8tf+mqY9o/3RkkfG/HQdAPmNLZzrvKPX+CFkSt9uw2IxrMY6LzJ03PPinKJjQzpbCagN/3MAhD5r3Yj50/QYXReptvGZnZsuoDD0LhczBF1IA6eZ3ZYHhCyuCODX0l9u5oXayIZpSqRNhkx7CpkzpjmgphgCRt2sdbvEz502Xma1OlPX/SdTbEgiAH0SgxyB2ZBdgKKrtMGMAAW8HEkXMRo7sFwvxgNty+ZzIVAvrc6bI7XeNYev8wxYg8ILfvvfNFs3m57T29c8l6Mx5xdiOF+x2KP5quKfcuNV2OPWm26GCyjkucmEJTaBiaOK6/5l7AbIRyx1Dr3npW1ZDqGWkWlZWN8yex/p0afLeyIbKipuEV6RAxb/5eIzhgvzBjNfXld1YF9ObCyAmPI4Oy9BwvcDFRSvcpvzp/YnuYVZXtav14pFwnzhWCXZguZOWwJtBhVaGlChap1g6uem25UmU++7cW8Wr8Gb73nyPgz5/kTdn/afEuuQxEg86C/xYCm/e+IG+sHWuDJTfjWl2qXauSw41GI7OlFWOqbUtRQmu7z5qEgTHEfd9cNUQmbC8ZuMt9+wTkkQuUTm6jM7tweovwQXqG+jCabA7GIV4qaXn3ZzOZrbEJP/R3mETTFm9ej6NLf9wYxLFQo2UdYrjeR1FSG0aDxQTdgK+D5Ggc4J8vYWGpoQIdQa3ryCR/PnvzWrxcb/BiQZL6OSONofQfJG+iYSAR/LCFPNfPNzN5xNzKoVJ4cSJ8sgCMg9EzDjjC6efoU+AEfEOYl4GNyCeCrP8wDWGHYVhxbXivKNP7IAaK0HHncIGP13S6Yxf1K9jUkm0ply5Kw0NPxD4KTnwUsMItsy8ROp7rtYgFVCxz3BczQ22NC78Qw3CBJa8hiKGsgl0o7vNbB1PIRZ6S/25Na4sxAB8+Optj56mtQYEXolXsErxW0gLYI4LybxRUNEISP83VGoWttsaFqnFhBWjlkdHoISbipfhsqPm+kC0T8EXE0UDkue+kEmy/BLpO+6bVlzPeZg4ebRE4/WKBzcQ+ChEk29pP/0SFXTVJNbgv/7Bep2dU+nGNyiAHMMOUBgjkY3lSGNWtwnEsqvjDrA90OtycwznO4lVtjcu64C4RAckCSwkoC/Ejr/NkWzbEpd5fYrzCeSCpYzWifRdiIaZ2plhCaSWlbR5H/rC4zVr77hzN9+6dzc3JWlvDCotaX9piC0+goLnVhhPLkw2Kc1uToXkDuPSxNM93QggrmgeYWpEHBLo/9hed8xXdkURiYPoXRiLZ3gRxEpvJSTQLB1YanuenSYYc42qdAy1eKcbicUulFjZTbUMXrGJpiPqadFJN7ad/Wlm42X3xr/WS2t/nf5xyrWBhEBFsapk+54ht9ZIltgBbKFsZF7OhOYfh0JyBf7Ep5fZmpjSU4CR/gLl1467YawgVNdQu30lQwIoOescgQOCQNTEf4iBF+4xFiVyXM+Ns1u4cbytLbQ0afWFCyqSDb+HDqEabRz3iV9q2qoxgDVbBYmvmzOGTTCbml2znsqtwRiIrA4svJJSVKwlZ0qwkjHGJNj8nskqN2l4NY4NITPMwpz4592/GsOYleYS0gvKgRoo0do14jAYKGjGbJslIa00l0sFl3xoRre3mG2cXrCxCkbB7UkWSz+MwTn7Em9Tap2DpoFxj8J2NMXNIGU8FX9AdLZEslF6uM+a3aIOvex+uJ+Y1ShRc2rZhAPIhqDBg1drDxZWMk+JqE0ff5mVWJhRP/rYgsFSDfUU9GyIvwnViUf417O2JhsQvu5DNSTgcjoMbP0dHw9Mf6P5fF8EiQNsqp2BQX6W6w4rw9/qeZjXkfZwDi9CJRWNHWnaKOWtGfvFSlmFiPNJytM0WxSwrNze9AxhjyHz619doBCSmCBZhfyYdqf4/z8L5VJzm/W0cqqnqmxO3p/qK89CXUIGodejXEQZOG5cK0kv0WWH12qKBSlFXD2QVnH6VZxgsMLb8eRwMJUQs/app35qFisygs4g/GyTJVA3ph1o9MJLHAUKSDZC34PPUuJC+5ilhC+sIzacMxDkBbaw+kUPgktGWbQJhNr5zLWMfPpodVsU3jEWFAOY+fNRwA80KNLvvvrYPk7U8y6hm3j3VrI+dVmNs4CgavZAZTCRiiQDOqOjZ7qaG5BpiugVf9z6oD/zxYDHGmRDwbYjzH4I6cyvzIUA2v0M8eqsDedbiSDHpwJq5DDtdvWS9twT39grbkQV+J2OP3NJVG+69YBwHlSoTuPrfclgZr+/VW2kx6ZDlzp1Z3DNnfhvZfy9tTtYsxMJs5oKyMH9VQFSRWTJsRwinxJOLGYGrZi4vi8TMvbwlIFmdkWli2c4VbQJn2lGB/LKSpFJZU5IT2b7+2jNFlEYD/xDuNYM+EGrQlMJyV+UfZWLF6usxMXtsf229hTbc3WtDl+3sypEVXNErXg112rUiV+TFrNCv51zhKzBwxYuUw/8uz6DTr/pZ55YUsNyxh5GPxUrGYKSxEVLxYG0gnIWYA68FOswiYK/Eq9gVfTW02NbgVI0J+U6hULfgoXIoyjpfu7g0O7i4Km7wfs9bu7t3oI9WwnYG4TNfua9M3mmsogOTA+6MqxBrd/pMuwlxvUovFdakOaI4OUlNBSnBMApd04uIA8RnBY17rnYfcueStllF46LWYhwFtkin0U0PdUAwycO5Z1KnPZFv2DBbbmswXMW3z5TqLPNkytEDL4m6LcRR1YYHCchn2RMCJfmeyVLfBjf8sp8DA2vubr99xpoKLkqxagfNl4EfBaVlTtiz3RV7Io82RcQ62iapn9kyyS4Nh2fReyNnLSRusz8wA18xXx5DfxwfF7ZT0HU6H6bE6VuEL+f+wMolgtkgCQBPhP74uZnj2+JQXHroOGlQ9lymfFtbF0eQJE2EzK1BKzZQeWBHbiUHHGSOjyLRDx+VvDUI3RlPxREGhBs8zmyUxGn4Mz0vNLF2l1ZNHxmAfk5JVijNSMmS8cBCBMSAEbIUK81LTLeUyzKsdLpIGwnN2zA09zy2xcdgXW1cM4xZTz0bLcYUo16E0pwOenALAwhvWamFUa+tN8ydSkaTV2ekLgxnfFCZ08vF6Eb1lmM20upddX/QyjADrOgVZBwHeewz46U3KAMAKdRmmUepMka2e4MW0h+MWc47ZYxSw4dGRhAl2igfvrQHX7yVNO+8YM6qc9PgJt0sokr4odFoZEZvwxD8/FcjHG5oR9z6oNKo6b01CNGsskDvurXzyt1Z3fDENSZADL5q4rMso1VbLTLELXxesTkuAssq7Jxf54UyHT8hjAv+QquudAfswqRnwtZKFHxjBWTTKeFWds6sWz9d0Cr+yqpYloanBFiW0Q1za8ttkxXKWaVgrhYHpgVp+3C1ocdStGGG/YdVZm5pdt1AUe7i0wF8rncGtzl6zQUN17JZtegDUsYy3NwyZqE63axxby4bhvpjrhqmIqQvG6spP3eGVPt+4c/Rd4RgJ2BkOYYFDq4WJwAYEGNikOiM3QLuiN45lxcM9pHDIdjMBleXPR4Sx5p6+Tmr/Y0/n9bWzjLNDmMRgaHhidAkZH/ZWDPXhmQ0j24orMURqw2vnUWQsSZFz5taoRQwbmXgD81yM3RUE2cdhtrlmFmQ9Hx6oKdv0Fh9NIho3SFFV9Fo7x7Uvmzb0mCHksZoXkXMQ654vaDlGv1n1GqaZktp1tudbiW1O3x81D7SSk83kdYLY2u4lqJFGKpgnv6+0ngW9AcfNf9mvo1MrivHi/sSCrmXE6EqZVOQNWHvWFe7/DqpyOk4xPLmJHMLJmIyGhcs6XzjxoL3NmTRHSGIjLyuGftLDOkq44ZtoNkFcFOdQ/95fyMpCPqWcAnHjYDamGhl5oy0IaszJ4LaQGVEtvPsTyciawYL50sNOSmX65Y5sm08jZeTm99Azm+87ykReAGz9Is9/78RVsYxBsALr6cgpz4FGPh3OkRijD00nvfw1CQh33YEjDiffqeZcfMHmv325jcI3rfVbPL/wxYfPjaTsJRvoHff9Pscz5P/Bq0YeJhm4jK6rcfhb+SGwA4odUgispSeJE36pTxYmnKnO0omYy4E/QGwFJhq2x2AT15gDOoSjMIEIEgz1W+Cy09hUufCJlGUjKg+f0p0BPlYK61Pot/qUXybyXg995fxwB8HsoGXiAuaNvDKn4TjpWyAlsT1l3WC3t8YnRA+JPPgejH25yv0VThI5LpHUKbU1ajuyK+FNeCTIYFq2hfoTs8QnYRjwDLaQizjHcaDeTQeoxaD5EEj9RSt+3mohH9Qq9n8fEMFy75gyshdlSjFJsjjaLAQW+vYq+0Tolp4GYIUWhLsZKvrHb9/9/bs6O3hxfc/vDo8ev3q7dFpA/2aMlTcv8LC6p9DKGEsTv5ANOFo973ioArPtLz16OoKuIQ+yWs2eiucjgJQqF6z+KudjeZBUJ9h1HRH0xr+bFaP6QNqlsJzuZ6LjRT+ARM8meE9YZ3hXOI+C51JOJ34tzVuOFUB9HKV1CF9fcPLJAvHlfX13K8ZvEV837qa5+ecM8R+piJOVzWtSAWNtLVCxGgucy7EaSZ2lj1zUUsRDqZRex3GGUF8rdp5EFao39EbbSYRkYeFAPxR18wDeS6tyhkSZeW+j8kJ8eFdt+n4lPj80p/TCoX8nuWqvpS6scqsS4FeyiWOrHUOGp/paIJucLD+wxwUfj1aTC6Lh0nvtqQQ4R9puEJiaLf10rr6Ixy64hpJDMO8oxXFcD13aMkjDy2nHEMaq5eZmriOSXhbwyPO+fXlhlNieZ3m/9vQh7HyquFs7dlyFsHiOBstvT8HY9Ttss0etTa8URv+68B/XfhvC/7raaunc+VT3pNlS99tOj0+F+rojCGweSKCAWirzGro+6jK0Kcyv6Q65VI1Z7S6VKXStLpD1s/O6F2pVsdeTX3v8Oj01fdvL05/Pj07egNLmFzgTkao1/UouBosiPMJqsTUI/ycK+T4l8GE8MKE2G14r0mKcPrn0Pc+oAZep99750/G+BbBXlD7ngdXMKkKTQOzpDpkP13bbcIgMARYmqkFosFS7GdJBFQvc3j7EtnkmeMljz1k2X25c3C8ZWQR0g9eto5aR+0j10uFtAy52vvt/Y6ZS+eqp61uq9tuGu91xoAcR92j7rEjh8Ixw4bu7O68dOSR0gCybO1v7W+bWSTI69M2dKTbNt7RLUcf4WJ6L3svrV6SOoRltg6Oez3jJZ6XkEoLXx52Oy+t8eWr1b5EuTHe6netfQlU4/ye0Fb6uUgxuaXq37nAXsxu6tAu/XxoF7M2xmpRI6uIzEXDmnBzUqyh+q+9EsB2aAw+hi30Mga1bMN7Cfz86Y0/OKXfxxHC0KydBtdR4P3wCrLHIInrGIn3SjRUoLLDct2a3epp8QTSOmYa6v2QumWmjmF+W9tm2u0YNNOmmdamxO5MngTb246+121KkjSiJvW9LfuFlNewstuvOHmbkvmFkt3YzYYksxQ5DlO3rFTR1UbPSqfOZnJjz7Iltzm5kzPhwmveqyFYA22p3BMvwA1heNR4Cky8PgbqMpI6fYJkMNK6kNaz0npqJtK0nb7Xsb9tQR3dHTVldhdeEmV7DPXgbr0KRKS3XwE/6D0QiTTCbTuVhrJnp6K61Pd24clt4unIh72iWBvyRpjyUBubpLfiPoxYvAlszf9rdCRvi9zY+Cb2iVqbyd61smO3mhRYDQc+k31rPaf9+1MQ/bjM5owvKVcEUAzCIUa9u92cxF4A9FQH8fMsk4spu91UucKpO2NMu4jOVjajq52vYP3xEEshp53hAItEXkvJgNJwHFs7ZhoOliYp7LpOcHfiEaxkTm3m/hMK20mFUXYTioRvv093nySXrLdqxwlF99wv07LF106VlpWjM1KOMj1xa0obQhXqg0ZWwxPND1OGL9HVJsj3QThOaZ+Ka42s+tM72Do42i5Uf7b2uy8P89SfY3rK1J/jnePd4/189ee4edyyNCxL/Wntt/YtNSuj/vRebsN0F6o/B82D7sGBW/1B7edox6n+HG11jjq2kifVn87Ofqu3m6P+HPZ2bfVQU386rd3tXbPflvpzeNh7aSmGLvWnC2pIawsUmFbXrZDkqT9t/Ka5vQGMUFn7aYK2tNtG5Yc1pl6x8qNIbAWZm7ajmtBttVeTuq2e2lN9h7qG79VcexC0DAIGEtzDzDeNkprJn0B+n1IeK+GySnxWwmlVea2c26rwWzWOq8RzxVxXyHclnFfCe2XcV4X/HsaBD+fBh3FhRT5cmRNX58VVuZGurzS3OnJQ2yRHFOFSJywTUztaDXGEmS91QqcChw47X7wufHX6jt55509+hqf+5k398JBhvyy3aD62ephZMH3L6C7HFmaM9up1OA3ekn2sYSeLIFx+8iNeY9LZUfqGb0eH+4ltX5wZHgO3xjlANpaNSnyrue/z0RjomG+iYXgVBsPMC74ZtF7k94AwTA/QuV5LdnfBQDa6y/24qDYhEDTvr9zaxPmYa6Sm9oAolAAtTYMG0FIlGoBeGmMA6MU5ZtUTKAt26liAoEADXhhdxbl4rfzkbTif3G5bUB6u7tt2oMxehSgDz/LYKYsywIMniKgCYQvzmcoNZbAnaCXZU1Izqb0rjry7MZbvPTXK6T1PogetGuS0RFeKJPGjQsd60dSsY/0ztoCwypWWG16QDBp5Lc+4B7sGlKWUJmn7uthlAjfsqyyOiIN5cpKG0gmm5C+xxjGVeAaScAJM409mBjETKM8ZLAIvMAJPimPH06eD1glJq6BJX5gd0FADX5izKZcaGIZxjC7BoTrcFkvO5jd8xP0+wAbD9IyXnswHO16fTcdhwBWCnwATwmFmF5epNxtjuE/Ui+hQm9BFZ/DxeKwZphD0JEwY2lMQzrD4+9cIxhCNUXw6JJS4+ey/N4wWeJk8DW7wPF/ZXYiZ1jz3RYvPohNsC4a2EEFg0Dxh+eHjuiI3pgG0i9ufz/1lI4zpXxkzRjn7rq0JVULa3U8DTcSiQfFHI8NsHqHaJrFpuTyqXTdtQiNSHCiM7rYm1AhsDCOxokpAZn0GPWg2e2lWIXjQXtPRD/l63bD3ExUbOdg9jqFm09by7wZ9gF7Ca+sNnKfammagl3U+NconVNkXDbGccWOpqLQA/kMzSrVHweQCy+cqYZKyKzRwbKFC42USJmNCWluzwW3TZmlln3GHuJ4X3i8fUrDOP91R6v1H7xeMypR+jjPMw3dmzfNjp88o9UtNovwj0bpKVfyXVt+znJlavRdfkgR1a2YgGRBSZquYhIhh10qaIEtMGZKkGXw7qa2TEeaaXgQLo9kiHlG+9eznovRROB7Og2nuAIn3+giZbxqg9x35g1FNFy+mz6CQQiy/CvJLDwJqOw/lOXx6PpVILXK1+BwmsOOefm4M5SIB6+9zOj4g/Yk2LnvnTzCfQjsl+FAsAVNxWK/CaxspZBhcQeUH9C6NUIIf6Iiocx139Tt8+2u8ORsvrsNpPYVhJQiLUZLM4v7m5ud2gxCE0NBnkyxaN+F7nNkh9SZdMsThpdEUtnjkGtCfiCqprX/cUL5qJ/PgM1IUlsUtiy5jWDBxPZkv0EMHN/Rk2E1On6cUa6rvEZCyKAYBOXAPJCYaSmXbL2gYSCBcaq/C22DoYTOfwZfhmK3J/cRjtSYm207/M7xJESTwFR49t2VI85hwW08oOZkvJOYXVLc/Hkc3XOka3mJ/Fk0iV9VoOoVWcN5RFBOWMZCOP8YfGgS5GJCj6We8zg+xITHbEONY0Jp9tv/D+1cXnj8P0saiwxgaxstZ4Y3OZxhX6DTFUPnx1dnRBYdL4QL4QJgoexESPLI1cIsYqj4YoSvlYoLBjn4i6zm22PwpuPxv2DQTRuHg3ekm7EIXAu+Btbm+XLAbSOlc5dHbHy9OXu+fHb97/0aE22CLvBjoGxHRB1hb0GpuwW8ClvevYBBaXYX4DI07hLUkQWOu8GpJKCrD4HJxzZ0Qpv/8su995W7C4dHLH76n+oKYPqPaJC2Jak7m0XCBnsSkvoIEjXMqUxmgvqIKs7jIn8PL4CKeQtGjKLnAT5LbBBn6qffjq5dHB+8Oj7zTt/snp39+d+ZBOa/ev3v75ujt2fn0qfd9MA3mfGLXbrZ79eZWvdM8a7b7W1v97nZjp93d2mpiRtDXEgbkltPXalH6MhnB7KkNb6fRwv/hq6NbUFYJRaXvHfTPz38AOo7hn9Oj9+fnh0H8CTak5+f7Jyen5+fYh0E0DLwaQYir33UYiV+R4s8bwNmfz8+BZcNZAsXMqOJGcAscVq/4nE/9MBqB8FkGy+AS9N54b6/d6DXa/AKk1N4edWCLEtB8xR/v7bUa3QYMAjlW4FjVh9Fgb6/ZaDa6eirLW0jf5tzLMNrb62Jx+DNJ5lhbr9HCn5eD+XKW7O1tQSH4cx4l4xBratNPpAv8tYW/BrBzCa/gLc4QJLUx7YoS+OvBCKEYkvpUWMUEc+xGt7GNr4AT/OElF7YLCRTwd28HXrcQMGgczf2Jj63uNnqQgM0SZgDQ+B1RQRyzLVYbM+5iEghmYOzh7WTMPYbChiEGGsOaOMeCDY5mS8zRghQ80MF1DlvXpjxXQFWXiys88IbebDVa7UYLGommBkkU4fRAq2j8rmbDqzb2eAe7BfLpt2CKex6sbocyxDEIaDFINF/XUXQ9Dur+Ihnhh1sdLfE6gAnmyVeJ/izEY/fJJJoi2SVRjIVv0xxcz2eDkPq2QyMyarWoV/T56Kp+GyRqvpCOEBkPE5o45pgguiOGClNu8Vd7R/2swxjzPAD3jBbXsMpd4/b4YrSg6YO6IGs4nPpEpD25EI/Dy4t5wOIDathmAvsVNmqDqEHRBTC5w2Mik1G830KTkRzbKpk2anLcqS+/wko6p57yzxiUboKGxxztnplWxxkASh3wfTHNBRAdNvtTsMRVmCaZ2OPTAvbX0yChtvWYzDDYL4iWKfWvie2aiJR6mNSRjrrMH5PBjHiFxnIChEZESD2ZAE0spgGRGL2djDrIZvwDZqWOPRKdbLV4sCagaoRDWI9xQKhQ2P9jfW3mighpCMYZS+3ga1iGb+eLKR4YUENoIPCwhYmqsyN/JwHCu2OoJKAukiTUEPMV6zzBvA5CYMakJ+hwlS+QRPPyU468l/HwU+4rmFXo5QBDgaBmxdPaBJ68xLxznHuarRbSOV4gzcMhUyHN8swffPKveeJJzM78ZMR8ikMPZcxCVHfgZ5unFjeAA1CMiRW26BNsOwgJnJtOB6djtvTjKfFfD3mFf15MYKEdswDu0ndLtDTodVl+U74BYdaQdMSqlkPqHM4YCOlumgL9TlBRouWhRZJSvrpgzgbC6IkvlldEfDR6J8trBPOn79pE0yfLv/x0JmqgOkGOEdu1udTZKJjS99vY5pPlSfiJpPFWS7zn9e9iFEWfYrVAnCz/mvSomJb6WU+TWiLpIg6RUToijZfMOh4o4kkTtgqkcGMGqmMzfRuB4veZa2qrVOIQ9ETida+9i29A6eqATO60WupXfaBWwTaO+cny5/03r7FZTfwpNydEEZBCRDIP/rbAw2riHJo6mVJPGU8sdaA0gzBviWVzPhvGdV5fOpRAzgNQ+MifsDiGKYrDW6I2qisGje6KBTkxMgjHOqrFdBbMUhI/SVOEhIAxoXCpe3sgzjALkMcSlsU2V9PiBHTk2aLJpm/Q8BVXYx4Oqi/523BCi9o2DgeOFUnXNhexnKHZFuxuZnzYoWiZ31yAyA6mMTNhV4hkEH4wQB2slXq4+BwCifKnJIbqgXcdJv8l92DwNywosAJMNv1fZ9Gss9y0la0G5Plutz3Ybu32tv2gud0dbIM2PQx6ze6wc+m3OldXw25r2O30LoOnwfX1nizhfHqDcBW40KfEehP4MdBxOEXxSuvdTXAJRBANmcWaPICQGINyAHoM71WVIqFeYJEkaZf+nNSyNg3Ob9HsCpWnJus0T+7/F4v1PtA=
--- VIBECODE_RESTORE_BLOCK_END ---
-->