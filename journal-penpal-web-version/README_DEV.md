# Journal-to-Penpal Web Workstation — Developer Guide 💻🌐

> Highly structured technical manual for engineers maintaining, auditing, or extending the local-first web-based block editor workstation.

---

## 🏗️ System Architecture & Data Flow

The Web Workstation operates entirely within a **local-first web architecture**, utilizing browser-level databases and local-first reactive state bindings to power complex features in-memory.

```
       +-------------------------------------------------------------+
       |                      REACT 19 FRONTEND                      |
       |  - UI Layer: App Shell, Virtualized Crawler, Modal Forms    |
       |  - Editor: BlockNote v0.51 + custom schema nodes (TipTap)   |
       |  - State Manager: Zustand 5 Store with localStorage persist |
       +------------------------------+------------------------------+
                                      | Reactive Hook bindings
                                      v
       +-------------------------------------------------------------+
       |                      DEXIE INDEXEDDB ENGINE                 |
       |  - Version 4 Schema: Compound index collection keys         |
       |  - Event Bus: emitDbChange & subscribeDbChange (tag filter) |
       +-------------------------------------------------------------+
```

---

## 🗄️ Dexie IndexedDB Schema (Version 4)

All datastores are declared, versioned, and indexed inside [src/services/db.ts](file:///c:/Users/USER/Desktop/APPS/journal-to-penpal-pipeline/journal-penpal-web-version/src/services/db.ts).

```typescript
// 1. Raw Journal Files Track
journal_sources: "id, &file_path, last_imported";

// 2. Discrete Thought-Unit Paragraphs
thought_units: "id, date, category, section, source_file_path";

// 3. Relational Penpal Contacts
penpals: "id, name, created_at";

// 4. Chronological Correspondence Records (Sent/Received)
correspondence: "id, penpal_id, logged_date";

// 5. Open Active Letters (Workspace Tabs)
letters: "id, penpal_id, created_at";

// 6. Curated Collections
thoughtunit_collections: "id, title, is_pinned, created_at";

// 7. Collection Associations (Compound indexing for duplicate prevention)
thoughtunit_collection_items: "id, collection_id, thought_unit_id, [collection_id+thought_unit_id], sort_order";
```

---

## 📡 Live Query Event Bus & Loop Prevention

The workstation uses a simple, highly reactive event bus inside [src/hooks/useLiveQuery.ts](file:///c:/Users/USER/Desktop/APPS/journal-to-penpal-pipeline/journal-penpal-web-version/src/hooks/useLiveQuery.ts) to push database mutations to active UI queries without relying on heavy pollers.

### The Problem

When `LetterEditor` autosaves its content, it calls `emitDbChange()`. The listener fires and pulls the latest letter draft back from the database. BlockNote then serializes its blocks to compare. Under rapid typing, slightly different whitespace or attribute ordering triggers a change event, leading to an infinite saving loop.

### The Solution: Source-Tag Filtering

We resolve this loop by introducing a targeted `source` tag parameter inside the event bus:

1. **Tag Emit**: In `LetterEditor.persist()`, we pass a source parameter identifying itself:
   ```typescript
   emitDbChange(`letter:${letterId}`);
   ```
2. **Filter Listen**: In `LetterEditor.tsx`'s subscriber, we skip updates that match the letter's own tag:
   ```typescript
   const unsub = subscribeDbChange((source) => {
     if (source === `letter:${letterId}`) return; // Skip own saves
     fetchLetter();
   });
   ```

---

## 🧩 Custom BlockNote Dragging Hack

A known issue in BlockNote v0.51.0 is that React Custom NodeViews default to non-draggable implementations. We bypass this limitation in [src/components/workspace/LetterEditor.tsx](file:///c:/Users/USER/Desktop/APPS/journal-to-penpal-pipeline/journal-penpal-web-version/src/components/workspace/LetterEditor.tsx) by directly mutating the compiled Tiptap node specs at the schema level:

```typescript
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    [ROUTED_ENTRY_TYPE]: routedEntryBlock(),
    [SCAFFOLD_BLOCK_TYPE]: scaffoldBlock(),
  },
});
```

---

## 🔗 Bi-directional Curation Routing Engine

To coordinate routing links without redundant database joins, the system indexes active editor JSON schemas recursively inside [src/services/routing.ts](file:///c:/Users/USER/Desktop/APPS/journal-to-penpal-pipeline/journal-penpal-web-version/src/services/routing.ts):

1. **Recursive Block Parsing**: The scraper traverses draft block lists, plucks `routedEntry` items, and records their `entryHash` keys.
2. **Backward Compatibility**: Prior to exact block hashes, early drafts used simple text blocks. To ensure reliable routing indices, the engine computes deterministic content-based fallback hashes on-the-fly when parsing.
3. **Reactive Binding**: When letter saves occur, the engine triggers an indexing sweep and updates `routedThoughtsMap`. A Zustand selector catches changes and refreshes the crawler’s sideways-wrapping hot-link routing badges instantly. Clicking a routing badge calls Zustand's `openLetter` action to open that editor tab immediately.

---

## ⚓ Deterministic FNV-1a Anchor Hashing

To protect paragraph reflections (The Living Margin) inside the `marginalia` table from line addition/deletion drift in raw journal files, the system uses a synchronous 32-bit FNV-1a content-based hash in [src/services/parser.ts](file:///c:/Users/USER/Desktop/APPS/journal-to-penpal-pipeline/journal-penpal-web-version/src/services/parser.ts):

```typescript
export function hashContent(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(36);
}
```

This generates a deterministic, stable string key bound to the paragraph's content rather than its index position. If paragraphs shift during diary editing, the marginalia record follows the content perfectly.

---

## 📅 File Name Date Parsing Engine

To allow daily journal notes to be imported seamlessly without requiring internal day headings, the system parses the file name itself for dates.

1. **Filename Extraction**: In `src/services/parser.ts`, the file path is split to get the base file name (excluding directory path and file extension):
   ```typescript
   const lastSegment = sourceFilePath.split(/[/\\]/).pop() || "";
   const baseName = lastSegment.replace(/\.[^/.]+$/, ""); // strip extension
   ```
2. **Standard Date Formats Matching**: The base name is passed to the existing parsing engine:
   ```typescript
   const fileNameDate = parseDateString(baseName);
   ```
   This ensures that filenames like `2026-05-31.md` (ISO_RE) or `May 12, 2026.txt` (LONG_DATE_RE) are successfully converted to standardized `YYYY-MM-DD` strings.
3. **Sequential Day Fallback**: `currentDate` is initialized to the parsed filename date. If the raw text does not contain any internal day headers, all extracted thought units inherit this date. If internal day headers are encountered, they dynamically overwrite this default on a going-forward basis.

---

## 🧪 Automated Integration Testing & Mock IndexedDB Polyfills

Headless integration tests operate inside Vitest. To run IndexedDB checks without running a live browser, we polyfill the global environment inside [src/test/setup.ts](file:///c:/Users/USER/Desktop/APPS/journal-to-penpal-pipeline/journal-penpal-web-version/src/test/setup.ts):

```typescript
import "fake-indexeddb/auto";
```

This injects an in-memory, fully transaction-compliant mock IndexedDB engine. Integration tests inside `src/services/db.test.ts` and `src/services/routing.test.ts` verify:

- Table creations and Version 4 Dexie schema initializations.
- Relational profile CRUD operations.
- Dynamic parsing, transactional cascading deletes, and unique compound key constraints (`[collection_id+thought_unit_id]`).

---

## 🛠️ Build & Testing Pipelines

Every contribution must be validated against our local compilation gates before deployment.

### 1. Run Pre-Commit Linter

To verify code formatting, type safety, and ESLint rule alignments:

```bash
npm run lint
```

_Note: ESLint must run with zero (0) errors before pushing changes._

### 2. Verify Production Build

To ensure React 19 constraints, server-side rendering (SSR) assets, and Vite configs compile safely:

```bash
npm run build
```

---

## 📜 Universal Developer Hard Rules

All automated agents and developers _must_ adhere to these 10 Hard Rules documented in the workspace constitution:

1. **Never use electron or Tauri packages** inside this subproject — it is 100% web-first.
2. **Never import `@blocknote/xl-*` or advanced modules** to keep dependencies commercially safe and avoid copyleft (GPL/AGPL) contamination.
3. **Never call `useOneShot` where live database reactivity is expected** — utilize `useDbQuery` for reactive UI states.
4. **Never bypass cascade deletions** — deleting a journal source must always sweep related collection items and thought units in an atomic read-write (`rw`) transaction.
5. **Never clear `isUpdatingFromDb.current` in a macrotask timer** — utilizing `queueMicrotask` is mandatory to align with TipTap's synchronous rendering ticks.
6. **Never write raw SQLite statements** — all database writes go through the Dexie db singleton instance in `services/db.ts`.
7. **Never duplicate BlockNote editor state in Zustand** — the editor instance's `editor.document` is the single source of truth for workspace content.
8. **Never skip `skipFirstChange` resets inside useEffect** — onChange subscription blocks must reset `skipFirstChange.current = true` on editor recreate to avoid tab-switch dirty flags.
9. **Never render raw lists of thousands of items** — `TanStack Virtualizer` is mandatory for thought-card crawlers.
10. **Never ignore ESLint `any` rules** — type catching variables as standard cast exceptions (e.g. `(err as Error)`) and avoid explicit `any` tags.
