# W-List: Data Models

---

## Database: SQLite (local-first, WAL mode)

All data lives locally. Cloud sync (OneDrive) is a replication layer, not the primary store. The schema is designed for offline-first operation — every operation succeeds locally, syncs opportunistically.

---

## Core Tables

### `sections`
The eight life sections. Seeded at install, user-configurable.

```sql
CREATE TABLE sections (
    id          TEXT PRIMARY KEY,      -- 'school', 'spiritual', 'depts', etc.
    name        TEXT NOT NULL,         -- Display name
    display_order INTEGER NOT NULL,    -- Render order on lists
    color_hex   TEXT,                  -- Section accent color (future)
    icon        TEXT,                  -- Emoji or icon identifier
    is_active   BOOLEAN DEFAULT 1,
    created_at  TEXT NOT NULL
);

-- Seed data
INSERT INTO sections VALUES
('school',    'School',           1, NULL, '📚', 1, NOW),
('spiritual', 'Spiritual',        2, NULL, '✝️',  1, NOW),
('depts',     'D.E.P.T.S',       3, NULL, '💻', 1, NOW),
('skill',     'Skill & Intell',   4, NULL, '🧠', 1, NOW),
('business',  'Business',         5, NULL, '💼', 1, NOW),
('reflect',   'Reflect',          6, NULL, '🪞', 1, NOW),
('restore',   'Restore',          7, NULL, '🔁', 1, NOW),
('recreation','Recreation',       8, NULL, '🎵', 1, NOW);
```

---

### `task_definitions`
The persistent task library. Lives in the 3-month list conceptually. These are the source of truth for tasks — they persist across all list instances.

```sql
CREATE TABLE task_definitions (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    section_id      TEXT NOT NULL REFERENCES sections(id),
    type            TEXT NOT NULL CHECK(type IN ('task','project','build','misc')),
    base_points     REAL NOT NULL DEFAULT 1.0,
    multiplier      REAL NOT NULL DEFAULT 1.0,
    is_project      BOOLEAN DEFAULT 0,
    pomodoro_value  REAL DEFAULT 1.0,  -- W-points per logged pomodoro (default 1:1)
    rsr_enabled     BOOLEAN DEFAULT 0,
    schedule_days   TEXT,              -- JSON array: ["mon","wed","fri"]
    pink_slip_ref   TEXT REFERENCES pink_slip_sections(id),
    tags            TEXT,              -- JSON array of strings
    notes           TEXT,
    parent_task_id  TEXT REFERENCES task_definitions(id),
    source_list_id  TEXT REFERENCES lists(id),  -- which 3-month list introduced it
    is_archived     BOOLEAN DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE INDEX idx_task_def_section ON task_definitions(section_id);
CREATE INDEX idx_task_def_type ON task_definitions(type);
CREATE INDEX idx_task_def_archived ON task_definitions(is_archived);
```

---

### `lists`
Every list instance at every level.

```sql
CREATE TABLE lists (
    id              TEXT PRIMARY KEY,
    type            TEXT NOT NULL CHECK(type IN ('daily','weekly','monthly','quarterly','yearly')),
    title           TEXT,              -- e.g. "18/01/2025 WEEKLY W LIST"
    status          TEXT NOT NULL CHECK(status IN ('active','audited','closed')),
    valid_from      TEXT NOT NULL,     -- ISO datetime
    valid_until     TEXT NOT NULL,     -- ISO datetime (valid_from + lifespan)
    audit_time      TEXT,              -- When audit was triggered
    closed_at       TEXT,
    parent_list_id  TEXT REFERENCES lists(id),  -- monthly → weekly, etc.
    total_points    REAL DEFAULT 0,    -- Calculated, denormalized for perf
    notes           TEXT,
    created_at      TEXT NOT NULL
);

CREATE INDEX idx_lists_type_status ON lists(type, status);
CREATE INDEX idx_lists_valid_from ON lists(valid_from);
```

---

### `section_ceilings`
Ceiling points per section, configured on the monthly list. Inherited by weekly and daily.

```sql
CREATE TABLE section_ceilings (
    id              TEXT PRIMARY KEY,
    list_id         TEXT NOT NULL REFERENCES lists(id),
    section_id      TEXT NOT NULL REFERENCES sections(id),
    ceiling_points  REAL NOT NULL,
    UNIQUE(list_id, section_id)
);

-- Default ceilings (from physical lists)
-- school: 14, spiritual: 10, depts: 3, others: TBD
```

---

### `task_assignments`
A task placed on a specific list. This is where all execution state lives.

```sql
CREATE TABLE task_assignments (
    id                      TEXT PRIMARY KEY,
    list_id                 TEXT NOT NULL REFERENCES lists(id),
    task_def_id             TEXT NOT NULL REFERENCES task_definitions(id),

    -- Point configuration (can differ from definition defaults)
    assigned_points         REAL NOT NULL,
    multiplier_override     REAL,       -- NULL = use task_def multiplier

    -- Ordering and display
    display_order           INTEGER NOT NULL,
    subtask_display_order   INTEGER,    -- if this is a subtask on this list

    -- Priority (auto-assigned or manual)
    priority                TEXT CHECK(priority IN ('urgent','mild','other')) DEFAULT 'other',

    -- State
    state                   TEXT NOT NULL DEFAULT 'pending'
                            CHECK(state IN (
                                'pending',
                                'partial',
                                'complete',
                                'missed',
                                'delegated',
                                'deferred',
                                'deferred_complete_same_day',
                                'deferred_complete_next_day',
                                'deferred_complete_later',
                                'deferred_missed'
                            )),

    -- Completion tracking
    completion_percentage   REAL DEFAULT 0,   -- 0.0 to 1.0
    completed_at            TEXT,
    deferred_at             TEXT,
    deferred_completed_at   TEXT,

    -- Delegation
    delegated_to_list_id    TEXT REFERENCES lists(id),
    delegated_assignment_id TEXT REFERENCES task_assignments(id),

    -- Deferred state color
    deferred_color          TEXT CHECK(deferred_color IN ('same_day','next_day','later')),

    -- Pomodoro (simple value mapping, no timer engine)
    pomodoros_logged        INTEGER DEFAULT 0,  -- count of pomodoros completed
    pomodoro_points_earned  REAL DEFAULT 0,     -- pomodoros_logged × task_def.pomodoro_value

    -- Override tracking (zero-completion task on next list)
    is_override             BOOLEAN DEFAULT 0,
    override_reason         TEXT,

    -- Backdating
    is_backdated            BOOLEAN DEFAULT 0,
    backdated_source        TEXT,               -- 'manual' | 'csv_import' | etc.

    -- Source (was this deferred from previous list?)
    deferred_from_assignment_id TEXT REFERENCES task_assignments(id),

    created_at              TEXT NOT NULL,
    updated_at              TEXT NOT NULL
);

CREATE INDEX idx_assignments_list ON task_assignments(list_id);
CREATE INDEX idx_assignments_state ON task_assignments(state);
CREATE INDEX idx_assignments_task_def ON task_assignments(task_def_id);
```

---

### `subtask_assignments`
Subtasks defined inline on a list (not necessarily from task_definitions).

```sql
CREATE TABLE subtask_assignments (
    id                  TEXT PRIMARY KEY,
    parent_assignment_id TEXT NOT NULL REFERENCES task_assignments(id),
    title               TEXT NOT NULL,
    points              REAL NOT NULL,
    display_order       INTEGER NOT NULL,
    state               TEXT NOT NULL DEFAULT 'pending'
                        CHECK(state IN ('pending','partial','complete','deferred','missed')),
    completion_percentage REAL DEFAULT 0,  -- 0.0 to 1.0
    completed_at        TEXT,
    created_at          TEXT NOT NULL
);
```

---

### `monthly_frequency_log`
Records when a task was last completed. Used to prioritize low-frequency tasks.

```sql
CREATE TABLE monthly_frequency_log (
    id              TEXT PRIMARY KEY,
    task_def_id     TEXT NOT NULL REFERENCES task_definitions(id),
    list_id         TEXT NOT NULL REFERENCES lists(id),
    assignment_id   TEXT NOT NULL REFERENCES task_assignments(id),
    completed_at    TEXT NOT NULL,
    points_earned   REAL NOT NULL
);

CREATE INDEX idx_freq_log_task ON monthly_frequency_log(task_def_id);
CREATE INDEX idx_freq_log_completed ON monthly_frequency_log(completed_at);
```

---

### `weekly_audit_summaries`
Stored results of weekly audit calculations.

```sql
CREATE TABLE weekly_audit_summaries (
    id                      TEXT PRIMARY KEY,
    week_list_id            TEXT NOT NULL REFERENCES lists(id),
    week_start              TEXT NOT NULL,
    week_end                TEXT NOT NULL,

    -- Totals
    total_points_possible   REAL NOT NULL,
    total_points_earned     REAL NOT NULL,
    completion_rate         REAL NOT NULL,  -- 0.0 to 1.0

    -- Per-section breakdown (JSON)
    section_stats           TEXT NOT NULL,  -- JSON: {section_id: {possible, earned, rate}}

    -- Counts
    total_tasks             INTEGER NOT NULL,
    completed_tasks         INTEGER NOT NULL,
    missed_tasks            INTEGER NOT NULL,
    deferred_tasks          INTEGER NOT NULL,
    delegated_tasks         INTEGER NOT NULL,

    -- Comparison to previous week
    prev_week_rate          REAL,
    rate_delta              REAL,

    -- W-list points (gamification)
    wlist_points_total      REAL NOT NULL,

    created_at              TEXT NOT NULL
);
```

---

<!-- COMMENTED OUT: Pomodoro is now a simple value mapping, not a session engine.
     Points are calculated as: pomodoros_logged × task_def.pomodoro_value
     See task_definitions.pomodoro_value and task_assignments.pomodoros_logged

### `pomodoro_sessions`
Individual Pomodoro work sessions.

```sql
CREATE TABLE pomodoro_sessions (
    id                  TEXT PRIMARY KEY,
    assignment_id       TEXT NOT NULL REFERENCES task_assignments(id),
    task_def_id         TEXT NOT NULL REFERENCES task_definitions(id),
    session_type        TEXT NOT NULL CHECK(session_type IN ('academic','technical','general')),
    duration_minutes    INTEGER NOT NULL,
    target_minutes      INTEGER NOT NULL,
    is_complete         BOOLEAN NOT NULL,
    points_awarded      REAL NOT NULL DEFAULT 0,
    started_at          TEXT NOT NULL,
    ended_at            TEXT,
    notes               TEXT
);

CREATE INDEX idx_pomo_assignment ON pomodoro_sessions(assignment_id);
CREATE INDEX idx_pomo_started ON pomodoro_sessions(started_at);
```
END COMMENTED OUT -->

---

### `pink_slip_courses`
Academic courses tracked in the Pink Slip system.

```sql
CREATE TABLE pink_slip_courses (
    id              TEXT PRIMARY KEY,
    course_code     TEXT NOT NULL,       -- e.g. "PHA 401"
    course_name     TEXT,
    lecturer        TEXT,
    semester        TEXT,                -- e.g. "2025/2026 S1"
    is_active       BOOLEAN DEFAULT 1,
    created_at      TEXT NOT NULL
);
```

### `pink_slip_sections`
Subsections within a course.

```sql
CREATE TABLE pink_slip_sections (
    id              TEXT PRIMARY KEY,
    course_id       TEXT NOT NULL REFERENCES pink_slip_courses(id),
    title           TEXT NOT NULL,
    section_order   INTEGER NOT NULL,
    parent_id       TEXT REFERENCES pink_slip_sections(id),  -- for subsections
    created_at      TEXT NOT NULL
);
```

### `pink_slip_reads`
Read history per section (supports RSR scheduling).

```sql
CREATE TABLE pink_slip_reads (
    id              TEXT PRIMARY KEY,
    section_id      TEXT NOT NULL REFERENCES pink_slip_sections(id),
    read_date       TEXT NOT NULL,
    read_type       TEXT CHECK(read_type IN ('first_read','revision','rsr')),
    assignment_id   TEXT REFERENCES task_assignments(id),
    notes           TEXT
);

CREATE INDEX idx_ps_reads_section ON pink_slip_reads(section_id);
CREATE INDEX idx_ps_reads_date ON pink_slip_reads(read_date);
```

---

### `rsr_schedule`
Reinforced Spaced Repetition schedule — when tasks should auto-delegate back to the W-List.

```sql
CREATE TABLE rsr_schedule (
    id                  TEXT PRIMARY KEY,
    task_def_id         TEXT NOT NULL REFERENCES task_definitions(id),
    pink_slip_section_id TEXT REFERENCES pink_slip_sections(id),
    interval_days       INTEGER NOT NULL,   -- Current interval
    next_review_date    TEXT NOT NULL,
    last_reviewed_at    TEXT,
    ease_factor         REAL DEFAULT 2.5,   -- SM-2 algorithm
    repetition_count    INTEGER DEFAULT 0,
    is_active           BOOLEAN DEFAULT 1,
    created_at          TEXT NOT NULL
);

CREATE INDEX idx_rsr_next ON rsr_schedule(next_review_date, is_active);
```

---

### `calendar_events`
Fixed recurring events that auto-populate daily lists.

```sql
CREATE TABLE calendar_events (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    section_id      TEXT REFERENCES sections(id),
    task_def_id     TEXT REFERENCES task_definitions(id),
    recurrence      TEXT NOT NULL,   -- JSON: {type: 'weekly', days: ['mon','wed']}
    time_of_day     TEXT,            -- "14:00" for fixed time
    auto_add_to_daily BOOLEAN DEFAULT 1,
    is_active       BOOLEAN DEFAULT 1,
    created_at      TEXT NOT NULL
);
```

---

### `sync_log`
Cloud sync tracking.

```sql
CREATE TABLE sync_log (
    id              TEXT PRIMARY KEY,
    table_name      TEXT NOT NULL,
    record_id       TEXT NOT NULL,
    operation       TEXT NOT NULL CHECK(operation IN ('insert','update','delete')),
    synced_at       TEXT,
    sync_status     TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending','synced','failed')),
    error_message   TEXT,
    created_at      TEXT NOT NULL
);

CREATE INDEX idx_sync_status ON sync_log(sync_status);
```

---

### `year_goals`
Qualitative year-level aspirations, one per section. Not measurably tied to tasks.

```sql
CREATE TABLE year_goals (
    id              TEXT PRIMARY KEY,
    year            INTEGER NOT NULL,
    section_id      TEXT NOT NULL REFERENCES sections(id),
    title           TEXT NOT NULL,
    is_achieved     BOOLEAN DEFAULT 0,
    achieved_at     TEXT,
    display_order   INTEGER NOT NULL,
    notes           TEXT,
    created_at      TEXT NOT NULL
);
```

---

### `miss_log`
Records every miss event for analytics (most-missed tasks, miss patterns).

```sql
CREATE TABLE miss_log (
    id              TEXT PRIMARY KEY,
    task_def_id     TEXT NOT NULL REFERENCES task_definitions(id),
    list_id         TEXT NOT NULL REFERENCES lists(id),
    assignment_id   TEXT NOT NULL REFERENCES task_assignments(id),
    missed_at       TEXT NOT NULL,
    miss_type       TEXT CHECK(miss_type IN ('zero_completion','deferred_timeout')),
    created_at      TEXT NOT NULL
);

CREATE INDEX idx_miss_log_task ON miss_log(task_def_id);
CREATE INDEX idx_miss_log_date ON miss_log(missed_at);
```

---

### `event_log`
System-wide event tracking for overrides, audits, and other notable actions.

```sql
CREATE TABLE event_log (
    id              TEXT PRIMARY KEY,
    event_type      TEXT NOT NULL,   -- 'ceiling_override','audit_trigger','rsr_schedule', etc.
    entity_type     TEXT,            -- 'task_assignment','list','rsr_schedule', etc.
    entity_id       TEXT,
    payload         TEXT,            -- JSON details
    created_at      TEXT NOT NULL
);

CREATE INDEX idx_event_log_type ON event_log(event_type);
CREATE INDEX idx_event_log_date ON event_log(created_at);
```

---

## Derived / View Queries

### Available ceiling for a section on a new list

```sql
-- Given a monthly list's ceiling and an audited daily list:
WITH audited_points AS (
    SELECT
        td.section_id,
        SUM(ta.assigned_points) as trailing_points
    FROM task_assignments ta
    JOIN task_definitions td ON ta.task_def_id = td.id
    WHERE ta.list_id = :audited_list_id
      AND ta.state NOT IN ('complete', 'missed', 'delegated')
    GROUP BY td.section_id
)
SELECT
    sc.section_id,
    sc.ceiling_points,
    COALESCE(ap.trailing_points, 0) as trailing_points,
    sc.ceiling_points - COALESCE(ap.trailing_points, 0) as available_ceiling
FROM section_ceilings sc
LEFT JOIN audited_points ap ON sc.section_id = ap.section_id
WHERE sc.list_id = :monthly_list_id;
```

### Task frequency (for monthly list prioritization)

```sql
SELECT
    td.id,
    td.title,
    td.section_id,
    COUNT(mfl.id) as completion_count,
    MAX(mfl.completed_at) as last_completed,
    JULIANDAY('now') - JULIANDAY(MAX(mfl.completed_at)) as days_since_last
FROM task_definitions td
LEFT JOIN monthly_frequency_log mfl ON td.id = mfl.task_def_id
WHERE td.is_archived = 0
GROUP BY td.id
ORDER BY days_since_last DESC NULLS FIRST;
```

### Section completion rate (weekly)

```sql
SELECT
    s.name as section,
    COUNT(ta.id) as total_tasks,
    COUNT(CASE WHEN ta.state IN ('complete','deferred_complete_same_day',
               'deferred_complete_next_day','deferred_complete_later') THEN 1 END) as completed,
    COUNT(CASE WHEN ta.state IN ('missed','deferred_missed') THEN 1 END) as missed,
    ROUND(
        COUNT(CASE WHEN ta.state LIKE 'complete%' OR ta.state LIKE 'deferred_complete%' THEN 1 END) * 100.0
        / NULLIF(COUNT(ta.id), 0), 1
    ) as completion_rate_pct,
    SUM(ta.assigned_points) as points_possible,
    SUM(CASE WHEN ta.state LIKE 'complete%' OR ta.state LIKE 'deferred_complete%'
             THEN ta.assigned_points ELSE 0 END) as points_earned
FROM sections s
JOIN task_definitions td ON s.id = td.section_id
JOIN task_assignments ta ON td.id = ta.task_def_id
JOIN lists l ON ta.list_id = l.id
WHERE l.type = 'daily'
  AND l.valid_from >= :week_start
  AND l.valid_from < :week_end
GROUP BY s.id, s.name
ORDER BY s.display_order;
```

---

## Data Validation Rules

These are enforced at the application layer, not just the DB.

```
RULE 1: Two-list ceiling constraint
  sum(section S points on list A) + sum(section S points on list B) ≤ ceiling(S)
  where A = audited, B = new (being built)

RULE 2: Zero-completion task restriction
  task_assignment.state = 'missed' → task may NOT appear on next daily list
  UNLESS is_override = true AND override_reason IS NOT NULL

RULE 3: List count constraint
  COUNT(lists WHERE type='daily' AND status IN ('active','audited')) ≤ 2

RULE 4: Deferred task deadline
  task_assignment.state = 'deferred'
  → task_assignment.deferred_at + 24hrs → DEFERRED_MISSED if not resolved

RULE 5: Multiplier display
  multiplier != 1.0 → display in green, formatted as "×2" or "×1.5"

RULE 6: Project weighting
  task_def.is_project = true → effective weight on monthly = base_points × 1.5

RULE 7: Pomodoro point integration (simple value mapping)
  On pomodoro logged: assignment.pomodoros_logged += 1
  assignment.pomodoro_points_earned = pomodoros_logged × task_def.pomodoro_value
  assignment.completion_percentage = min(1.0, pomodoro_points_earned / assigned_points)
```

---

## Migration Strategy

Since the system is starting from zero (no existing electronic data), initial population is:

1. Seed sections table
2. User configures section ceilings (from physical monthly list reference)
3. User populates 3-month task library (task_definitions) — this is the first session
4. Generate current monthly, weekly, daily lists
5. Backdate completion records for January 2026 W-List data where available
6. Pink Slip courses entered manually from current semester schedule
