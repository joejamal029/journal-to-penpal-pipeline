# W-List System: Master Design Document

> "It must be at the heart a planner first, then an execution engine."
> — Business Logic Brief

---

## What This System Is

The W-List is a personal operating system with eight layers of hierarchy, a mathematically enforced point economy, a formal audit cycle, and a completion symbol so specific it has a name. It is not a to-do list app. It is the operating engine of a life.

This is a power tool. Bulk assignment of scores, sections, and tags is a first-class interaction pattern — not an afterthought. Dense information, rapid input, and multi-list visibility drive every design decision.

This document governs everything: philosophy, hierarchy, rules, UI, data, integrations, analytics, and build sequence. Every other design document in this set flows from here.

---

## The Eight-Layer Stack

```
┌─────────────────────────────────────────┐
│  YEAR GOALS                             │  Strategic intent. 8 sections.
│  Aspirations for the full year          │  Rewritten annually.
├─────────────────────────────────────────┤
│  3-MONTH LIST (Quarterly)               │  Everything on radar.
│  Full task + project registry           │  Rewritten every 3 months.
│  Autocomplete source for all lists      │  Task defs persist here.
├─────────────────────────────────────────┤
│  MONTHLY LIST                           │  Task frequency log + ceiling config.
│  Consulted in making weekly             │  Rewritten monthly, consults 3-month.
├─────────────────────────────────────────┤
│  WEEKLY LIST                            │  Priority grounding (Urgent/Mild/Other)
│  Consulted in making daily              │  Rewritten weekly, consults monthly.
├─────────────────────────────────────────┤
│  DAILY W-LIST ← THE EXECUTION LAYER    │  The heartbeat. 24hr lifespan.
│  2 valid lists max at any time          │  References weekly + monthly + audited.
├─────────────────────────────────────────┤
│  POMODORO VALUE MAPPING                 │  1 pomo = 1 W-point (23min default).
│  Point-value integration only           │  No timer engine; log & calculate.
├─────────────────────────────────────────┤
│  TIME-BLOCKING                          │  Large focus blocks + recovery blocks.
│  The schedule layer                     │  ~5.5hr work + ~1.5hr break.
├─────────────────────────────────────────┤
│  INTENSE FOCUS PROTOCOL                 │  20-min academic blocks.
│  The task execution layer               │  Flow mode for technical work.
└─────────────────────────────────────────┘
```

---

## The Eight Sections

Every list level contains the same sections. Every section has its own ceiling, its own task taxonomy, and its own character.

| # | Section | Ceiling (Monthly) | Character |
|---|---|---|---|
| 1 | SCHOOL | 14 pts | Course-driven, urgent, externally clocked |
| 2 | SPIRITUAL | 10 pts | Consistency-first, physically grounded |
| 3 | D.E.P.T.S | 3 pts | Projects + certifications + skills |
| 4 | SKILL & INTELL | TBD | Languages, writing, typing, books |
| 5 | BUSINESS | TBD | Finance, reading, investing |
| 6 | REFLECT | TBD | Life, journaling, audits, goals |
| 7 | RESTORE | TBD | Laundry, dishes, food, environment |
| 8 | RECREATION | TBD | Music, gaming, reading, cruise |
| — | MISC | — | Urgent, spontaneous, lightweight (weekly+) |

Ceiling points are configured on the Monthly list and cascade downward. They are user-adjustable but never exceeded.

---

## The Completion Symbol: The W

The W is the core visual language of the system. It is not a checkbox. It is a symbol that encodes both completion state and percentage simultaneously. The physical act of drawing it progressively was described as "dynamically rendering the checkmark in realtime."

### W State Machine

```
STATE 0: ○  or  ·        Empty / Not started
STATE 1: /               Left stroke started (25%)
STATE 2: ✓               Left checkmark (50% — "half a W")
STATE 3: ✓\              Right descender drawn (75%)
STATE 4: W               Complete W (100%)

X                        Missed entirely
→                        Delegated to next list
```

In the electronic system, the W renders as an animated SVG path that progresses through these states. Tap cycles forward. Long-press accesses the full state picker. Percentage completion maps directly to visual state for tasks with multipliers or fractional points.

---

## The Point Economy

### Task Weighting

```
Relevance × Complexity → Point Assignment

Complex + Relevant:     Normal base points
Complex + Non-relevant: High points (penalized for being on the list)
Simple + Relevant:      Low base points
Simple + Non-relevant:  Highest penalty (why is this here?)
```

**Project multiplier:** Projects on the monthly list are weighted 1.5× relative to plain tasks by default. Configurable per task.

**Pomodoro integration:** 1 logged Pomodoro = 1 W-point (default 23 min, configurable per task via `pomodoro_value`). No timer engine — the user logs completed pomodoros and points are calculated. This is also useful for resolving backdated completions.

### The Two-List Ceiling Constraint

This is the core enforcement mechanism. It ensures you cannot overcommit across two consecutive days.

```
Available points for section S on new list =
    Monthly ceiling(S) - current_audited_list_points(S)

Where current_audited_list_points(S) = sum of all points
assigned to section S on the currently audited (previous) list
```

**Example:** Monthly ceiling for SCHOOL = 14 pts. Audited list has SCHOOL tasks worth 7 pts. Maximum SCHOOL points assignable to new list = 14 - 7 = 7 pts.

This constraint is shown in real-time on the list creation interface. Ceiling bars update as tasks are added.

---

## The Audit Cycle

The audit cycle is the heartbeat of the system. Every list goes through this cycle.

```
LIST CREATED (Day 0, time T)
    │
    ├── Tasks assigned (ceiling constraints applied)
    ├── Pomodoro sessions tracked
    ├── Task states updated as work happens
    │
24hrs LATER (Day 1, time T) → AUDIT TRIGGERED
    │
    ├── W tasks → logged to monthly frequency record
    ├── Partial W tasks → marked DEFERRED (on-the-line)
    │   → still valid for 24hrs more
    ├── Zero-completion tasks → X (missed) immediately
    │   → forbidden from next list unless necessary
    ├── Delegated tasks → → (already moved to next list)
    │
LIST STATUS → AUDITED
    │
NEW LIST CREATED
    │
    ├── Consult: weekly list (priority grounding)
    ├── Consult: monthly list (frequency — prioritize low-frequency tasks)
    ├── Consult: weekly schedule (standalone panel — recurring tasks for today)
    ├── Consult: audited list
    │   ├── Zero-completion tasks: FORBIDDEN (unless override + reason)
    │   └── Deferred tasks: informational only — their points already occupy ceiling
    │
TWO LISTS NOW ACTIVE: [AUDITED] + [CURRENT]
    │
    ├── Audited list urgency: 24hrs until closure
    ├── Current list urgency: 48hrs / 2 audits
    │
    ├── Completing deferred tasks (on audited list):
    │   ├── Same day as closure: strikethrough underline, pencil color
    │   └── Next day: strikethrough underline, blue color
    │
48hrs LATER (Day 2, time T) → SECOND AUDIT
    │
    ├── AUDITED LIST resolved:
    │   ├── Completed deferred → logged, list CLOSED
    │   └── Uncompleted deferred → X (miss), list CLOSED
    ├── CURRENT LIST → becomes AUDITED LIST
    │
NEW LIST CREATED → cycle repeats
```

---

## Failure & Backlog Philosophy

This system is designed for imperfect adherence. The following are **expected operating states**, not error states:

- **Missed audit windows:** If 24hrs pass without an audit, the system prompts but does not auto-audit. Tasks remain in their current state until the user acts.
- **RSR backlogs:** If spaced repetition reviews pile up, the system surfaces them as suggestions without penalty. No guilt mechanics.
- **Backdated completions:** The user can log completions after the fact (e.g., "I did this yesterday"). Backdated entries are flagged in analytics but treated as valid completions.
- **Manual corrections:** States can be manually overridden (e.g., marking a missed task as complete with a reason). All overrides are logged.
- **Ceiling overrides:** When a ceiling is exceeded with an explicit reason, the system logs it for analytics (frequent overrides = poorly calibrated ceilings) but does not block the user.

The system must handle backlogs and failure gracefully. It should not just be built for the happy path alone.

---

## Resiliency & Stability Philosophy

Following the "Sprint C" hardening, the system adheres to a strict high-resiliency boot protocol:

1.  **Deterministic Initialization Gate**: The application remains in a "BOOTING" state until the local SQLite database is confirmed reachable and healthy. This prevents race conditions and "empty list" ghosting.
2.  **Asynchronous-First Data Fetching**: To accommodate the non-blocking nature of WASM-based SQLite on Web, all heavy read operations (e.g., Library, History) must utilize asynchronous patterns.
3.  **Graceful Error Recovery**: A global error boundary captures UI-level crashes, providing diagnostic feedback and safe-restart paths without losing local data integrity.

---

## Task Taxonomy

### Task Types

```
TASK        Basic unit. Lives on all list levels.
PROJECT     Higher-weight task (1.5x default). Represents multi-session work.
BUILD       Project subcategory on monthly/3-month. App or artifact output.
SUBTASK     Child of a task. Written above parent, enclosed in [].
MISC        Lightweight urgent task. Appears only on weekly and daily.
```

### Task Attributes (full set)

```
id              UUID
title           String
section         Enum (SCHOOL | SPIRITUAL | DEPTS | ...)
type            Enum (TASK | PROJECT | BUILD | SUBTASK | MISC)
base_points     Float
multiplier      Float (default 1.0, green color)
is_project      Boolean (true = 1.5× weighting on monthly)
tags            String[] (custom tags for analytics)
subtasks        TaskRef[] (ordered list of child tasks)
source_list     Ref to 3-month list (persistent task origin)
notes           String
rsr_enabled     Boolean (Reinforced Spaced Repetition toggle)
pink_slip_ref   Ref to course subsection (if school task)
schedule_day    DayOfWeek[] (for recurring tasks on calendar)
created_at      DateTime
```

### Task Instance Attributes (per list assignment)

```
list_id         Ref to list
task_id         Ref to task definition
assigned_points Float (base_points × multiplier)
state           Enum (see State Machine below)
deferred_from   DateTime (if deferred)
completed_at    DateTime (null if not complete)
deferred_completed_at DateTime (null if not deferred)
completion_color Enum (SAME_DAY | NEXT_DAY | LATER)
pomodoro_count  Int (sessions completed on this instance)
override_reason String (if zero-completion task allowed on next list)
delegated_to    Ref to next list instance (if delegated)
```

### Task State Machine (complete)

```
PENDING
  │
  ├── mark_complete()      → COMPLETE (W)
  ├── mark_partial()       → PARTIAL (half-W, percentage tracked)
  ├── mark_missed()        → MISSED (X)
  ├── delegate()           → DELEGATED (→)
  │
PARTIAL
  │
  ├── mark_complete()      → COMPLETE
  ├── mark_missed()        → MISSED
  │
[AUDIT TRIGGERED]
  │
  ├── COMPLETE             → logged to monthly, archived
  ├── MISSED              → logged as miss, archived
  ├── DELEGATED           → reference passed to next list
  ├── PENDING / PARTIAL   → DEFERRED (on-the-line)
  │
DEFERRED
  │
  ├── complete_same_day()  → DEFERRED_COMPLETE_SAME_DAY
  ├── complete_next_day()  → DEFERRED_COMPLETE_NEXT_DAY
  │
[SECOND AUDIT]
  │
  ├── DEFERRED_COMPLETE_*  → logged, list closed
  ├── DEFERRED (still)    → MISSED, list closed
```

---

## List Validity Rules

| List Type | Validity Window | Max Active | Audit Trigger |
|---|---|---|---|
| Daily | 24 hrs | 2 (current + audited) | Time-based OR manual |
| Weekly | 7 days | 1 | End of week |
| Monthly | 30 days | 1 | End of month |
| 3-Month | 90 days | 1 | End of quarter |
| Year Goals | 365 days | 1 | Annual |

**Task validity:** Tasks on a daily list remain valid for 48hrs (spans two audit cycles, becoming on-the-line after the first).

---

## The Color System (non-negotiable)

The color coding must be preserved in the electronic version. These are not aesthetic choices — they carry semantic meaning at a glance.

| Color | Physical | Electronic Equivalent | Meaning |
|---|---|---|---|
| Black | Pen | `--color-text-primary` | Task text, subtasks, delegation arrows |
| Red | Red pen | `#E24B4A` / semantic danger-warm | Points, section totals, ceiling numbers |
| Green | Green pen | `#639922` / semantic success | Multipliers |
| Pencil grey | Pencil | `#B4B2A9` | Deferred state (on-the-line) |
| Deep grey shaded | Heavy pencil | `#888780` | Deferred completed same day |
| Blue | Blue ink | `#378ADD` | Deferred completed after list closed |
| Orange/Amber | — | `#EF9F27` | Warning: approaching ceiling |

---

## Documents in This Design Set

1. **This document** — System overview, philosophy, hierarchy, core rules
2. `wlist_data_models.md` — Complete database schema
3. `wlist_ui_spec.md` — Every screen, interaction, layout, component library
4. `wlist_business_logic.md` — Complete rules engine, validation, constraint enforcement
5. `wlist_analytics.md` — Analytics system specification
6. `wlist_integrations.md` — Pomodoro, Pink Slip, RSR, Calendar, Cloud sync
7. `wlist_build_plan.md` — Technology stack, implementation sequence, milestones
