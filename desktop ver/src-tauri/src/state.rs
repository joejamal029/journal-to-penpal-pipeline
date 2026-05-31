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
