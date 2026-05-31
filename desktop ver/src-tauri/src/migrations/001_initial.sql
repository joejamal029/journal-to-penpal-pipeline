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
