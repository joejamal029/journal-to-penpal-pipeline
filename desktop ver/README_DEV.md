# Journal-to-Penpal Pipeline — Developer Guide 💻🛠️

> Highly structured technical manual for engineers maintaining, auditing, or extending the local-first block editor desktop pipeline.

---

## 🏗️ System Architecture & Data Flow

The Pipeline leverages a strict **layered split architecture** to isolate high-performance low-level system operations from interactive block editing environments.

```
       +-----------------------------------------------------------+
       |                     REACT 19 FRONTEND                     |
       |  - UI Layer: App Shell, Virtualized Crawler, Modal Forms  |
       |  - Editor: BlockNote v0.51 + TipTap Schema Custom Nodes   |
       |  - State Manager: Zustand 5 Store with Sync Middleware   |
       +----------------------------+------------------------------+
                                    | IPC (tauri::invoke)
                                    v
       +-----------------------------------------------------------+
       |                     TAURI V2 DESKTOP SHELL                |
       |  - Window Coordinator: Intercepts, close delegates        |
       |  - Systems Integrator: Native pickers, OS Clipboard       |
       +----------------------------+------------------------------+
                                    | Rust IPC Handler
                                    v
       +-----------------------------------------------------------+
       |                     RUST BACKEND CORE                     |
       |  - nom 7.1 Parser: File detection & discrete thought extraction|
       |  - SQLite (rusqlite 0.33): Bundled transactional db engine|
       +-----------------------------------------------------------+
```

---

## 🗄️ Database Schema Deep Dive

All database tables are initialized, migrated, and maintained in WAL mode (`PRAGMA journal_mode=WAL`) upon backend startup inside [src-tauri/src/db.rs](file:///c:/Users/USER/Desktop/APPS/journal-to-penpal-pipeline/src-tauri/src/db.rs).

```sql
-- 1. Source Journal Tracks
CREATE TABLE IF NOT EXISTS journal_sources (
    id TEXT PRIMARY KEY NOT NULL,
    file_path TEXT UNIQUE NOT NULL,
    file_name TEXT NOT NULL,
    format_detected TEXT NOT NULL,
    entry_count INTEGER NOT NULL DEFAULT 0,
    imported_at TEXT NOT NULL
);

-- 2. Discrete Thought-Unit Entries
CREATE TABLE IF NOT EXISTS thought_units (
    id TEXT PRIMARY KEY NOT NULL,
    source_id TEXT NOT NULL,
    content TEXT NOT NULL,
    entry_date TEXT,
    category TEXT NOT NULL CHECK(category IN ('presence', 'reminiscence', 'uncategorized')),
    FOREIGN KEY(source_id) REFERENCES journal_sources(id) ON DELETE CASCADE
);

-- 3. Relational Penpal Contacts
CREATE TABLE IF NOT EXISTS penpals (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    country TEXT,
    interests TEXT,
    topics TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
);

-- 4. Archival Correspondence Log
CREATE TABLE IF NOT EXISTS correspondence (
    id TEXT PRIMARY KEY NOT NULL,
    penpal_id TEXT NOT NULL,
    content TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('sent', 'received')),
    logged_date TEXT NOT NULL,
    FOREIGN KEY(penpal_id) REFERENCES penpals(id) ON DELETE CASCADE
);

-- 5. Open Active Letters (Workspace Tabs)
CREATE TABLE IF NOT EXISTS letters (
    id TEXT PRIMARY KEY NOT NULL,
    penpal_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('draft', 'sent')),
    created_at TEXT NOT NULL,
    FOREIGN KEY(penpal_id) REFERENCES penpals(id) ON DELETE CASCADE
);

-- 6. Document State Content Storage
CREATE TABLE IF NOT EXISTS letter_content (
    letter_id TEXT PRIMARY KEY NOT NULL,
    json_document TEXT NOT NULL, -- Serialized BlockNote blocks
    updated_at TEXT NOT NULL,
    FOREIGN KEY(letter_id) REFERENCES letters(id) ON DELETE CASCADE
);

-- 7. Workspace Tab Layout Session Singleton
CREATE TABLE IF NOT EXISTS workspace_state (
    id TEXT PRIMARY KEY NOT NULL, -- Fixed 'singleton' id
    active_tab_index INTEGER NOT NULL DEFAULT -1,
    tabs_order TEXT NOT NULL -- JSON Array of letter_ids
);

-- 8. Key-Value Zustand Store Adapter
CREATE TABLE IF NOT EXISTS zustand_persist (
    key TEXT PRIMARY KEY NOT NULL,
    val TEXT NOT NULL
);
```

---

## 🧩 Custom BlockNote Dragging Hack

A known issue in BlockNote v0.51.0 is that its internal `BlockConfigMeta` types omit `draggable` configuration variables. When React Custom NodeViews are registered, the underlying Tiptap node specs default to `draggable: false`, causing a forbidden circle-line cursor ($\varnothing$) when attempting to drag them.

We bypass this limitation in [src/components/blocks/schema.tsx](file:///c:/Users/USER/Desktop/APPS/journal-to-penpal-pipeline/src/components/blocks/schema.tsx) by directly mutating the compiled Tiptap node specification config *after* creation but *before* schema finalization:

```typescript
const routedEntrySpec = RoutedEntry();
const routedEntryImpl = routedEntrySpec.implementation as any;
if (routedEntryImpl.node) {
  // Direct, safe override of compiled Tiptap node spec
  routedEntryImpl.node.config.draggable = true;
}

const scaffoldBlockSpec = ScaffoldBlock();
const scaffoldBlockImpl = scaffoldBlockSpec.implementation as any;
if (scaffoldBlockImpl.node) {
  scaffoldBlockImpl.node.config.draggable = true;
}

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    routedEntry: routedEntrySpec,
    scaffoldBlock: scaffoldBlockSpec,
  },
});
```

---

## 📡 Tauri IPC Commands Index

The backend exposes **18 Rust commands** registered inside [src-tauri/src/lib.rs](file:///c:/Users/USER/Desktop/APPS/journal-to-penpal-pipeline/src-tauri/src/lib.rs):

### 📓 Journal Commands
* `import_journal_file(filePath: string) -> Result<ImportStatus, string>`
* `get_thought_units(filters: CrawlerFilters) -> Result<Vec<ThoughtUnit>, string>`
* `get_import_status() -> Result<Vec<JournalSource>, string>`

### 📧 Penpal Commands
* `create_penpal(name: string, country: string, interests: string, topics: string, notes: string) -> Result<Penpal, string>`
* `get_penpals() -> Result<Vec<Penpal>, string>`
* `update_penpal(id: string, name: string, country: string, interests: string, topics: string, notes: string) -> Result<Penpal, string>`
* `add_correspondence(penpalId: string, content: string, direction: string, loggedDate: string) -> Result<Correspondence, string>`
* `get_correspondence(penpalId: string) -> Result<Vec<Correspondence>, string>`

### 📄 Letter Commands
* `create_letter(penpalId: string) -> Result<Letter, string>`
* `save_letter_content(letterId: string, jsonDocument: string) -> Result<(), string>`
* `load_letter_content(letterId: string) -> Result<string, string>`
* `mark_letter_sent(letterId: string, plainTextContent: string) -> Result<(), string>`

### ⚙️ Workspace & Session State Commands
* `save_workspace_state(activeTabIndex: number, tabsOrder: Vec<string>) -> Result<(), string>`
* `load_workspace_state() -> Result<Option<WorkspaceState>, string>`
* `get_persist_value(key: string) -> Result<Option<string>, string>`
* `set_persist_value(key: string, value: string) -> Result<(), string>`
* `delete_persist_value(key: string) -> Result<(), string>`

---

## 🛠️ Build & Testing Pipelines

Every contribution must be validated against our local testing and compilation gates.

### 1. Run Unit Tests (Rust)
The nom parsing algorithms and SQLite schema definitions are verified using cargo tests:
```bash
cd src-tauri
cargo test
```

### 2. Verify Production Build (Vite + TypeScript)
To check type safety, React 19 constraints, and compiler health:
```bash
npm run build
```
Ensure that no compiler warnings or asset compilation failures are generated.

---

## 📜 Universal Developer Hard Rules

Developers and automated agents *must* adhere to these 13 Hard Rules documented in the application constitution:

1. **Never use Electron** — Tauri v2 is the only desktop shell.
2. **Never fight BlockNote's internal state** — the editor owns its document; Zustand orchestrates everything around it.
3. **Never write letter content saves as multi-statement transactions** — single `INSERT OR REPLACE` only (ATOMIC SAVES).
4. **Never destroy a BlockNote editor instance without first flushing its content to SQLite** (FLUSH-BEFORE-UNMOUNT).
5. **Never queue a routing item without validating the target letter tab exists** (VALIDATE BEFORE ROUTE).
6. **Never write empty text to the correspondence table** — validate non-empty before archiving.
7. **Never accept non-.md/.txt files in the journal importer** (FILE TYPE GUARD).
8. **Never open a SQLite connection without setting WAL mode** — `PRAGMA journal_mode=WAL` on every connection init.
9. **Never call `invoke()` directly from a component** — all Tauri IPC goes through service files in `services/`.
10. **Never invent colors, spacing, border-radius, or shadows not in DESIGN_SYSTEM.md** — utilize HSL design tokens.
11. **Never render >50 DOM nodes in the crawler list** — `TanStack Virtual` is mandatory.
12. **Never duplicate BlockNote editor state in Zustand** — `editor.document` is the single source of truth for content.
13. **Never import copyleft (GPL/AGPL) dependencies or advanced `@blocknote/xl-*` modules** — to avoid GPL contamination of the proprietary, closed-source codebase.
