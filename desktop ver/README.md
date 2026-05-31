# Journal-to-Penpal Pipeline 📬✨

> A block-based local desktop workstation that transforms daily journal entries into curated, high-fidelity letters for multiple penpals. 

The **Journal-to-Penpal Pipeline** is a single-user, local-first power-tool built on Tauri v2, React 19, SQLite, and BlockNote. It is specifically designed for long-form writers (such as Slowly users) who keep daily personal journals and wish to dynamically discover, filter, group, and route their life observations into letters for multiple correspondents in parallel.

---

## 💎 The Value Proposition

Traditional letter writing involves jumping between raw diary text and individual draft editors, losing track of what thoughts have been shared, and manually copying text chunks. 

The Pipeline establishes a structured **data bridge** between your private record and your interpersonal dialogue:
* **Discover Serendipity:** Crawl, search, and randomize 10,000+ daily entries in real time.
* **Keep Provenance:** Every journal line routed into a letter carries an immutable metadata badge showing the origin date and category tag (`[date] · #[category]`).
* **Scaffold Timeframes:** Push curated, date-grouped timeframe overviews (e.g., "This Week's Highlights") to multiple penpals simultaneously with duplicate guards.
* **100% Local-First & Private:** Your personal diaries, correspondence history, and draft letters never leave your machine — stored securely in a local, high-performance SQLite database.

---

## 🎨 Interface & Visual Layout

The application features a beautifully polished, dark-mode-first aesthetic built using harmony-curated HSL design tokens, clean glassmorphism, dynamic transitions, and modern typography.

```
+-------------------------------------------------------------------------------------------------------+
|  [+] SOURCES  |  📬 JOURNAL CRAWLER              |  📄 WORKSPACE: [ Penpal A ] [ Penpal B ] [ + ]     |
|               |  Timeframe: [ This Week ] [All]  |                                                    |
|  Imported:    |  Category:  [#presence] [#remin] |  [ Saved at 10:24 AM ]             [ Copy ] [ Send ]|
|  - diary.md   |  Search:    [ query... ] [Rand]  |  ------------------------------------------------  |
|               |                                  |  # Highlights of the Week (Scaffold)               |
|               |  - 2026-05-23 · #presence        |    Observed the morning mist rising over the hills |
|               |    Observed the morning mist...  |    today. It felt incredibly serene.               |
|               |    [ Route to... [x] A  [ ] B ]  |                                                    |
|               |                                  |  - Routed: 2026-05-21 · #reminiscence              |
|               |  - 2026-05-21 · #reminiscence    |    Reminded of childhood summers spent reading under  |
|               |    Reminded of childhood...      |    the large oak tree in my grandmother's garden. |
|               |                                  |                                                    |
+-------------------------------------------------------------------------------------------------------+
|  📧 PENPALS & CORRESPONDENCE HISTORY                                                                  |
|  [ Penpal A (3 letters) ]  [ Penpal B (1 letter) ]  [ + Add Penpal ]                                  |
+-------------------------------------------------------------------------------------------------------+
```

---

## 🚀 Key Product Features

### 1. Journal Ingestion & Parsing (`FEAT-001`)
* **Format Detection:** Auto-detects and parses three historical format variants (bullet lists, line-break separated blocks, and category-tagged headers).
* **Nom Parser Engine:** Rust-based fast parsing combinators process large text files under **100ms**.
* **Zero Duplicates:** Re-importing a modified source automatically clears existing entries for that source and replaces them seamlessly.

### 2. Virtualized Thought Crawler (`FEAT-003`)
* **TanStack Virtual:** Smooth, 60fps scrolling performance, fully optimized for browsing over 10,000+ entries.
* **Discovery Filters:** Refine entries instantly by timeframe presets (*This Week*, *This Month*, *All Time*), custom date ranges, and hashtags (`#presence` / `#reminiscence`).
* **Serendipity Engine:** Randomize filtered entries to rediscover forgotten memories and spark new letter topics.

### 3. Multi-Pal Checkbox Routing (`FEAT-003` / `FEAT-004`)
* **Parallel Dispatch:** Click "Route to..." on a thought-unit card, check off multiple penpals in the popover checklist, and route the block to all target letter drafts simultaneously.
* **Provenance Tracking:** Injected blocks are represented as a custom `routedEntry` block, showing a gorgeous badge with origin dates and category tags.

### 4. Grouped Scaffold Generator (`FEAT-005`)
* **Interactive Curator:** Choose a timeframe (e.g., past 7 days) and review a structured preview of all journal entries grouped chronologically by date.
* **Curation Checklist:** Selectively include or exclude specific entries.
* **Scaffold Push:** Create active letter drafts for selected penpals and push independent copies of the scaffold as customizable blocks with duplicate guard validation.

### 5. Multi-Tab Editor Workspace (`FEAT-004` / `FEAT-006`)
* **BlockNote Custom Schema:** Fully integrated rich-text block editing featuring custom draggable cards (`routedEntry` and `scaffoldBlock`).
* **Lazy RAM Mounting:** Actively monitors and caches up to 3 active editor tab instances using CSS hides, silently serializing older tabs to SQLite to conserve memory.
* **Atomic Saves:** 3-second debounced auto-save and `Ctrl+S` manual force-saving serialize editor documents directly to relational DB records.

### 6. Sent Archival & Plain-Text Export (`FEAT-007`)
* **Plain-Text Serialization:** Walks custom BlockNote node trees recursively, stripping badges and structural containers to output pure markdown-compatible copy for Slowly.
* **Sent Timeline Logs:** Marking a letter as sent triggers a confirmation flow, copies the serialized letter to the system clipboard, deletes the active workspace draft, and archives the letter into the penpal's permanent timeline.

---

## 📦 How to Run

### Prerequisites
* **Node.js** (v18+)
* **Rust & Cargo** (Tauri v2 compilation requirements)
* **Windows Build Tools** (Visual Studio C++ Build Tools or equivalent for Windows targets)

### 1. Development Mode
Clone the repository and install packages:
```bash
npm install
```
Start the local development server and Tauri shell concurrently:
```bash
npm run tauri dev
```

### 2. Build for Production
To package the workstation into a optimized native `.exe` installer:
```bash
npm run tauri build
```
The resulting executable will be available in the `src-tauri/target/release/bundle/nsis/` directory.

---

## 🔒 Commercial & Privacy Compliance
* **Closed-Source Guarantee:** All dependencies are verified as commercially safe (MIT, Apache-2.0, ISC, MPL-2.0, and Public Domain).
* **Copyleft Boundary:** Strict protection rules ensure no GPL/AGPL "contamination" is ever imported.
* **Third-Party Disclosures:** See [LICENSE-THIRD-PARTY.txt](file:///c:/Users/USER/Desktop/APPS/journal-to-penpal-pipeline/LICENSE-THIRD-PARTY.txt) for a detailed legal audit of open-source components used.
