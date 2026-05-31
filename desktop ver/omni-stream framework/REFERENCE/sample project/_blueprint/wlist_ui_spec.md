# W-List: UI/UX Specification

> "The layout, the way tasks are arranged — non-negotiable.
>  The colour coding of icons and symbols — non-negotiable.
>  We need to have multiple kinds of lists visible and interactable on the working interface."
> — Business Logic Brief

---

## Platform & Philosophy

**Platform:** Mobile-first (Android). Given electricity constraints and school mobility, phone is the primary device. Desktop (laptop) is secondary via cloud-synced web view.

**Design language:** Dense information, not minimal. The physical lists pack an enormous amount onto a single page. The UI should match this density — not flatten it into a sparse, airy interface that wastes screen real estate.

**Core principle:** Power tool. Not onboarding-friendly. Not for new users. For one person who knows the system deeply and wants the electronic version to feel as natural and fast as the physical one.

---

## Navigation Architecture

```
┌──────────────────────────────────────┐
│  BOTTOM NAV BAR                      │
│  [Today] [Lists] [Library] [Stats]   │
└──────────────────────────────────────┘

TODAY TAB:
  → Daily Working View (current + audited lists, side by side)

LISTS TAB:
  → List Hierarchy Browser
    → Weekly View
    → Monthly View
    → 3-Month View
    → Year Goals View

LIBRARY TAB:
  → Task Definition Library (3-month source)
  → Pink Slip Manager
  → RSR Schedule

STATS TAB:
  → Analytics Dashboard
  → Weekly Audit History
  → Section Performance
  → Point Velocity
```

---

## Screen 1: Today View (Main Working Surface)

This is the screen you live in. It shows both active lists simultaneously — the current list and the audited list, exactly as you work with two physical lists side by side.

### Layout

```
┌─────────────────────────────────────────────┐
│  TODAY  FRI 09 JAN  •  47.5 pts  •  🔔 2    │  Header bar
├─────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │  CURRENT LIST   │  │  AUDITED LIST   │   │  Two-pane split
│  │  Active 18h 22m │  │  ⚠️ 5h 38m left│   │  (or swipe between)
│  │                 │  │                 │   │
│  │  [list content] │  │  [list content] │   │
│  └─────────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────┤
│  CEILING STATUS BAR                         │
│  SCHOOL ████████░░ 9/14  SPIRIT ██████░ 6/10│
├─────────────────────────────────────────────┤
│  [+ Add Task]  [Audit Now]  [New List]       │  Action bar
└─────────────────────────────────────────────┘
```

**Two-pane behavior:**
- Landscape: true split-screen, both lists fully visible
- Portrait: stack with sticky headers, or tab between with swipe
- Audited list pane has amber border when < 6 hours remaining
- Audited list pane has red border when < 2 hours remaining
- Tasks on audited list show completion crosshatch if deferred_complete

### Single List Panel Content

```
┌──────────────────────────────────────────┐
│  SCHOOL  ████████░  9.0 / 14.0 pts  ▼   │  Section header (collapsible)
├──────────────────────────────────────────┤
│  ┌─── SUBTASK: Edem x3 (0.7pt) ───────┐  │
│  │                          [W] [~] [X]│  │
│  └─────────────────────────────────────┘  │
│                                           │
│  PHA 402 (2pt)           [W][~][X][→]    │  Task row
│  ┌──────────────────────────────────────┐ │
│  │  ▸ Edem x3    0.7                   │ │  Expanded subtasks
│  │  ▸ Bolode     0.7                   │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  PCA 402 (2pt) ×2 GREEN   [W][~][X][→]  │  Multiplier in green
│                                           │
│  PCL 401 (2pt)           [W][~][X][→]   │
├──────────────────────────────────────────┤
│  SPIRITUAL  ████░░░░  4.0 / 10.0 pts  ▼ │
├──────────────────────────────────────────┤
│  Devotion (2pt)          [W][~][X][→]   │
│  Prayer (1pt)            [W][~][X][→]   │
│  ...                                     │
└──────────────────────────────────────────┘
```

### Task Row: Detailed Specification

```
┌──────────────────────────────────────────────────────────┐
│  [STATE]  Task Title          [pts]  [W][~][X][→][•••]  │
└──────────────────────────────────────────────────────────┘

STATE indicator (left):
  ○  = pending (empty circle)
  ◑  = partial (half-filled)
  W  = complete (W glyph, bold)
  X  = missed (red X)
  →  = delegated (arrow)
  ═  = deferred (underline indicator, grey)
  ≠  = deferred complete same-day (strikethrough underline, grey)
  ≠  = deferred complete next-day (strikethrough underline, BLUE)

Points display:
  Normal points:    "2pt"  (red, right-aligned)
  Multiplied:       "2pt ×2" (×2 in green)
  Earned (partial): "1.4/2pt" (red)
  Pomodoro:        "🍅2" (small count)

Action buttons (right side):
  [W] = Complete
  [~] = Partial (opens percentage slider)
  [X] = Missed
  [→] = Delegate to next list
  [•••] = More (edit, subtasks, notes, Pomodoro, deferred, Pink Slip)

Long press on task row:
  → Opens task context menu:
    - Edit task details
    - Set multiplier
    - Add/edit subtasks
    - Link to Pink Slip section
    - Enable RSR
    - Backdate completion
    - Override restriction (with reason required)
    - View history
```

### The W Symbol: Interactive Rendering

The W symbol is the soul of the system. In the digital version:

```
STATE 0 (pending): ○
  Tap W button → animate to STATE 1

STATE 1 (25%): Draw left stroke of W
  Visual: / (thin line, animating in)

STATE 2 (50% / half-W): Draw to checkmark
  Visual: ✓ (left half of W complete)

STATE 3 (75%): Draw right descender (~60° from horizontal)\n  Visual: ✓\\ (three-quarter W, mirroring physical hand-drawing angle)", "StartLine": 167, "TargetContent": "STATE 3 (75%): Draw right descender\n  Visual: ✓\\ (three-quarter W)
  Visual: ✓\ (three-quarter W)

STATE 4 (100% / full W): Complete W
  Visual: W (bold, filled, colored by section)
  Animation: brief pulse/glow on completion

For tasks with multipliers (e.g., ×3):
  Each completion tap fills 1 unit
  W renders progressively based on units_completed / total_units
  "2/3" shown as superscript
```

### Ceiling Status Bar (always visible)

```
┌────────────────────────────────────────────────────┐
│ SCH  ████████░░  9/14   SPIRIT  ██████░░  6/10    │
│ DEPTS ██░░░░░░   1/3    SKILL   ████░░░░  2/6     │
│ BIZ  ███░░░░░░   1.5/4  REFL   ████░░░░   3/5    │
│ REST ████░░░░    2/4    REC    ░░░░░░░░   0/2     │
└────────────────────────────────────────────────────┘
Colors:
  0–60%  of ceiling: green fill
  60–80% of ceiling: amber fill
  80–100% of ceiling: red fill, warning label "⚠️ Near ceiling"
  100%: blocked, red, "CEILING REACHED"
```

---

## Screen 2: New List Creation

Accessed via [New List] action. This is the planning surface.

### Layout

```
┌─────────────────────────────────────────────┐
│  ← NEW DAILY LIST  •  Fri 10 Jan            │
├─────────────────────────────────────────────┤
│  REFERENCE PANEL (pinned top, scrollable tabs)  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ WEEKLY   │ │ MONTHLY  │ │ SCHEDULE │ │AUDITED │ │
│  │(priority)│ │ (freq.)  │ │ (grid)   │ │ LIST   │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
├─────────────────────────────────────────────┤
│  AVAILABLE CEILINGS (trailing breakdown)     │
│  SCHOOL: 5.0 remaining (14.0 ceiling − 9.0 trailing)│
│  SPIRIT: 4.0 remaining (10.0 ceiling − 6.0 trailing)│
├─────────────────────────────────────────────┤
│  SUGGESTED TASKS                            │
│  (auto-suggested from: weekly urgent tasks, │
│   low-frequency tasks from monthly,         │
│   RSR due today, scheduled recurring tasks) │
│                                             │
│  [+] PHA 402 · 2pt · SCHOOL  [Urgent]      │
│  [+] Devotion · 2pt · SPIRIT [Daily]       │
│  [+] Musicolet RSR · 1.5pt   [RSR due]     │
├─────────────────────────────────────────────┤
│  CURRENT LIST BUILDER                       │
│  [SCHOOL — 0.0/5.0 pts]                     │
│    [drag tasks here or tap + to add]        │
│                                             │
│  [SPIRITUAL — 0.0/4.0 pts]                  │
│    ...                                      │
├─────────────────────────────────────────────┤
│  TOTAL: 0.0 pts                             │
│  [Save List]  [Clear]                       │
└─────────────────────────────────────────────┘
```

**Interaction model:**
- Tap suggested task → adds to list with default points
- Long press suggested task → configure before adding (points, subtasks, multiplier)
- Drag between sections to reassign section
- Tap section header → bulk assign section ceiling remaining
- Real-time ceiling bar updates as tasks are added
- System warns and blocks when ceiling exceeded

**Restriction enforcement:**
- Tasks marked MISSED on audited list are shown with ⚠️ and greyed out in suggestions
- Tapping a restricted task shows: "This task had zero completion. Add with override?" → requires reason text
- Override reason stored with the assignment

---

## Screen 3: Audit View

Triggered when a list reaches its 24hr validity window OR manually via [Audit Now].

```
┌─────────────────────────────────────────────┐
│  ← AUDIT: Thu 09 Jan List                  │
│  List closes in 5h 38m                      │
├─────────────────────────────────────────────┤
│  QUICK SUMMARY                              │
│  ✓ 12 complete  ≈ 4 partial  ✗ 3 missed    │
│  → 2 delegated  Total: 34/47.5 pts (71%)   │
├─────────────────────────────────────────────┤
│  ACTION REQUIRED                            │
│                                             │
│  [Deferred — on the line] (4 tasks)         │
│  ════════════════════════════════════════   │
│  ═ Musicolet DB Manager (1.5pt)  [W][X]    │  Strikethrough affordance
│  ═ Beyond Shuffle (1.5pt)        [W][X]    │
│  ═ Prayer (1pt)                  [W][X]    │
│  ═ Journalistic (1pt)            [W][X]    │
│                                             │
│  [Missed] (3 tasks — will be logged as X)  │
│  ✗ SQL Course (1pt)                        │
│  ✗ Cooking (1pt)                           │
│  ✗ Random YT (1pt)                         │
├─────────────────────────────────────────────┤
│  [Complete Audit →]                         │
│  All deferred tasks will be on-the-line     │
│  Missed tasks logged to monthly record      │
└─────────────────────────────────────────────┘
```

**Post-audit state:**
- Audited list remains visible in Today View with on-the-line styling
- Deferred tasks show ══ underline, tappable to mark complete
- Same-day completion: strikethrough underline, grey color
- Next-day completion: strikethrough underline, BLUE color
- Timer shows time remaining for deferred tasks
- "Close List" button appears when all deferred tasks resolved

---

## Screen 4: Weekly List View

```
┌─────────────────────────────────────────────┐
│  ← WEEKLY W-LIST  18–24 Jan 2025           │
│  [Edit]  [Reference Monthly]                │
├─────────────────────────────────────────────┤
│  SCHOOL ─────────────────────────────────   │
│  URGENT:                                    │
│  PCL 401 (2pt) ^ [Labnotes, Flash] [Olamide]│
│  PCG 401 (2pt) ^ [Aigbede, Olubode]        │
│  PHC 404 (1pt) ^ [Basics]                  │
│  ─ ─ ─ ─ Ceiling: 14 ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│  MILD:                                      │
│  PCA 401 (2pt)  PCA 402 (1pt)              │
│                                             │
│  SPIRITUAL ───────────────────────────────  │
│  URGENT:                                    │
│  Evang Prep (1.5pt)  Follow-up (1pt)       │
│  Study Group (1.5pt)  Assignment (1pt)      │
│  Prayer (2pt)  Devotion (2pt)               │
│  ─ ─ ─ ─ Ceiling: 10 ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│  MILD:                                      │
│  DV2 (1.5pt)  Bible Study (1pt)            │
│  OTHER:                                     │
│  Developing Faith  Leading of Spirit        │
│  ...                                        │
├─────────────────────────────────────────────┤
│  MISC ─────────────────────────────────────  │
│  Fix shoe · Fix Musicolet album             │
│  Get lite list e · Save type lesson        │
└─────────────────────────────────────────────┘
```

**MISC section rules:**
- MISC appears ONLY on weekly and daily lists (not monthly or 3-month)
- No ceiling constraint — MISC is uncapped
- No subtasks by convention
- No priority groups — MISC is flat
- Quick-add interface: lightweight, spontaneous, urgent tasks

**Interaction:**
- Tap section header → collapse/expand
- Long press task → edit priority level (Urgent/Mild/Other)
- Subtasks shown inline, collapsed by default, tap to expand
- Ceiling shown as dashed line below section tasks
- Priority groups are collapsible
- Task frequency: dates visible on tap/hover (e.g. [06, 08, 15, 22]) + colored dot for recency

---

## Screen 5: Monthly List View

```
┌─────────────────────────────────────────────┐
│  ← MONTHLY  January 2026                   │
│  [Edit]  [New Month]  [← Nov] [→ Feb →]    │
├─────────────────────────────────────────────┤
│  SCHOOL — ceiling: 14pt                     │
│  PHC 401       [06, 07, 15, 22] ←dates     │
│  PCL 401       [08, 12, 19]                 │
│  PCG 401       [06, 08]                     │
│  ...                                        │
│  ── BUILD ──                                │
│  Rx Handbook   [03]                         │
│                                             │
│  SPIRITUAL — ceiling: 10pt                  │
│  Devotion      [06, 08, 12, 15, 17, 20]    │
│  Prayer        [07, 14, 21]                 │
│  ...                                        │
│                                             │
│  ── SCHEDULE ──                             │
│  ┌──────────────────────────────────────┐   │
│  │  SUN  MON  TUE  WED  THU  FRI  SAT  │   │
│  │  SPR  BIB  SG   SG   MID  BIB  FEL  │   │
│  │  BUS       BUS            BUS  BUS   │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Frequency date display:**
- Tap date chip → see the task_assignment for that day
- Last completed date highlighted differently (most recent)
- Days since last completed shown as tag: "8d ago"
- Low-frequency tasks (>14d since last) highlighted amber

---

## Screen 6: 3-Month List View (Task Library)

```
┌─────────────────────────────────────────────┐
│  ← 3-MONTH  Q1 2026 (Jan–Mar)             │
│  [New Quarter]  [Edit]  [Stats]             │
├─────────────────────────────────────────────┤
│  FILTER: [All ▼] [Section ▼] [Active ▼]    │
├─────────────────────────────────────────────┤
│  SCHOOL ─────────────────────────────────   │
│  ○ PHA 401           TASK   2pt            │
│  ○ PCL 401           TASK   2pt            │
│  ○ Rx Handbook       BUILD  3pt (project)  │
│                                             │
│  SPIRITUAL ───────────────────────────────  │
│  ○ Devotion          TASK   2pt  [daily]   │
│  ○ NT Transcription  BUILD  4pt (project)  │
│  ○ Evangelism Manual BUILD  3pt (project)  │
│                                             │
│  D.E.P.T.S ───────────────────────────────  │
│  ○ Musicolet X29     BUILD  6pt (project)  │
│  ○ M3u Haven         BUILD  8pt (project)  │
│  ○ SQL Cert          TASK   3pt            │
│  ...                                        │
├─────────────────────────────────────────────┤
│  [+ New Task]  [+ New Project]  [+ Import] │
└─────────────────────────────────────────────┘
```

**3-month task features:**
- Persists across all lists — autocomplete when typing task names elsewhere
- Project badge clearly differentiated (different icon/color)
- Archive tasks no longer relevant without deleting history
- Filter by: active/archived, section, type, has-RSR, has-pink-slip
- Sort by: last completed, frequency, points, name

---

## Screen 7: Year Goals View

```
┌─────────────────────────────────────────────┐
│  ← 2026 GOALS                              │
│  Mar 23 · Day 82 of 365                    │
├─────────────────────────────────────────────┤
│  Progress rings (one per section)           │
│  ⬤  SCH  ⬤  SPIRIT  ⬤  DEPTS            │
│  ⬤  SKILL ⬤  BIZ   ⬤  REFLECT           │
├─────────────────────────────────────────────┤
│  SPIRITUAL ─────────────────────────────── │
│  ○ NT Full Transcription                   │
│  ○ Complete OT (on 1 Samuel)               │
│  ○ Strong prayer life (consistent)         │
│  ✓ Start Believer 2nd Brain planning       │
│                                             │
│  D.E.P.T.S ─────────────────────────────── │
│  ○ Get 7 apps to app stores                │
│  ○ SQL Certification                       │
│  ○ Python Certification                    │
│  ○ W-List → Electronic                     │
│  ...                                        │
│                                             │
│  MISC ──────────────────────────────────── │
│  ○ 6000 W-List Points (productivity mode)  │
│  ○ 10k Clash Royale trophies               │
│  ○ New phone                               │
└─────────────────────────────────────────────┘
```

---

## Screen 8: Pomodoro Counter (task-embedded)

Pomodoro is a simple point-value mapping, NOT a timer engine. The user logs completed pomodoros on a task, and points are calculated automatically.

```
Pomodoro is accessed inline on the task row:

┌─────────────────────────────────────────────┐
│  PHA 402 (2pt)         🍅 3  [-][+]       │
│  Points: 3.0 / 2.0 (complete ✓)           │
└─────────────────────────────────────────────┘

[+] button: logs one pomodoro, adds pomodoro_value points
[-] button: removes last logged pomodoro (undo)
🍅 N: count of pomodoros logged on this assignment
```

**Pomodoro-to-points mapping (simple):**
- 1 logged pomodoro = `task_def.pomodoro_value` W-points (default 1.0)
- Default assumption: 1 pomodoro = 23 minutes of work
- `pomodoro_value` is configurable per task definition
- Multiple pomodoros stack: 3 pomos on a 2pt task = 3pt earned = complete
- Useful for backdating: "I did 2 pomodoros yesterday" → log 2, backdate

<!-- COMMENTED OUT: Full Pomodoro timer screen removed.
     W-List does not implement a timer/session engine.
     Use an external Pomodoro timer if needed;
     W-List only tracks logged pomodoro COUNTS for point calculation.
END COMMENTED OUT -->

---

## Screen 9: Pink Slip Manager

```
┌─────────────────────────────────────────────┐
│  ← PINK SLIP  Semester 2025/26 S2          │
├─────────────────────────────────────────────┤
│  [PHA 401] [PCL 401] [PCG 401] [PCA 402]   │  Course tabs
├─────────────────────────────────────────────┤
│  PHA 401 · Pharmacology                     │
│  Lecturer: Edem                             │
│                                             │
│  SECTION 1: Drug Receptor Interactions      │
│  ├─ 1.1 Receptor types         ✓ 12 Jan    │
│  ├─ 1.2 Agonists & antagonists  ✓ 15 Jan   │
│  └─ 1.3 Dose-response curves   · UNREAD    │  highlighted red
│                                             │
│  SECTION 2: Autonomic Pharmacology          │
│  ├─ 2.1 Sympathomimetics        ✓ 08 Jan   │
│  ├─ 2.2 Parasympathomimetics    · 22d ago  │  amber (>14d)
│  └─ 2.3 Adrenergic blockers     · UNREAD   │  red
│                                             │
│  GAP ANALYSIS                               │
│  ░░░████░░███░░░ 8 sections unread          │
│                                             │
│  [+ Add to W-List: 3 Unread Sections]      │
└─────────────────────────────────────────────┘
```

---

## Screen 10: Analytics Dashboard

Full specification in `wlist_analytics.md`. Overview:

```
┌─────────────────────────────────────────────┐
│  ← ANALYTICS                               │
│  [Day] [Week] [Month] [All time]            │
├─────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐           │
│  │  71%   │ │ 34 pts │ │ 🔥 4   │           │
│  │ Today  │ │ Today  │ │Streak  │           │
│  └────────┘ └────────┘ └────────┘           │
├─────────────────────────────────────────────┤
│  7-DAY COMPLETION TREND                     │
│  ████████                                   │
│       (bar chart, per day)                  │
│                                             │
│  SECTION BREAKDOWN                          │
│  SCHOOL   ████████░░ 82%                    │
│  SPIRIT   ████░░░░░░ 44%  ← attention       │
│  DEPTS    ██████░░░░ 61%                    │
│  ...                                        │
├─────────────────────────────────────────────┤
│  MOST DELEGATED: Beyond Shuffle (5×)        │
│  MOST MISSED: Journalistic (8×)             │
│  MOST COMPLETED: Devotion (22× this month)  │
└─────────────────────────────────────────────┘
```

---

## Component Library

### TaskRow component

```
Props:
  task: TaskAssignment
  showSubtasks: boolean
  isAudited: boolean  (changes styling to deferred mode)
  ceilingRemaining: number  (affects add ability)
  onStateChange: (state) => void
  onExpandSubtasks: () => void
  onStartPomodoro: () => void
  onDelegate: () => void
  onLongPress: () => void

Visual variants:
  PENDING:         Standard black text, point in red
  PARTIAL:         Standard + partial W indicator + progress fraction
  COMPLETE:        W glyph shown, text slightly dimmed, green accent
  MISSED:          X shown, text dimmed, red accent
  DELEGATED:       → shown, grey text, italic
  DEFERRED:        Underline drawn below task text (grey)
  DEF_SAME_DAY:    Underline with strikethrough (grey)
  DEF_NEXT_DAY:    Underline with strikethrough (BLUE)
  WITH_MULTIPLIER: Multiplier shown in green after points
  WITH_SUBTASKS:   Expandable chevron, subtasks in nested list
  RESTRICTED:      Semi-transparent with ⚠️ badge (zero-completion task)
```

### CeilingBar component

```
Props:
  sections: Section[]
  ceilings: { [sectionId]: { ceiling, used, available } }
  mode: 'compact' | 'expanded'

Behavior:
  < 60% ceiling used: green fill
  60–80% used: amber fill, pulse animation starts at 75%
  80–100% used: red fill, label "⚠️ Near limit"
  = 100%: solid red, no interaction possible, "CEILING REACHED"
```

### WSymbol component (animated SVG)

```
Props:
  state: 0 | 1 | 2 | 3 | 4
  percentage: 0.0 – 1.0  (for fractional states)
  size: 'sm' | 'md' | 'lg'
  animated: boolean

Paths:
  Path 1: Left descender ↘ (0–25%)
  Path 2: Left ascender ↗ (25–50%)
  Path 3: Right descender ↘ (50–75%)
  Path 4: Right ascender ↗ (75–100%)

On complete (100%): brief scale pulse + color flash
```

### ListReferencePanel component

Used in new list creation — shows weekly/monthly/audited for reference.

```
Props:
  weeklyList: List
  monthlyList: List
  auditedList: List | null
  onTaskSelect: (taskDef) => void  // adds to current list

Display: horizontal scroll panel at top of list builder
Each panel: compact task list with priority indicators
Tap task in reference panel → adds to builder
```

---

## Interaction Patterns

### Bulk operations (Power App requirement)

Long press a section header in list builder → select mode:
- Checkbox appears on each task
- Bulk: assign points, change section, add tags, delete, toggle RSR
- "Assign ceiling remaining" → auto-fills selected tasks to use available ceiling

### Backdating completion

Task long press → "Backdate completion" → date picker → sets completed_at to past date, recomputes frequency log. Required for importing existing W-List history.

### Task autocomplete (from 3-month library)

When typing a new task in any list:
- Fuzzy search against task_definitions
- Shows matching tasks with their default points, section, last completed date
- Tap to use definition OR save as new definition
- 3-month tasks show distinctive icon

### MISC section (weekly and daily)

- Always at bottom of list
- No ceiling enforcement
- Items are low-point, fast, spontaneous
- Quick-add via floating button in MISC area
- No subtasks (by convention)

### Delegation (→)

Tap → on task:
- Task marked DELEGATED on current list
- New task_assignment created on next valid list (or queued if no next list yet)
- Original assignment linked to new via delegated_assignment_id
- Ceiling constraint still applies on receiving list
- User can assign which list receives the delegation

---

## Offline Behavior

All operations are fully offline. No spinner, no "connecting..." states.

```
Write operations: → SQLite immediately → queue to sync_log
Read operations: → SQLite always (never blocks on network)

Conflict resolution:
  - Last-write-wins per record (timestamp comparison)
  - Completion events are append-only (never overwritten)
  - List creation/audit events are device-authoritative
```

---

## Notifications

```
NOTIFICATION TYPES:
  [HIGH] Audit due: "Your list from yesterday needs an audit"
  [HIGH] Deferred task expiring: "Prayer is on the line — 2h left"
  [MED]  RSR task due: "Pharmacology S2.2 is due for review"
  [MED]  Weekly audit: "Sunday — time for your weekly review"
  [LOW]  Daily list not created: "No list yet today — start one?"
  [LOW]  Ceiling warning: "SCHOOL is at 85% of ceiling"

Notification rules:
  - Audit due: 1h before list expires (configurable)
  - Deferred expiry: at 2h remaining for each deferred task
  - RSR: morning of scheduled review date
  - Weekly: Sunday 20:00
  - Daily: if no list by user-configured time (default: 09:00)
```
