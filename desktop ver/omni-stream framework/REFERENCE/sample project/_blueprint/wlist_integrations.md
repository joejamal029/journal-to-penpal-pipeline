# W-List: External Integrations

> The W-List does not live in isolation. It is the execution layer
> of a full operating system. These integrations connect it to every
> other system you run.

---

## Integration Map

```
W-LIST ←────────────────────────────────────────────────────────┐
  │
  ├── Pomodoro Value Map   (point-value integration, no engine)  │
  ├── Pink Slip System    (school section task source)           │
  ├── RSR System          (auto-delegation of review tasks)      │
  ├── Calendar System     (recurring tasks, schedule grid)       │
  ├── Cloud Sync          (OneDrive, cross-device)               │
  ├── Export/Report       (day audit, weekly summary)            │
  └── Future:             Musicolet, Journal, 2nd Brain ─────────┘
```

---

## 1. Pomodoro Integration

### Philosophy

Pomodoro is a **point-value mapping**, NOT a timer/session engine. The user logs completed pomodoros externally (e.g., using a phone timer or dedicated Pomodoro app) and records the count in W-List. Points are calculated automatically.

```
Default mapping: 1 logged pomodoro = 1 W-point
Configurable per task via task_definitions.pomodoro_value

Example: PHA 402 (2pt task, pomodoro_value = 1.0)
  Log 2 pomodoros → 2.0 points earned → task complete
  Log 3 pomodoros → 3.0 points earned → task complete + surplus

Academic reference: 23 minutes per pomodoro (user’s convention)
Technical work: no fixed duration, log whole pomodoros when done
```

### Integration Points

```python
def log_pomodoro(assignment_id: str) -> float:
    """Log one pomodoro toward a task assignment."""
    a = db.get(TaskAssignment, assignment_id)
    task_def = db.get(TaskDefinition, a.task_def_id)

    a.pomodoros_logged += 1
    a.pomodoro_points_earned = a.pomodoros_logged * task_def.pomodoro_value
    a.completion_percentage = min(1.0, a.pomodoro_points_earned / a.assigned_points)
    db.save(a)

    return a.pomodoro_points_earned
```

<!-- COMMENTED OUT: Full Pomodoro timer engine removed.
     W-List does not implement session start/stop/pause, break timers,
     or session type management. The user uses external tools for timing.
     W-List only needs: how many pomodoros did you do?
     See task_definitions.pomodoro_value and task_assignments.pomodoros_logged.
END COMMENTED OUT -->

---

## 2. Pink Slip Integration

### What It Is

The Pink Slip system tracks academic content at the sub-section level. Every course is divided into artificial blocks. Every block is tracked by last-read date. Unread and stale sections are prioritized automatically.

### Connection to W-List

```
Pink Slip section (unread / stale)
         ↓ auto-generates
W-List task suggestion on SCHOOL section
         ↓ when completed
Pink Slip records read date + triggers RSR scheduling
```

### Implementation

```python
class PinkSlipIntegration:

    STALE_THRESHOLD_DAYS = 14  # sections read >14d ago are 'stale'
    URGENT_THRESHOLD_DAYS = 21  # sections read >21d ago are 'urgent'

    def sync_to_wlist_suggestions(
        self,
        course_ids: list[str]
    ) -> list[TaskSuggestion]:
        """
        Generates W-List task suggestions from Pink Slip gaps.
        Called during new list creation suggestion phase.
        """
        suggestions = []

        for course_id in course_ids:
            course = db.get(PinkSlipCourse, course_id)

            # Unread sections (never read) — highest priority
            unread = self.get_unread_sections(course_id)
            for section in unread:
                task_def = self._get_or_create_task_def(section, 'first_read')
                suggestions.append(TaskSuggestion(
                    task_def=task_def,
                    reason=f"{course.course_code}: First read",
                    priority=1,
                    badge='unread'
                ))

            # Stale sections (read but overdue)
            stale = self.get_stale_sections(course_id)
            for section in stale:
                urgency = 'urgent' if section.days_ago > self.URGENT_THRESHOLD_DAYS else 'mild'
                task_def = self._get_or_create_task_def(section, 'revision')
                suggestions.append(TaskSuggestion(
                    task_def=task_def,
                    reason=f"{course.course_code}: {section.days_ago:.0f}d ago",
                    priority=2 if urgency == 'urgent' else 4,
                    badge=urgency
                ))

        return suggestions

    def record_read(
        self,
        section_id: str,
        assignment_id: str,
        performance: str = 'good'  # 'perfect'|'good'|'hard'|'fail'
    ) -> None:
        """Called when a Pink Slip-linked task is marked complete."""
        task_def = get_task_def_for_assignment(assignment_id)

        # Determine read type from task tags
        read_type = 'revision' if 'revision' in task_def.tags else 'first_read'

        db.insert(PinkSlipRead(
            section_id=section_id,
            read_date=today(),
            read_type=read_type,
            assignment_id=assignment_id
        ))

        # Schedule RSR if enabled
        if task_def.rsr_enabled:
            RSRIntegration().schedule(section_id, performance)

    def _get_or_create_task_def(
        self,
        section: PinkSlipSection,
        read_type: str
    ) -> TaskDefinition:
        """Get existing task def or create a new one for this section."""
        course = section.course
        title = f"{course.course_code}: {section.title}"
        if read_type == 'revision':
            title += " (revision)"

        existing = db.find(TaskDefinition, title=title, pink_slip_ref=section.id)
        if existing:
            return existing

        new_def = TaskDefinition(
            title=title,
            section_id='school',
            type='task',
            base_points=1.5 if read_type == 'first_read' else 1.0,
            pink_slip_ref=section.id,
            tags=['pink-slip', read_type],
            rsr_enabled=(read_type == 'first_read')  # auto-enable RSR on first read
        )
        db.save(new_def)
        return new_def
```

### Pink Slip Gap Visualization

```
PHA 401 · Dr. Edem
══════════════════════════════════════════════
SECTION 1: Drug Receptor Interactions
  1.1 Receptor types         ✓ Read: 12 Jan  [8d]
  1.2 Agonists/antagonists   ✓ Read: 15 Jan  [5d]
  1.3 Dose-response curves   ✗ UNREAD        [—]  ← red

SECTION 2: Autonomic Pharmacology
  2.1 Sympathomimetics       ✓ Read: 08 Jan  [12d]
  2.2 Parasympathomimetics   ✓ Read: 02 Jan  [18d] ← amber (stale)
  2.3 Adrenergic blockers    ✗ UNREAD        [—]  ← red

GAP SUMMARY: 2 unread, 1 stale (>14d)
[Add 3 gap tasks to W-List]
```

---

## 3. Reinforced Spaced Repetition (RSR)

### Algorithm

The SM-2 algorithm, adapted for W-List task integration.

```python
class RSRIntegration:

    # SM-2 constants
    INITIAL_INTERVAL = 1        # days
    MIN_EASE = 1.3
    MAX_INTERVAL = 90           # days — cap review interval

    PERFORMANCE_QUALITY = {
        'perfect': 5,
        'good':    4,
        'hard':    2,
        'fail':    0
    }

    def schedule(
        self,
        section_id: str,
        performance: str = 'good'
    ) -> RSRSchedule:
        schedule = db.get_rsr_schedule(section_id)
        quality = self.PERFORMANCE_QUALITY[performance]

        if schedule is None:
            # First scheduling
            schedule = RSRSchedule(
                section_id=section_id,
                interval_days=self.INITIAL_INTERVAL,
                ease_factor=2.5,
                repetition_count=0
            )
        else:
            if quality >= 3:
                # Correct response — increase interval
                if schedule.repetition_count == 0:
                    interval = 1
                elif schedule.repetition_count == 1:
                    interval = 6
                else:
                    interval = round(schedule.interval_days * schedule.ease_factor)

                interval = min(interval, self.MAX_INTERVAL)

                # Update ease factor
                new_ease = schedule.ease_factor + (
                    0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
                )
                schedule.ease_factor = max(self.MIN_EASE, new_ease)
                schedule.interval_days = interval
                schedule.repetition_count += 1
            else:
                # Failed — reset to beginning
                schedule.repetition_count = 0
                schedule.interval_days = 1
                # Don't reset ease factor on fail (SM-2 convention)

        schedule.last_reviewed_at = now()
        schedule.next_review_date = today() + timedelta(days=schedule.interval_days)
        db.save(schedule)
        return schedule

    def get_due_today(self) -> list[RSRSchedule]:
        return db.query("""
            SELECT rsr.*, td.title, td.section_id, td.base_points
            FROM rsr_schedule rsr
            JOIN task_definitions td ON rsr.task_def_id = td.id
            WHERE rsr.next_review_date <= DATE('now')
              AND rsr.is_active = 1
            ORDER BY rsr.next_review_date ASC
        """)

    def auto_delegate_to_daily(
        self,
        daily_list_id: str,
        ceiling_checker: CeilingEnforcer
    ) -> list[TaskAssignment]:
        """
        RSR tasks due today are auto-added to the daily list
        when the user enables the toggle on new list creation.
        Respects ceiling constraints — won't add if ceiling is full.
        """
        due = self.get_due_today()
        added = []

        for schedule in due:
            task_def = db.get(TaskDefinition, schedule.task_def_id)
            check = ceiling_checker.validate(task_def.base_points, task_def.section_id, daily_list_id)

            if check.allowed:
                assignment = TaskAssignment(
                    list_id=daily_list_id,
                    task_def_id=task_def.id,
                    assigned_points=task_def.base_points,
                    state='pending',
                    tags=['rsr-auto']
                )
                db.save(assignment)
                added.append(assignment)
            else:
                # Ceiling full — queue for next available slot
                queue_rsr_task(schedule, reason="ceiling_full")

        return added
```

### RSR Interval Visualization

```
PHA 401 · S2.2 Parasympathomimetics
Reviewed: 4 times
Ease factor: 2.6

Review history:
  Jan 02 → good  → next in 1d
  Jan 03 → good  → next in 6d
  Jan 09 → good  → next in 16d
  Jan 25 → hard  → next in 10d  ← reset multiplier
  Feb 04 → (due)

Schedule: ▓▓░░░░░░░░░░░░░░░░░░  5d remaining
```

---

## 4. Calendar / Schedule Integration

### Weekly Schedule Grid (from Physical Monthly List)

The physical monthly list includes a weekly schedule table. This is replicated in the app.

```python
# Default schedule extracted from Jan 2026 monthly list:

DEFAULT_SCHEDULE = {
    'sunday': [
        ('spiritual', 'Bible Study', 1.0),
        ('spiritual', 'Prayer', 1.0),
        ('spiritual', 'Fellowship', 1.0),
        ('spiritual', 'Revelation Knowledge', 1.5),
    ],
    'monday': [
        ('spiritual', 'Study Group / Assignment', 1.5),
        ('spiritual', 'Prayer Meeting', 1.0),
        ('business', 'Fund / Invest', 1.0),
    ],
    'tuesday': [
        ('spiritual', 'Bible Study', 1.0),
        ('business', 'Business tasks', 1.0),
    ],
    'wednesday': [
        ('spiritual', 'Study', 1.0),
    ],
    'thursday': [
        ('spiritual', 'Study / Evang Prep', 1.5),
        ('spiritual', 'Mid-week service', 1.0),
        ('spiritual', 'Prayer', 1.0),
        ('business', 'Business tasks', 1.0),
    ],
    'friday': [
        ('spiritual', 'Bible Study', 1.0),
        ('spiritual', 'Prayer', 1.0),
        ('restore', 'Musicolet restore', 0.5),
    ],
    'saturday': [
        ('spiritual', 'Study / Evang Prep', 1.5),
        ('spiritual', 'Bible Study', 1.0),
        ('spiritual', 'Prayer / Fellowship', 1.0),
        ('spiritual', 'Revelation Knowledge', 1.5),
        ('business', 'Business tasks', 1.0),
    ]
}
```

### Auto-population Logic

```python
def get_scheduled_for_today() -> list[TaskDefinition]:
    """
    Returns tasks configured for today's day of week.
    These are inserted as auto-suggestions in new list creation.
    They are suggestions, not auto-adds — ceiling still applies.
    """
    today_name = today().strftime('%A').lower()  # 'monday', 'friday', etc.

    return db.query("""
        SELECT td.* FROM task_definitions td
        WHERE td.is_archived = 0
          AND JSON_EXTRACT(td.schedule_days, '$') IS NOT NULL
          AND EXISTS (
              SELECT 1 FROM JSON_EACH(td.schedule_days)
              WHERE value = ?
          )
    """, today_name)
```

---

## 5. Cloud Sync (OneDrive)

### Strategy

**Append-only event log.** Every device writes its changes as timestamped JSON bundles. Each device applies all bundles to reconstruct state. Conflicts resolved by timestamp (last-write-wins per record).

This approach tolerates intermittent connectivity and offline-first operation — no read-before-write required.

```python
class OneDriveSyncClient:

    SYNC_FOLDER = "W-List/sync"
    PROCESSED_LOG = "W-List/sync/.processed"

    def push(self) -> SyncResult:
        """Push all unsynced local changes to OneDrive."""
        pending = db.query("""
            SELECT * FROM sync_log
            WHERE sync_status = 'pending'
            ORDER BY created_at ASC
            LIMIT 500
        """)

        if not pending:
            return SyncResult(pushed=0)

        bundle = {
            'device_id':   get_device_id(),
            'device_name': get_device_name(),  # 'phone' | 'laptop'
            'bundle_time': now().isoformat(),
            'schema_version': SCHEMA_VERSION,
            'changes': [
                {
                    'table':      log.table_name,
                    'record_id':  log.record_id,
                    'operation':  log.operation,  # insert | update | delete
                    'data':       get_record_data(log.table_name, log.record_id),
                    'timestamp':  log.created_at
                }
                for log in pending
            ]
        }

        filename = f"{now().strftime('%Y%m%d_%H%M%S')}_{get_device_id()}.json"
        upload_to_onedrive(f"{self.SYNC_FOLDER}/{filename}", bundle)
        mark_synced(pending)

        return SyncResult(pushed=len(pending))

    def pull(self) -> SyncResult:
        """Download and apply remote bundles from other devices."""
        remote_files = list_onedrive_files(self.SYNC_FOLDER)
        processed_ids = get_processed_bundle_ids()
        unprocessed = [f for f in remote_files if f.name not in processed_ids
                       and get_device_id() not in f.name]  # skip own bundles

        applied = 0
        for file_meta in sorted(unprocessed, key=lambda f: f.timestamp):
            bundle = download_from_onedrive(file_meta.path)

            if bundle.get('schema_version') != SCHEMA_VERSION:
                log_warning(f"Schema mismatch in bundle {file_meta.name}")
                continue

            for change in bundle['changes']:
                self._apply_change(change)
                applied += 1

            mark_bundle_processed(file_meta.name)

        return SyncResult(pulled=applied)

    def _apply_change(self, change: dict) -> None:
        """Apply a single change with last-write-wins conflict resolution."""
        existing = db.get_record(change['table'], change['record_id'])

        if existing is None:
            # New record — insert
            db.insert_raw(change['table'], change['data'])
            return

        existing_ts = parse_timestamp(existing.get('updated_at') or existing.get('created_at'))
        incoming_ts = parse_timestamp(change['timestamp'])

        if incoming_ts > existing_ts:
            # Remote is newer — apply
            if change['operation'] == 'delete':
                db.soft_delete(change['table'], change['record_id'])
            else:
                db.upsert_raw(change['table'], change['data'])
        # else: local is newer, skip remote change

    def sync(self) -> SyncResult:
        """Full sync: push then pull."""
        push_result = self.push()
        pull_result = self.pull()
        return SyncResult(
            pushed=push_result.pushed,
            pulled=pull_result.pulled,
            synced_at=now()
        )
```

### Sync Triggers

```python
SYNC_TRIGGERS = [
    'on_list_audit',          # Always sync after an audit
    'on_list_close',          # Always sync after closing a list
    'on_app_foreground',      # Sync when app comes to foreground
    'on_wifi_connect',        # Sync when WiFi becomes available
    'scheduled_every_4h',     # Background periodic sync
    'manual_user_request',    # Pull-to-refresh or explicit sync button
]

# Electricity/network constraint adaptation:
# If network unavailable, all changes queue in sync_log
# First sync opportunity: full push of all pending changes
# Sync log is bounded: purge synced records older than 30 days
```

---

## 6. Day Audit Report Export

### Report Types

```
AUDIT REPORT: Generated when a list is audited (T+24hrs).
  Contains: current state of all tasks, deferred tasks highlighted,
  points earned vs possible, deferred task countdown.
  Purpose: mid-cycle accountability snapshot.

CLOSE REPORT: Generated when a list is fully closed (all deferred resolved).
  Contains: final state of all tasks, complete/miss/deferred-complete breakdown,
  comparison to previous list, section performance summary.
  Purpose: end-of-cycle archive and analytics source.
```

### Export Formats

```python
class ReportExporter:

    def to_markdown(self, list_id: str) -> str:
        report = generate_day_report(list_id)
        lines = [
            f"# W-List Day Report: {report.date.strftime('%a %d %b %Y')}",
            f"",
            f"**Total:** {report.total_earned:.1f} / {report.total_possible:.1f} pts "
            f"({report.completion_rate*100:.1f}%)",
            f"**W-Points YTD:** {report.ytd_points:.0f} / 6000",
            f"**Streak:** {report.streak} days",
            f""
        ]

        for section_id, data in report.sections.items():
            lines.append(f"## {section_id.upper()} ({data['earned']:.1f} / {data['possible']:.1f})")
            lines.append("| Task | State | Points |")
            lines.append("|------|-------|--------|")
            for task in data['tasks']:
                state_symbol = {
                    'complete': '✓ W',
                    'missed': '✗ X',
                    'deferred': '═ on-line',
                    'deferred_complete_same_day': '≠ same-day',
                    'deferred_complete_next_day': '≠ next-day (blue)',
                    'delegated': '→ delegated'
                }.get(task['state'], task['state'])
                lines.append(f"| {task['title']} | {state_symbol} | {task['points']:.1f} |")
            lines.append("")

        lines.append(f"*Generated by W-List*")
        return '\n'.join(lines)

    def to_json(self, list_id: str) -> str:
        return json.dumps(generate_day_report(list_id).__dict__, indent=2, default=str)

    def to_plain_text(self, list_id: str) -> str:
        """Compact plain text for WhatsApp or SMS accountability sharing."""
        report = generate_day_report(list_id)
        lines = [
            f"W-List {report.date.strftime('%d %b')} "
            f"— {report.completion_rate*100:.0f}% ({report.total_earned:.1f}pt)"
        ]
        for section_id, data in report.sections.items():
            rate = data['earned'] / data['possible'] if data['possible'] > 0 else 0
            lines.append(f"  {section_id[:3].upper()}: {rate*100:.0f}%")
        return '\n'.join(lines)
```

---

## 7. Future Integrations (Roadmap)

### 7.1 Musicolet Restore Integration

```
Musicolet Restore System runs every Friday (per schedule).
W-List task: "Musicolet Restore (0.5pt)" auto-added on Fridays.
On completion: Musicolet-facing export triggered (future).
The weekly playlist creation step feeds back completion data.
```

### 7.2 Journal Integration

```
Daily journaling task lives in REFLECT section.
On journal entry written: trigger W-List auto-complete for Journalistic task.
On W-List day close: export structured day report to journal as a Presence entry.
The loop: what happened (journal) ↔ what was planned (W-List).
```

### 7.3 2nd Brain Integration

```
W-List completion records → queryable by 2nd Brain system.
"What did I work on the week of Feb 12?" → W-List data answers.
Completed BUILD tasks → trigger artifact creation log in 2nd Brain.
W-List becomes the structured activity log inside the living 2nd Brain.
```

### 7.4 Spaced Repetition for Spiritual Notes

```
Same RSR algorithm (SM-2) applied to spiritual note sections.
Each tagged teaching → RSR-scheduled review.
Review task auto-appears in SPIRITUAL section of W-List.
Connects Believer 2nd Brain to W-List execution layer.

Key difference from Pink Slip RSR:
  - Pink Slip RSR = tied to course subsections (academic)
  - Spiritual RSR = tied to tagged teachings in Believer 2nd Brain
  - Same SM-2 engine, different source data and section routing
  - Review quality: self-assessed (1-5 scale, same as Pink Slip)
```
