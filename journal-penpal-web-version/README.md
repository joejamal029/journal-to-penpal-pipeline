# Journal-to-Penpal Web Workstation 📬🌐

> A block-based local web workstation that transforms daily journal entries into curated, high-fidelity letters for multiple penpals — running 100% inside your browser's database.

The **Journal-to-Penpal Web Workstation** is a single-user, local-first power-tool built on **TanStack Start**, **React 19**, **Dexie (IndexedDB)**, and **BlockNote**. It is designed for long-form writers who keep daily diaries and wish to dynamically discover, filter, group, and route their life observations into letters for multiple correspondents in parallel without their private data ever leaving the browser.

---

## 📬 For the Developers & Users of Journalistic

If you are a creator, developer, or active user of **Journalistic**, this pipeline and workstation are designed with you in mind.

### 💖 A Love Letter to Journalistic

Journalistic was my absolute favorite journaling application. The team behind it built the single best micro-journaling experience to ever exist, and they did it completely for free.

However, because the project has not seen updates since late 2024 (it is now 2026), and due to limitations like the lack of offline access, syncing bugs, and restricted extraction of captured content, this project was born. We created this local-first, browser-local workstation to bridge the gap between private logs and penpal correspondence.

### ⚡ The "Crazy Benefit" for Journalistic Users

If you use Journalistic, this project gives you a superpower: **you can turn years of raw micro-journal entries into a fully structured, block-based penpal drafting workstation.**

- **Infinite Provenance:** As you compile drafts or route entries to different penpals, the editor keeps interactive links back to the exact line number and date inside your original journal.
- **Dynamic Category Mapping:** Your custom section headers (e.g. `### Thought`, `### Idea`, `### Expansion`) are parsed automatically and dynamically generate filter pills in the workstation.
- **100% Offline & Private:** Your personal logs are stored entirely in your local browser's IndexedDB database—no accounts, no cloud sync, and no privacy compromises.

### 🛠️ Setup Requirements for Journalistic Users

To plug your journal data into this workstation, follow these steps:

1. **Export as Markdown (.md):** Go to your Journalistic app settings and export your entire journal history in Markdown format.
2. **Run the Dispatcher ([dispatch_end_to_end.py](file:///c:/Users/USER/Desktop/APPS/journal-to-penpal-pipeline/journal-penpal-web-version/dispatch_end_to_end.py)):** Run the provided Python Tkinter script on your mega-export Markdown file. This splits the single file into clean, daily markdown files structured nicely by Year and Month folders (e.g. `2026/January/January 7, Sun.md`).
3. **Import Folder in Workstation:** Launch this web application, click `+ Import journal` at the bottom left, select `Choose folder`, and pick the processed directory structure. The application recursively parses the folders and indexes all thoughts instantly!

_(Note to Journalistic developers: I would love to collaborate with you or see the project open-sourced. Please read my full thoughts and proposal in [email_to_devs.md](file:///c:/Users/USER/Desktop/APPS/journal-to-penpal-pipeline/journal-penpal-web-version/email_to_devs.md).)_

---

## 💎 The Web-First Value Proposition

Traditional letter writing involves jumping between raw diary text and individual draft editors, losing track of what thoughts have been shared, and manually copying text chunks.

This workstation establishes a structured **data bridge** between your private records and your interpersonal dialogue, running completely locally inside browser storage:

- **Discover Serendipity:** Crawl, search, and randomize 10,000+ daily entries in real time.
- **Keep Provenance:** Every journal line routed into a letter carries an immutable metadata badge showing the origin date and category tag (`[date] · #[category]`).
- **Scaffold Timeframes:** Push curated, date-grouped timeframe overviews (e.g., "This Week's Highlights") to multiple penpals simultaneously with duplicate guards.
- **100% Local-First & Private:** Your personal diaries, correspondence history, and draft letters never leave your machine — stored securely in a local, high-performance IndexedDB database managed by Dexie.

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

## 🔌 Extensible Input Formats & Generic Adaptability

While the workstation is pre-configured to seamlessly integrate with Journalistic exports, **it is designed to be highly adaptable and flexible for generic note-takers and long-form journalers using other tools (Obsidian, Logseq, Day One, raw markdown text files, etc.).**

The parsing engine automatically auto-detects and supports three distinct structure variations:

1. **Format 1: Paragraph-based Markdown**
   - **Structure:** Daily dates specified by Markdown headings (`# 2026-05-31` or `# May 31, 2026`). Any subsequent paragraph is parsed as a single thought-unit. Double hash headings (`## Section Name` or more, e.g. `### Idea`) denote dynamic categories or topic sections.
   - **Ideal for:** Obsidian daily notes, Logseq journal pages, or single-file mega-journals.

2. **Format 2: Plain ISO Line Headers**
   - **Structure:** A date line (`2026-05-31`) followed immediately by one unit per line.
   - **Ideal for:** Automated exports, simple CSV-to-text converters, or minimalist text-file logs.

3. **Format 3: Bullet Lists with Date Headers**
   - **Structure:** A date heading followed by lists using bullet characters (`-` or `*`) representing individual units.
   - **Ideal for:** Day One exports, outline-based journalers, and bullet journaling workflows.

### ⚙️ How to Adapt Your Own Writing System

If you don't use Journalistic, you can easily import your notes by following these conventions:

- **Tagging:** Use inline `[P]` (Presence) or `[R]` (Reminiscence) markers at the start of paragraphs to categorize them, or write custom hashtags anywhere in the text (e.g. `#reflection`, `#travel`). Hashtags are automatically indexed as clickable filter tags.
- **Dynamic Sections:** Write markdown section headers (e.g., `### Thought`, `### Expansion`, `### Spark`) to define custom categories on-the-fly. The parser extracts the section name, maps it to the category, and automatically spawns a corresponding filter pill in the UI.
- **Import File-level Dates:** If your markdown notes don't contain date headers inside, name your files using a date format (e.g., `2026-05-31.md` or `May 31, 2026.txt`). The workspace will fallback to parsing the date from the filename!

---

## 🚀 Key Product Features

### 1. Journal Ingestion & Parsing (`IR-FEAT-001`)

- **Format Detection:** Auto-detects and parses three layout format variants (Markdown headings, plain ISO lines, and bullet lists with long dates).
- **Nom Parser Engine:** High-performance regex plucking combinators extract category tags (`[P]`/`(P)` for Presence, `[R]`/`(R)` for Reminiscence) dynamically.
- **Incremental Syncing:** Unchanged blocks preserve their database IDs on re-import to protect existing marginalia. Same-content files skip parsing early, and changes trigger transactional cascade deletions.
- **File Name Date Fallback:** Parses starting dates directly from imported file names (e.g. `2026-05-31.md` or `May 12, 2026.txt`) using the standard ISO and Long formats if no internal day-headers are found inside.

### 2. Penpal Profile Management (`IR-FEAT-002`)

- **Relational Databases:** Keep structured, profile metrics for each correspondent (Name, Country, Topics, Notes).
- **History Timelines:** Past correspondence sent or received is archived chronologically, rendering interactive logs on a clean playhead line.
- **Relational Integrity cascades:** Deleting profiles triggers a single database transaction sweeping associated draft letters and timeline logs, preventing data leaks.

### 3. Virtualized Journal Crawler & FilterBar (`IR-FEAT-003`)

- **TanStack Virtual:** Smooth 60fps scrolling performance, fully optimized for browsing 10,000+ thoughts in-browser.
- **Collapsible Tools Pane:** Shrinks detailed filter modules into a toggleable popover, dropping the crawlers header workspace from 50% down to under 20% to keep thoughts front-and-center.
- **Premium Metrics counters:** Segmented switcher tabs feature golden indicator badges (`text-[9px] text-amber-500 drop-shadow-sm`) displaying live database metrics.

### 4. Block-Based Letter Workspace (`IR-FEAT-004`)

- **BlockNote Custom Schema:** Custom React NodeViews render fully editable `routedEntry` and `scaffoldBlock` layout components in-editor.
- **Caret-Positioned Drops:** Direct mouse drag-and-drops utilize screen coordinates checking (`closest("[data-id]")`) to inject content precisely where the cursor rests, completely blocking default raw-text pastes.
- **Legacy Normalizer:** A recursive parser sweeps older JSON formats on load and normalizes them into inline-editable card formats safely.

### 5. Grouped Scaffold Generator (`IR-FEAT-005`)

- **Timeframe Curator:** Groups journal paragraphs chronologically by day, allowing selective checklist exclusions.
- **Concurrency Overwrite Shield:** Subscriptions to database writes prevent stale in-memory documents from overriding external changes, merging in fresh scaffold elements smoothly.
- **Selective Generation:** Append structured outlines to existing drafts or build fresh draft files with one click.

### 6. Draft & Session Management (`IR-FEAT-006`)

- **Debounced Save locks:** Auto-saves draft changes with 800ms debounce cycles, comparing in-flight written strings to block structures before resetting dirty states.
- **Inactive Tab flushes:** Switching tabs or closing panels instantly triggers flush cycles to commit in-flight text updates without data-loss.
- **Zustand UI Sync:** Persists opened tabs, active workspace focus, and draft status globally inside browser local storage.

### 7. Sent Archival & Plain-Text Export (`IR-FEAT-007`)

- **Markdown-Safe Serializer:** Walks BlockNote block trees recursively, stripping badges, metadata elements, and structural wrappers to output pure text copy.
- **Sequential list numbering:** Automatically tracks nested lists, outputting ordered lists (`1. `, `2. `) rather than simple dashes, resetting properly when lists split.
- **Timeline Archiver:** Marking a letter as sent copies it to the system clipboard, purges the editor workspace draft, and commits the plain text to the penpal's permanent history timeline in IndexedDB.

### 8. Bicameral Journal Crawler & Reflection Desk (`IR-FEAT-008`)

- **Monospace Typewriter Editor:** Swap the virtualized stream for a beautiful, raw markdown writer complete with live parsed updates and Loom provenance stats.
- **The Living Margin (Reflections):** Click card margins to write inline reflections stored inside IndexedDB, anchored via content-based hashes to resist text edits and line drift.
- **The Depth Gauge:** Unfold surrounding paragraphs within cards instantly to analyze raw diary context without losing workspace focus.

### 9. Curation Collections & Curation Synthesis (`IR-FEAT-009`)

- **Global Threads Curation:** Group associated thoughts globally, independent of penpals. Compound index constraints (`[collection_id+thought_unit_id]`) block duplicates at the database level.
- **Curation Analytics:** Visualize timelines, estimated read times, and segment category vibe ratios (Presence, Reminiscence, Thought, Idea) beautifully.
- **Compilation Spill Drops:** Drag and drop an entire collection card directly onto the editor workspace to trigger a continuous, fully indexed routed block spill ingestion.

### 10. Automated Headless Test Suite (`IR-FEAT-010`)

- **Vitest Testing Framework:** Headless test runner executing unit and integration tests inside isolated, virtual environments.
- **Global db polyfill mocks:** Integrated `fake-indexeddb/auto` mocks the IndexedDB schema perfectly in memory, allowing automated assertions on Dexie schema writes and cascades.
- **GitHub CI pipeline:** Triggers automated lint checks, unit tests, and production compilations on every push.

### 11. Bi-directional Curation Routing & Live Indicators (`IR-FEAT-011`)

- **Recursive Letter scans:** Scans active letter BlockNote documents to locate FNV-1a block hashes, indexing routed thought locations instantly.
- **Clickable Hot-Link badges:** Routed thought cards feature sideways horizontal wrapping indicator badges showing target letters. Click any badge to target and open that draft workspace tab immediately.
- **Backward Compatibility:** Generates deterministic content hashes on-the-fly for legacy drafts lacking exact block IDs, maintaining routing linkage reliability.

---

## 🚀 How to Run

### Prerequisites

- **Node.js** (v20+)
- **NPM** (v10+)

### 1. Development Mode

Clone the repository and install packages:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Open your browser and navigate to **[http://localhost:8080/](http://localhost:8080/)** to launch the workstation.

### 2. Build for Production

To compile and check type safety, React 19 constraints, and compiler health:

```bash
npm run build
```

Verify that Vite packages both client assets and server-side rendering (SSR) layers with 100% success.
