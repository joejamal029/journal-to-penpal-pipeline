# W-List: Build Plan

> "This should not just be built for the happy path alone."
> — Business Logic Brief

---

## Stack Decision

### Primary: React Native (Expo) + SQLite + FastAPI

```
┌──────────────────────────────────────────────────────────┐
│  FRONTEND: React Native (Expo SDK 51+)                   │
│  ├── Android primary target                              │
│  ├── Expo Web secondary (laptop access, same codebase)   │
│  ├── TypeScript (strict mode)                            │
│  ├── Zustand (local state management)                    │
│  ├── React Navigation (stack + bottom tabs)              │
│  └── Recharts / Victory Native (analytics charts)        │
│                                                          │
│  DATABASE: SQLite (via expo-sqlite, WAL mode)            │
│  ├── Runs embedded on device                             │
│  ├── No server required for core operation               │
│  └── expo-sqlite supports WAL + FTS5                     │
│                                                          │
│  BUSINESS LOGIC: Python (FastAPI) or TypeScript          │
│  ├── Option A: TypeScript inline (simpler, one language) │
│  ├── Option B: FastAPI local server (your Python fluency)│
│  └── Decision: TypeScript inline for mobile MVP          │
│      Python FastAPI for analytics + sync server later    │
│                                                          │
│  SYNC: OneDrive REST API                                 │
│  ├── Free 5GB, cross-device, no server cost              │
│  └── MSAL (Microsoft Authentication Library) for auth    │
│                                                          │
│  NOTIFICATIONS: Expo Notifications                       │
│  ├── Foreground + background                             │
│  └── Scheduled (audit timers, RSR due dates)             │
└──────────────────────────────────────────────────────────┘
```

### Why React Native over native Android (Kotlin)

| Factor | React Native + Expo | Native Kotlin |
|---|---|---|
| Cross-device | ✅ Phone + web same codebase | ❌ Android only |
| Your stack | ✅ TypeScript + your Python for backend | Dart/Kotlin unfamiliar |
| Build speed | ✅ Faster to MVP | Slower |
| Analytics | ✅ Recharts pre-built | Roll-your-own |
| SQLite support | ✅ expo-sqlite, mature | ✅ Room ORM |
| Offline-first | ✅ Reliable | ✅ Reliable |
| Codex compatibility | ✅ Best Codex JS/TS output quality | Lower |

**Tradeoff accepted:** React Native has some platform-specific quirks, especially with complex custom UI. The W symbol animation (SVG paths) may require `react-native-svg`. This is manageable.

---

## Repository Structure

```
w-list/
├── AGENTS.md                          ← Codex instructions
├── _blueprint/                        ← Omni-Stream planning docs
│   ├── wlist_overview.md
│   ├── wlist_data_models.md
│   ├── wlist_ui_spec.md
│   ├── wlist_business_logic.md
│   ├── wlist_analytics.md
│   ├── wlist_integrations.md
│   └── wlist_build_plan.md            ← this file
│
├── src/
│   ├── db/
│   │   ├── schema.sql                 ← Complete SQLite schema
│   │   ├── migrations/                ← Numbered migration files
│   │   │   └── 001_initial.sql
│   │   └── database.ts                ← expo-sqlite wrapper + typed queries
│   │
│   ├── models/                        ← TypeScript interfaces (data shapes first)
│   │   ├── List.ts
│   │   ├── Task.ts
│   │   ├── Assignment.ts
│   │   ├── Section.ts
│   │   ├── Analytics.ts
│   │   └── Integrations.ts
│   │
│   ├── engine/                        ← Business logic (pure functions, no I/O)
│   │   ├── ceiling.ts                 ← Ceiling enforcement
│   │   ├── audit.ts                   ← Audit cycle
│   │   ├── suggestions.ts             ← New list suggestion engine
│   │   ├── points.ts                  ← Point calculation
│   │   ├── wSymbol.ts                 ← W state machine
│   │   └── analytics.ts               ← Metric computation
│   │
│   ├── services/                      ← Side-effect layers
│   │   ├── ListService.ts             ← CRUD for lists
│   │   ├── TaskService.ts             ← CRUD for tasks
│   │   ├── AuditService.ts            ← Audit orchestration
│   │   ├── PomodoroService.ts         ← Pomodoro counter (simple log)
│   │   ├── PinkSlipService.ts         ← Pink slip operations
│   │   ├── RSRService.ts              ← SM-2 scheduling
│   │   ├── SyncService.ts             ← OneDrive sync
│   │   └── NotificationService.ts     ← Expo notifications
│   │
│   ├── components/                    ← Reusable UI components
│   │   ├── WSymbol.tsx                ← Animated W glyph
│   │   ├── TaskRow.tsx                ← Core task display
│   │   ├── CeilingBar.tsx             ← Section ceiling visualizer
│   │   ├── SectionGroup.tsx           ← Collapsible section container
│   │   ├── ListReferencePanel.tsx     ← Weekly/monthly/schedule reference strip
│   │   ├── PomodoroCounter.tsx        ← Inline +/- pomodoro counter
│   │   └── charts/                   ← Analytics chart components
│   │
│   ├── screens/
│   │   ├── TodayScreen.tsx            ← Main working surface
│   │   ├── NewListScreen.tsx          ← List creation
│   │   ├── AuditScreen.tsx            ← Audit view
│   │   ├── WeeklyScreen.tsx
│   │   ├── MonthlyScreen.tsx
│   │   ├── QuarterlyScreen.tsx
│   │   ├── YearGoalsScreen.tsx
│   │   ├── LibraryScreen.tsx          ← Task definition library
│   │   ├── PinkSlipScreen.tsx
│   │   ├── AnalyticsScreen.tsx
│   │   └── SettingsScreen.tsx
│   │
│   └── store/                         ← Zustand state
│       ├── listStore.ts
│       ├── taskStore.ts
│       └── settingsStore.ts
│
├── tests/
│   ├── engine/                        ← Pure function tests
│   │   ├── ceiling.test.ts
│   │   ├── audit.test.ts
│   │   ├── points.test.ts
│   │   └── suggestions.test.ts
│   └── services/                      ← Integration tests
│
└── package.json
```

---

## AGENTS.md (for this repository)

```markdown
## Project Overview
W-List: a personal operating system app for Android (React Native/Expo).
An eight-layer hierarchical task planning system with a custom point economy,
formal audit cycle, Pomodoro integration, Pink Slip academic tracking,
and SM-2 spaced repetition. Single user. Offline-first. OneDrive sync.

## Mode
New project. Full write access. No branch protection on main.
Read `_blueprint/` before each batch — it contains the complete design.
The most critical documents are:
  1. _blueprint/wlist_overview.md         (system philosophy + rules)
  2. _blueprint/wlist_data_models.md      (complete SQLite schema)
  3. _blueprint/wlist_business_logic.md   (rules engine)
  4. _blueprint/wlist_ui_spec.md          (every screen and component)
  5. _blueprint/wlist_integrations.md (connection to other systems)
  6. _blueprint/wlist_analytics.md (analytical capabilities)
  7. _blueprint/wlist_build_plan.md (exact build plan by subphase)
  

## Stack
- React Native (Expo SDK 51+), TypeScript strict mode
- expo-sqlite (WAL mode), SQLite FTS5
- Zustand (state), React Navigation (routing)
- react-native-svg (W symbol animation)
- Recharts / Victory Native (analytics)
- Expo Notifications (audit timers, RSR)

## Directory Map
src/db/         → SQLite schema, migrations, typed query wrapper
src/models/     → TypeScript interfaces (define before implementing)
src/engine/     → Pure business logic functions (no side effects, no I/O)
src/services/   → Side-effect orchestration (DB calls, notifications, sync)
src/components/ → Reusable UI components
src/screens/    → Full screen compositions
tests/          → Engine tests (pure functions), service tests (integration)

## Commands
- Dev: `npx expo start`
- Test: `npx jest`
- Lint: `npx eslint src/`
- Build Android: `npx expo build:android`
- Type check: `npx tsc --noEmit`

## Conventions
- TypeScript interfaces defined in src/models/ before any implementation
- Business logic in src/engine/ must be pure functions (no DB, no API calls)
- All DB access through src/db/database.ts typed wrapper — no raw SQL in components
- Naming: PascalCase for components/types, camelCase for functions/variables
- No `any` type anywhere. `unknown` at system boundaries with type guards.
- Commit format: `feat(scope): description` (conventional commits)

## Codex Permissions
### Do freely:
- Create/edit files anywhere in src/ and tests/
- Install dependencies listed in batch prompts
- Run tests and report results

### Always flag in PR:
- New dependencies not in the batch prompt
- Schema changes (migrations required)
- Any deviation from _blueprint/ design
- Any task not completed, with reason
```

---

## Build Sequence (6 Phases)

Each phase is a set of Codex batches. Phases are ordered by dependency.

---

### Phase 0: Foundation
*"Data models first. Logic second. UI never before either."*

**Batch 0.1 — Schema + seed**
```
Tasks:
  1. Create src/db/schema.sql with complete SQLite schema (all 13 tables)
  2. Create src/db/migrations/001_initial.sql
  3. Create src/db/database.ts: expo-sqlite wrapper with
     typed query functions for every table (get, insert, update, delete, query)
  4. Seed function: sections + default section ceilings
Verification: npx jest tests/db/ (query tests against in-memory SQLite)
PR must include: migration file, typed wrapper, seed data
```

**Batch 0.2 — TypeScript models**
```
Tasks:
  1. Create all interfaces in src/models/
     (List, Task, TaskAssignment, Section, SectionCeiling,
      PomodoroSession, PinkSlipCourse, PinkSlipSection, RSRSchedule, etc.)
  2. Create all enum types (TaskState, ListStatus, ListType, etc.)
  3. Create DTO types for service layer (CreateListInput, AddTaskInput, etc.)
Verification: npx tsc --noEmit
PR must include: all model files, zero type errors
```

**Batch 0.3 — Engine: core rules**
```
Tasks:
  1. src/engine/ceiling.ts: getAvailableCeiling(), validateTaskAddition()
  2. src/engine/points.ts: calculateEffectivePoints(), calculatePomoPoints()
  3. src/engine/wSymbol.ts: getWState(), getWPercentage(), getWAnimationPath()
  4. src/engine/audit.ts: computeAuditResult() — pure function, no DB
  5. src/engine/suggestions.ts: buildSuggestions() — minimal ranking
     (RSR due > scheduled > urgent > low-freq > mild)
Verification: npx jest tests/engine/ (all rule functions tested)
PR must include: all engine files, full test coverage for ceiling + audit logic
```

**Batch 0.4 — App Shell: navigation, theme, design tokens**
```
Tasks:
  1. React Navigation setup: bottom tabs (Today, Lists, Library, Stats)
  2. Stack navigators per tab
  3. Design system: color palette, typography, spacing tokens
  4. Global theme provider (dark mode prep)
  5. App entry point (App.tsx) with navigation container
Verification: App launches, bottom tabs navigate to placeholder screens
```

---

### Phase 1: Core Daily List
*The MVP. This phase alone is a usable product.*

**Batch 1.1 — Services: list + task CRUD**
```
Tasks:
  1. src/services/ListService.ts: createList(), getActiveDaily(), updateListStatus()
  2. src/services/TaskService.ts: createTaskDef(), addToList(), updateState()
  3. src/services/AuditService.ts: triggerAudit(), closeList(), resolveDeferred()
  4. Wire engine functions to services (ceiling checks before every add)
Verification: npx jest tests/services/ (audit cycle end-to-end test)
```

**Batch 1.2 — WSymbol component**
```
Tasks:
  1. src/components/WSymbol.tsx using react-native-svg
  2. All 5 states (0-4) with animated SVG path progression
  3. Proportional fill for multiplied tasks
  4. Size variants: sm/md/lg
  5. Completion pulse animation
Verification: Visual storybook test (screenshot comparison)
PR must include: component + animation + all state screenshots
```

**Batch 1.3 — TaskRow component**
```
Tasks:
  1. src/components/TaskRow.tsx
  2. All visual variants (pending/partial/complete/missed/deferred/delegated)
  3. Color system (non-negotiable): black text, red points, green multipliers,
     grey deferred, blue deferred-next-day
  4. Action buttons: W, ~, X, →, •••
  5. Subtask expansion
  6. Long press context menu
Verification: All state variants render correctly, no color violations
```

**Batch 1.4 — CeilingBar + SectionGroup components**
```
Tasks:
  1. src/components/CeilingBar.tsx: real-time ceiling visualization
     (green < 60%, amber 60-80%, red 80-100%, blocked at 100%)
  2. src/components/SectionGroup.tsx: collapsible section container
     with section header, ceiling display, task list
  3. Color variants per fill level
Verification: All ceiling states render, animations work
```

**Batch 1.5 — TodayScreen**
```
Tasks:
  1. src/screens/TodayScreen.tsx: two-pane layout (current + audited)
  2. Landscape: true split. Portrait: tab/stack between lists.
  3. Audited pane amber border < 6h, red border < 2h
  4. Floating action bar: + Add Task, Audit Now, New List
  5. Wire to ListService, TaskService, AuditService
  6. Real-time ceiling bar (updates on every task add/remove)
  7. Inline pomodoro counter on TaskRow ([+][-] buttons per task)
Verification: Full daily cycle possible: create tasks, mark states, audit
```

**Batch 1.6 — New List Creation screen (MVP)**
```
Tasks:
  1. src/screens/NewListScreen.tsx
  2. Reference panel: weekly / monthly / schedule / audited (pinned top, scrollable tabs)
  3. Available ceiling display with trailing breakdown (14.0 ceiling − 9.0 trailing)
  4. Suggestion engine rendered: RSR / scheduled / urgent / low-freq / mild
  5. Restriction indicators (⚠️ greyed for zero-completion, 🚫 for still-deferred)
  6. Override flow: modal with required reason text (min 10 chars)
  7. Weekly schedule visible as standalone reference panel
Verification: Full list creation with ceiling enforcement, restriction blocking
```

**Batch 1.7 — Audit Screen (MVP)**
```
Tasks:
  1. src/screens/AuditScreen.tsx
  2. Quick summary: completed / deferred / missed / delegated counts
  3. Deferred task list with inline W/X action buttons
  4. Countdown timer for each deferred task (24hr window)
  5. Same-day vs next-day completion color differentiation
  6. "Complete Audit" button with confirmation
  7. Auto-navigation to TodayScreen post-audit
Verification: Full audit cycle: trigger audit → resolve deferred → close list
```

---

### Phase 2: List Hierarchy

**Batch 2.1 — Weekly list screen**
```
Tasks:
  1. src/screens/WeeklyScreen.tsx
  2. Urgent / Mild / Other priority groups per section
  3. Ceiling shown as dashed line below section tasks
  4. Task frequency indicator (days since last done)
  5. Subtasks shown inline: "Task ^ [Sub1, Sub2]" format
  6. MISC section at bottom (no ceiling, no priority groups)
Verification: Weekly list renders with all sections and priority groups
```

**Batch 2.2 — Monthly list screen**
```
Tasks:
  1. src/screens/MonthlyScreen.tsx
  2. Frequency date display per task: [06, 08, 15, 22]
  3. Last completed highlighted, days-since-last shown
  4. Tasks with days_since_last > 14: amber highlight
  5. Tasks never done: unread (red) indicator
  6. Schedule section: weekly grid table
  7. Section ceiling configuration (editable)
Verification: Frequency dates populated from frequency log, schedule grid renders
```

**Batch 2.3 — 3-Month list (Task Library)**
```
Tasks:
  1. src/screens/LibraryScreen.tsx
  2. Full task_definitions browser with filter + sort
  3. Create/edit/archive task definitions
  4. Project badge, type indicators (TASK/PROJECT/BUILD/MISC)
  5. Autocomplete integration: task search by title across all lists
  6. Bulk operations: assign points, change section, add tags
Verification: CRUD operations, autocomplete works in other screens
```

**Batch 2.4 — Year Goals + Quarterly screens**
```
Tasks:
  1. src/screens/YearGoalsScreen.tsx: 8-section goal list, progress rings
  2. src/screens/QuarterlyScreen.tsx: full task registry for quarter
     (3-month list — rewritten every 3 months)
  3. Year goals are qualitative only — no task linking or measurable decomposition
Verification: Goals render per section, mark as achieved
```

<!-- REMOVED: Phase 3 (Pomodoro Integration) entirely.
     Pomodoro is now a simple value mapping (pomodoro_value on task_definitions,
     pomodoros_logged on task_assignments). The counter UI lives inline on
     TaskRow as [+][-] buttons (added in Batch 1.3 + 1.5).
     No PomodoroService, no PomodoroTimer, no session types, no break logic.
END REMOVED -->

---

### Phase 3: Integrations
*(Was Phase 4 — renumbered after Pomodoro removal)*

**Batch 3.1 — Pink Slip Manager**
```
Tasks:
  1. src/screens/PinkSlipScreen.tsx: course tabs, section tree, read tracking
  2. src/services/PinkSlipService.ts: getUnread(), getStale(), recordRead(), syncToWList()
  3. Gap visualization (red = unread, amber = stale > 14d)
  4. "Add gap tasks to W-List" bulk action
  5. Read recording on task completion (hook into AuditService)
Verification: Unread/stale sections surfaced, task generation works
```

**Batch 3.2 — RSR System**
```
Tasks:
  1. src/services/RSRService.ts: SM-2 algorithm, getDueToday(), autoDelegate()
  2. Schedule display: interval visualization per section
  3. Auto-add toggle on new list creation screen
  4. Performance input on task completion (perfect/good/hard/fail)
  5. Scheduled notification: morning alert on review due date
Verification: SM-2 intervals correct for multiple repetitions, notifications trigger
```

**Batch 3.3 — Calendar / Schedule**
```
Tasks:
  1. src/services/CalendarService.ts: getScheduledForToday(), getWeeklyGrid()
  2. Schedule grid renders on monthly screen
  3. Recurring tasks auto-appear in new list suggestions on their day
  4. Default schedule pre-loaded (from physical January 2026 list)
Verification: Monday tasks appear on Monday suggestions, grid renders correctly
```

**Batch 3.4 — OneDrive Sync**
```
Tasks:
  1. src/services/SyncService.ts: push(), pull(), sync()
  2. MSAL authentication flow (Microsoft login, token refresh)
  3. sync_log triggers on every DB write
  4. Sync button in Settings screen
  5. Conflict resolution (last-write-wins, timestamp comparison)
  6. Offline queue: all changes stored locally until sync available
Verification: Create list on phone → sync → visible on web view
```

---

### Phase 4: Analytics
*(Was Phase 5 — renumbered)*

**Batch 4.1 — Analytics data layer**
```
Tasks:
  1. src/engine/analytics.ts: all metric computations (pure functions)
  2. All SQL queries from wlist_analytics.md implemented as typed functions
  3. computeWeeklyAudit(), getForecast(), getCeilingCalibration(), forecastPeriodPoints()
  4. WeeklyAuditService.ts: save + retrieve weekly audits
Verification: All analytics functions return correct values against seeded test data
```

**Batch 4.2 — Analytics Screen**
```
Tasks:
  1. src/screens/AnalyticsScreen.tsx
  2. Today card (completion rate, points, streak)
  3. 7-day bar chart (completion rate per day)
  4. Section breakdown bar chart with configurable balance targets
  5. Ceiling utilization gauges
  6. Annual points tracker (6000pt progress bar + monthly/quarterly forecast)
Verification: All charts render, data matches analytics engine output
```

**Batch 4.3 — Task Attention Report**
```
Tasks:
  1. Most missed tasks (with miss rate %)
  2. Most delegated tasks
  3. Never-appeared tasks from 3-month list
  4. Stale tasks (>14d in monthly)
  5. Override frequency (flag if >10%)
  6. Task half-life display (days until typical miss after completion)
Verification: Attention report surfaces correct tasks from test data
```

**Batch 4.4 — GitHub-style streak calendar**
```
Tasks:
  1. Monthly heatmap grid (Mon-Sun rows, weeks as columns)
  2. Three fill levels (>80%, 50-80%, <50%)
  3. Tap day → shows that day's summary
  4. Current streak indicator
Verification: Heatmap renders from historical data, tap interaction works
```

---

### Phase 5: Polish + Hardening
*(Was Phase 6 — renumbered)*

**Batch 5.1 — Notifications**
```
Tasks:
  1. Audit due: 1h before list validity expires
  2. Deferred task expiring: at 2h remaining per task
  3. RSR task due: morning notification with task count
  4. Daily list not created: configurable morning prompt
  5. Weekly audit reminder: Sunday 20:00
  6. All notifications dismissible, configurable in Settings
Verification: Each notification type fires at correct time in test environment
```

**Batch 5.2 — Backdate + History Import**
```
Tasks:
  1. Backdate completion: task long press → "Backdate completion" → date picker
  2. Bulk backdate: CSV import format for historical W-List data
  3. January 2026 data import from provided markdown files
  4. Synthetic list generation for historical dates
Verification: Backdated completions appear in frequency log and analytics
```

**Batch 5.3 — Report Export**
```
Tasks:
  1. Day audit report: markdown, JSON, plain text formats
  2. Distinguish audit report vs. close report types
  3. Weekly report: markdown export
  4. Share sheet integration (WhatsApp, Notes, Files)
  5. Day report accessible from audit screen post-close
Verification: All three export formats generate correctly, share sheet opens
```

**Batch 5.4 — Settings Screen**
```
Tasks:
  1. Section ceiling configuration (per section, saved to DB)
  2. Pomodoro value customization (per task definition, default 1.0)
  3. Section balance target configuration
  4. Notification preferences (which alerts, what times)
  5. OneDrive sync status + manual sync button
  6. Default section colors/icons
  7. Data export (full SQLite backup to OneDrive)
  8. Audit time configuration (when daily audit triggers)
Verification: Settings changes persist, sync status displays correctly
```

**Batch 5.5 — Bulk Operations**
```
Tasks:
  1. Long press section header → multi-select mode
  2. Bulk: assign points, change section, add tags, toggle RSR, archive
  3. "Fill to ceiling remaining" auto-assign
  4. Select all unread pink slip sections → bulk add to W-List
Verification: Bulk operations apply correctly to multiple tasks
```

---

### End-Audit Sprint (Post all phases)

```
When all 5 phases are complete:
  1. Paste full codebase snapshot to Claude
  2. Claude runs code-audit-sprint → SPRINT_FIX.md
  3. Claude generates Codex fix-sprint batch prompt
  4. Codex implements all fixes
  5. Final PR → merge → v1.0 tagged
```

---

### Phase 6: Resiliency & Web Stability (Sprint C)
*Hardening for production-grade reliability across platforms.*

**Batch 6.1 — Hardened Initialization**
```
Tasks:
  1. src/db/database.ts: bootDB() returns instance, throws on failure
  2. App.tsx: Strict initialization gate (wait for DB before navigation)
  3. Global Error Boundary with diagnostic feedback
Verification: App stays on boot screen until DB ready; crashes caught by boundary.
```

**Batch 6.2 — Async Database Migration**
```
Tasks:
  1. src/db/database.ts: Implementation of runQueryAsync, executeAsync
  2. src/services/TaskService.ts: Async variants for heavy library queries
  3. src/screens/LibraryScreen.tsx: Non-blocking data loading with UI feedback
Verification: No "Database not initialized" crashes on Web/WASM first-load.
```

---

## Testing Strategy

```
Tier 1 — Engine tests (pure functions, no I/O):
  • Ceiling enforcement edge cases
  • Audit state transitions
  • Point calculation variants
  • W symbol state mapping
  • Suggestion ranking
  Run: npx jest tests/engine/

Tier 2 — Service integration tests (DB + engine):
  • Full audit cycle: create → assign → audit → defer → close
  • List creation with ceiling validation
  • RSR scheduling after review
  Run: npx jest tests/services/

Tier 3 — Screen smoke tests:
  • Each screen renders without crash
  • Navigation between screens
  Run: npx jest tests/screens/ (React Native Testing Library)
```

---

## MVP Checklist

The absolute minimum to start using this system electronically:

- [ ] Phase 0.1: Schema created and seeded
- [ ] Phase 0.2: TypeScript models defined
- [ ] Phase 0.3: Core engine functions (ceiling, audit, W-state, suggestions)
- [ ] Phase 0.4: App shell, navigation, design system
- [ ] Phase 1.1: List + task CRUD services
- [ ] Phase 1.2: W symbol renders correctly with all states
- [ ] Phase 1.3: Task row with colors, states, action buttons, pomodoro counter
- [ ] Phase 1.5: Today screen — create tasks, mark states, audit
- [ ] Phase 1.6: New List Creation with ceiling enforcement + reference panels
- [ ] Phase 1.7: Audit screen with deferred task resolution

**The MVP is complete when:** you can create a daily list with reference panels visible, assign tasks with ceiling enforcement, mark them W/X/deferred, log pomodoros via [+][-], trigger an audit, resolve deferred tasks, and create the next list. The ceiling constraint, zero-completion rule, and suggestion engine must all enforce correctly. That is the core loop.

Everything else compounds on top of this.

---

## Timeline Estimate

| Phase | Batches | Estimated Sessions | Milestone |
|---|---|---|---|
| 0 Foundation | 4 | 2–3 | Schema + models + engine + app shell |
| 1 Core Daily | 7 | 4–5 | MVP — usable daily list + audit + new list |
| 2 Hierarchy | 4 | 3–4 | Full list cascade |
| 3 Integrations | 4 | 3–4 | Pink Slip, RSR, Sync |
| 4 Analytics | 4 | 2–3 | Data → feedback loop |
| 5 Polish | 5 | 2–3 | Production-ready |
| **Total** | **28** | **~16–22 sessions** | **v1.0** |

One Codex session = one batch = one PR. You merge. Claude reviews diff. Next batch.
