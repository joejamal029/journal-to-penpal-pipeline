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
