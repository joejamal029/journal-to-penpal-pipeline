# W-List: Business Logic & Rules Engine

> The rules are the product. Every enforcement mechanism here maps directly
> to a design decision made over months of running the physical system.
> None of these constraints are arbitrary.

---

## 1. The Ceiling Enforcement System

The most critical rule. It ensures you never overcommit across two consecutive days. It cascades from Monthly → down to every Daily list assignment.

### Ceiling Hierarchy

```
MONTHLY LIST sets ceilings per section:
  SCHOOL    = 14 pts
  SPIRITUAL = 10 pts
  DEPTS     = 3 pts
  (others configured by user)

These ceilings represent: the maximum total points across any two
consecutive active daily lists for that section.

WEEKLY LIST inherits and displays ceilings (does not modify them).
DAILY LIST enforces ceilings at assignment time.
```

### Two-List Ceiling Calculation

```python
def get_available_ceiling(
    section_id: str,
    monthly_list_id: str,
    audited_list_id: str | None
) -> CeilingState:
    """
    Returns how many points are available for section_id
    on a new daily list, given the currently audited list.
    """
    monthly_ceiling = db.query("""
        SELECT ceiling_points FROM section_ceilings
        WHERE list_id = ? AND section_id = ?
    """, monthly_list_id, section_id).scalar()

    if audited_list_id is None:
        return CeilingState(
            ceiling=monthly_ceiling,
            used_by_audited=0,
            available=monthly_ceiling
        )

    # Only count "live" tasks — pending and deferred still occupy ceiling.
    # Completed, missed, and delegated tasks release their ceiling allocation.
    audited_live_points = db.query("""
        SELECT COALESCE(SUM(ta.assigned_points), 0)
        FROM task_assignments ta
        JOIN task_definitions td ON ta.task_def_id = td.id
        WHERE ta.list_id = ?
          AND td.section_id = ?
          AND ta.state IN ('pending', 'partial', 'deferred')
    """, audited_list_id, section_id).scalar()

    available = max(0.0, monthly_ceiling - audited_live_points)

    return CeilingState(
        ceiling=monthly_ceiling,
        used_by_audited=audited_live_points,
        available=available,
        is_blocked=(available == 0),
        is_warning=(available < monthly_ceiling * 0.25)  # < 25% remaining
    )
```

### Ceiling Enforcement on Task Add

```python
def validate_task_addition(
    task_points: float,
    section_id: str,
    current_list_id: str,
    monthly_list_id: str,
    audited_list_id: str | None
) -> ValidationResult:

    ceiling_state = get_available_ceiling(section_id, monthly_list_id, audited_list_id)
    current_section_points = sum_assigned_points(current_list_id, section_id)
    would_use = current_section_points + task_points

    if would_use > ceiling_state.available:
        return ValidationResult(
            allowed=False,
            error_type='ceiling_exceeded',
            message=(
                f"{section_id.upper()} ceiling would be exceeded. "
                f"Available: {ceiling_state.available:.1f}pt, "
                f"Requesting: {task_points:.1f}pt, "
                f"Already assigned: {current_section_points:.1f}pt."
            ),
            can_override=True,
            override_prompt="This task had zero completion or exceeds ceiling. Enter reason:"
        )

    if would_use > ceiling_state.available * 0.85:
        return ValidationResult(
            allowed=True,
            warning="Approaching section ceiling. Consider the balance."
        )

    return ValidationResult(allowed=True)
```

### Ceiling Override

```python
def add_task_with_override(
    assignment: TaskAssignment,
    override_reason: str
) -> None:
    """
    Allows bypassing ceiling. Requires meaningful written justification.
    Every override is logged for analytics review.
    If overrides are frequent for a section, ceiling is likely miscalibrated.
    """
    if not override_reason or len(override_reason.strip()) < 10:
        raise ValidationError(
            "Override requires a meaningful reason (10+ characters). "
            "This protects you from reflexive overriding."
        )

    assignment.is_override = True
    assignment.override_reason = override_reason.strip()

    log_event('ceiling_override', {
        'section_id': assignment.task_def.section_id,
        'task_title': assignment.task_def.title,
        'points': assignment.assigned_points,
        'reason': override_reason,
        'timestamp': now()
    })

    db.save(assignment)
```

---

## 2. The Audit Cycle Engine

The audit is what makes the system a system. Without it, the daily list is just a to-do list. The audit creates accountability, generates the on-the-line urgency, and feeds the monthly frequency record.

### Audit State Transitions (full)

```
Before Audit (list is 'active'):
  task.state = pending | partial | complete | missed | delegated

On Audit (list transitions to 'audited'):
  complete   → log to monthly frequency record, no further action needed
  missed     → log miss to frequency record, task CLOSED, forbidden from next list
  delegated  → already forwarded; log delegation event
  partial    → becomes DEFERRED (on-the-line), valid for 24 more hours
  pending    → 0% completion = MISSED immediately; log miss; forbidden from next list

After Audit (list is 'audited', deferred tasks are live):
  deferred task completed same day as audit  → DEFERRED_COMPLETE_SAME_DAY
  deferred task completed after audit day    → DEFERRED_COMPLETE_NEXT_DAY
  deferred task still open at second audit   → DEFERRED_MISSED; list CLOSED

List transitions to 'closed' when:
  - All deferred tasks are resolved (completed or missed), OR
  - Second 24hr window expires
```

### Audit Engine Implementation

```python
class AuditEngine:

    def trigger_audit(self, list_id: str, triggered_by: str = 'timer') -> AuditResult:
        """
        Primary audit function. Called at T+24hrs or manually.
        triggered_by: 'timer' | 'manual'
        """
        list_ = db.get_list(list_id)
        if list_.status != 'active':
            raise StateError(f"Cannot audit list with status '{list_.status}'")

        assignments = db.get_assignments(list_id)
        result = AuditResult(list_id=list_id, triggered_by=triggered_by)

        for a in assignments:
            if a.state == 'complete':
                self._record_completion(a)
                result.completed.append(a)

            elif a.state in ('pending',):
                # Zero completion — immediate miss, forbidden from next list
                a.state = 'missed'
                self._record_miss(a)
                result.missed.append(a)

            elif a.state == 'partial':
                # Some completion — gets grace period
                a.state = 'deferred'
                a.deferred_at = now()
                result.deferred.append(a)

            elif a.state == 'missed':
                # Already marked manually before audit
                self._record_miss(a)
                result.missed.append(a)

            elif a.state == 'delegated':
                # Nothing to do — already forwarded
                result.delegated.append(a)

        list_.status = 'audited'
        list_.audit_time = now()
        db.save_all(assignments + [list_])

        # Schedule auto-close at T+48hrs (T+24hrs from audit)
        schedule_auto_close(list_id, delay_hours=24)

        return result

    def close_list(self, list_id: str) -> CloseResult:
        """
        Called when audited list hits its second 24hr window.
        Resolves all remaining deferred tasks as missed.
        """
        list_ = db.get_list(list_id)
        if list_.status != 'audited':
            raise StateError("Can only close an audited list")

        deferred = db.get_deferred_assignments(list_id)
        result = CloseResult(list_id=list_id)

        for a in deferred:
            if a.state == 'deferred':
                # Ran out of time
                a.state = 'deferred_missed'
                self._record_miss(a)
                result.timed_out.append(a)
            # deferred_complete_* states are already resolved

        list_.status = 'closed'
        list_.closed_at = now()
        db.save_all(deferred + [list_])
        return result

    def resolve_deferred(self, assignment_id: str) -> None:
        """
        User marks an on-the-line task as complete.
        Color is assigned based on timing relative to the audit.
        """
        a = db.get_assignment(assignment_id)
        if a.state not in ('deferred',):
            raise StateError(f"Assignment is not in deferred state: {a.state}")

        parent_list = db.get_list(a.list_id)
        audit_date = parent_list.audit_time.date()
        today_ = today()

        if today_ == audit_date:
            a.state = 'deferred_complete_same_day'
            a.deferred_color = 'same_day'   # grey — completed day of audit
        elif parent_list.status == 'closed':
            # Completed after the list was formally closed (backdating edge case)
            a.state = 'deferred_complete_later'
            a.deferred_color = 'later'
        elif today_ > audit_date:
            a.state = 'deferred_complete_next_day'
            a.deferred_color = 'next_day'   # BLUE — completed after audit day
        else:
            # Shouldn't happen but handle gracefully
            a.state = 'deferred_complete_same_day'
            a.deferred_color = 'same_day'

        a.deferred_completed_at = now()
        self._record_completion(a)
        db.save(a)

        # Check if parent list can now be auto-closed
        remaining_deferred = db.count_deferred(a.list_id)
        if remaining_deferred == 0:
            self.close_list(a.list_id)

    def _record_completion(self, a: TaskAssignment) -> None:
        db.insert(MonthlyFrequencyLog(
            task_def_id=a.task_def_id,
            list_id=a.list_id,
            assignment_id=a.id,
            completed_at=a.completed_at or a.deferred_completed_at or now(),
            points_earned=a.assigned_points * a.completion_percentage
        ))

    def _record_miss(self, a: TaskAssignment) -> None:
        db.insert(MissLog(
            task_def_id=a.task_def_id,
            list_id=a.list_id,
            assignment_id=a.id,
            missed_at=now(),
            miss_type='zero_completion' if a.state == 'missed' else 'deferred_timeout'
        ))
```

---

## 3. List Construction Rules

### Active List Count Constraint

```python
def assert_list_count_valid(list_type: str = 'daily') -> None:
    """
    At most 2 active daily lists at any time (current + audited).
    Creating a third requires closing the oldest.
    """
    active_count = db.count("""
        SELECT COUNT(*) FROM lists
        WHERE type = ? AND status IN ('active', 'audited')
    """, list_type)

    if list_type == 'daily' and active_count >= 2:
        raise ListLimitError(
            "Two active daily lists already exist. "
            "Complete the audit on the current audited list before creating a new one."
        )
```

### New List Suggestion Logic

When creating a new daily list, the system generates ranked task suggestions:

```python
def build_suggestions(
    weekly_list_id: str,
    monthly_list_id: str,
    audited_list_id: str | None
) -> list[TaskSuggestion]:

    suggestions = []
    seen_task_ids = set()

    def add(task_def, reason: str, priority: int):
        if task_def.id not in seen_task_ids:
            restriction = check_restriction(task_def.id, audited_list_id)
            suggestions.append(TaskSuggestion(
                task_def=task_def,
                reason=reason,
                priority=priority,
                restriction=restriction
            ))
            seen_task_ids.add(task_def.id)

    # Priority 1: RSR tasks due today
    for rsr in get_rsr_due_today():
        add(rsr.task_def, "RSR due today", priority=1)

    # Priority 2: Recurring calendar tasks for today's day of week
    for sched in get_scheduled_for_today():
        add(sched.task_def, f"Scheduled: {today_name()}", priority=2)

    # Priority 3: Weekly URGENT tasks
    for task in get_weekly_urgent(weekly_list_id):
        add(task, "Weekly: Urgent", priority=3)

    # Priority 4: Low-frequency tasks from monthly
    # (sorted by days_since_last DESC — longest untouched tasks first)
    for task in get_frequency_sorted(monthly_list_id, limit=15):
        add(task, f"Last done: {task.days_since_last}d ago", priority=4)

    # Priority 5: Weekly MILD tasks
    for task in get_weekly_mild(weekly_list_id):
        add(task, "Weekly: Mild", priority=5)

    # NOTE: Deferred tasks on the audited list are NOT suggested.
    # They are still active on the audited list and their points
    # already occupy the ceiling. They appear in the reference panel
    # as informational only ("these are on-the-line").

    return sorted(suggestions, key=lambda s: s.priority)


def check_restriction(task_def_id: str, audited_list_id: str | None) -> Restriction | None:
    if audited_list_id is None:
        return None

    audited_a = db.find_assignment(task_def_id=task_def_id, list_id=audited_list_id)
    if not audited_a:
        return None

    if audited_a.state == 'missed':
        return Restriction(
            type='zero_completion',
            severity='hard',
            message="Zero completion on previous list. Override required with reason.",
            can_override=True
        )

    if audited_a.state == 'deferred':
        return Restriction(
            type='still_active',
            severity='blocking',
            message="This task is still on-the-line on the audited list. Resolve it first.",
            can_override=False
        )

    return None
```

### Weekly List Construction Rules

When building a weekly list from the monthly list:

```python
def build_weekly_list(monthly_list_id: str) -> WeeklyListDraft:
    """
    Weekly list pulls from monthly, auto-assigns priority,
    introduces the MISC section, and inherits ceiling display.
    """
    monthly_tasks = get_monthly_tasks(monthly_list_id)
    weekly_tasks = []

    for task in monthly_tasks:
        days_since = get_days_since_last_done(task.id)
        is_rsr = is_rsr_due_within_week(task.id)
        is_sched = has_scheduled_days(task.id)

        priority = auto_assign_priority(task, days_since, is_rsr, is_sched)
        weekly_tasks.append(WeeklyTask(
            task_def=task,
            priority=priority,
            days_since_last=days_since,
            frequency_dates=get_frequency_dates(task.id)  # e.g. [06, 08, 15, 22]
        ))

    # Sort: urgent first, then by days_since_last descending
    weekly_tasks.sort(key=lambda t: (
        SECTION_PRIORITY[t.priority],
        -(t.days_since_last or 999)
    ))

    return WeeklyListDraft(
        tasks=weekly_tasks,
        # Ceiling is inherited from monthly, displayed but NOT enforced
        # Enforcement only happens at daily assignment time
        ceilings=get_monthly_ceilings(monthly_list_id),
        misc_section_enabled=True  # MISC appears on weekly+daily only
    )

# Priority rules:
# RSR due → urgent
# Scheduled this week → urgent
# Never done → urgent
# >14 days since last → urgent
# >7 days since last → mild
# Everything else → other
```

### Monthly List Construction Rules

When building a monthly list from the 3-month list:

```python
def build_monthly_list(quarterly_list_id: str) -> MonthlyListDraft:
    """
    Monthly list consults the 3-month task library, configures
    section ceilings, sets up the schedule grid, and initializes
    the frequency log display.
    """
    all_tasks = get_quarterly_tasks(quarterly_list_id)

    return MonthlyListDraft(
        tasks=all_tasks,
        # User configures these during monthly list creation
        section_ceilings={},  # e.g. {'school': 14, 'spiritual': 10, ...}
        # Frequency log format: [date, date, ...] per task
        # Shows as: [06, 08, 15, 22] on the monthly view
        frequency_log_format='date_array',
        # Schedule grid: which tasks recur on which days
        schedule_grid=get_or_create_schedule_grid(),
        # MISC section does NOT appear on monthly
        misc_section_enabled=False
    )
```

---

## 4. Point Calculation System

### Base Calculation

```python
def calculate_effective_points(
    base_points: float,
    multiplier: float = 1.0,
    complexity: str = 'normal',  # 'high' | 'low'
    relevance: str = 'high',     # 'high' | 'low'
    is_project: bool = False,
    context: str = 'daily'       # 'daily' | 'monthly'
) -> float:

    # Step 1: Apply relevance/complexity matrix
    MATRIX = {
        ('high', 'high'): 1.0,   # Relevant and hard — normal
        ('high', 'low'):  1.5,   # Hard but low payoff — penalized
        ('low',  'high'): 0.75,  # Easy win — slight discount
        ('low',  'low'):  2.0,   # Easy and irrelevant — high penalty (why is this here?)
    }
    relevance_modifier = MATRIX.get((complexity, relevance), 1.0)
    adjusted = base_points * relevance_modifier

    # Step 2: Apply user-set multiplier (shown in green)
    multiplied = adjusted * multiplier

    # Step 3: Project weighting (monthly planning only)
    if is_project and context == 'monthly':
        multiplied *= 1.5

    return round(multiplied, 2)
```

### Pomodoro → Points Integration

<!-- COMMENTED OUT: Full Pomodoro engine replaced with simple value mapping.
     Pomodoro is NOT a timer/session engine in W-List. It is a point-value
     mapping: the user logs completed pomodoros, and points are calculated.

```python
def calculate_pomodoro_completion(
    assigned_points: float,
    pomodoro_sessions: int,
    session_type: str,
    actual_minutes: int = None
) -> PomoResult:
    SESSION_POINT_VALUE = {
        'academic': 1.0,
        'general':  1.0,
        'flow': None
    }
    if session_type == 'flow' and actual_minutes:
        earned = actual_minutes / 23.0
    else:
        earned = pomodoro_sessions * SESSION_POINT_VALUE[session_type]
    completion_pct = min(1.0, earned / assigned_points)
    return PomoResult(
        sessions=pomodoro_sessions,
        points_earned=earned,
        task_points=assigned_points,
        completion_percentage=completion_pct,
        is_task_complete=(completion_pct >= 1.0),
        surplus=max(0, earned - assigned_points)
    )
```
END COMMENTED OUT -->

```python
def calculate_pomodoro_points(
    pomodoros_logged: int,
    pomodoro_value: float = 1.0,  # from task_definitions.pomodoro_value
    assigned_points: float = 1.0
) -> PomoResult:
    """
    Simple value mapping: each logged pomodoro earns pomodoro_value W-points.
    Default: 1 pomodoro (23 min) = 1 W-point.
    pomodoro_value is configurable per task definition.
    Useful for time-based completion and backdating.
    """
    earned = pomodoros_logged * pomodoro_value
    completion_pct = min(1.0, earned / assigned_points) if assigned_points > 0 else 1.0

    return PomoResult(
        pomodoros_logged=pomodoros_logged,
        points_earned=earned,
        task_points=assigned_points,
        completion_percentage=completion_pct,
        is_task_complete=(completion_pct >= 1.0)
    )
```

---

## 5. Delegation Rules

```python
def delegate_task(
    assignment_id: str,
    target_list_id: str | None = None
) -> DelegationResult:
    """
    Forwards a task to the next daily list.
    Ceiling constraint STILL applies on the receiving list.
    """
    source = db.get_assignment(assignment_id)
    source_list = db.get_list(source.list_id)

    # Determine target list
    if target_list_id is None:
        # Default: queue for next list creation
        target_list_id = get_or_create_next_list_queue()

    # Validate ceiling on target list
    ceiling_check = validate_task_addition(
        task_points=source.assigned_points,
        section_id=source.task_def.section_id,
        current_list_id=target_list_id,
        ...
    )

    if not ceiling_check.allowed:
        return DelegationResult(
            success=False,
            error="Delegation would exceed ceiling on target list. "
                  "Reduce points or override with reason."
        )

    # Create new assignment on target list
    new_assignment = TaskAssignment(
        list_id=target_list_id,
        task_def_id=source.task_def_id,
        assigned_points=source.assigned_points,
        deferred_from_assignment_id=source.id,
        state='pending'
    )
    db.save(new_assignment)

    # Mark source as delegated
    source.state = 'delegated'
    source.delegated_to_list_id = target_list_id
    source.delegated_assignment_id = new_assignment.id
    db.save(source)

    return DelegationResult(success=True, new_assignment=new_assignment)
```

---

## 6. Multiplier Rules

Multipliers allow a task to count more than its base points suggest. Displayed in green as "×N".

```python
# Valid multiplier values
ALLOWED_MULTIPLIERS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]

# Use cases from physical lists:
# "PCA 402 2pt ×2" = task done twice (e.g., two different lecturers' sections)
# "x3" = three repetitions expected
# Multiplied task: each "unit" is a sub-completion
# On W symbol: each unit fills 1 stroke of the W
# Display: "2/3" shown as superscript during partial completion
```

---

## 7. Section Priority Logic

```python
# Priority within a section's task list (for display ordering):
SECTION_PRIORITY = {
    'urgent': 1,
    'mild':   2,
    'other':  3
}

# When building a weekly list from monthly:
# Tasks not touched for longest time → urgent priority
# Tasks with scheduled days today → urgent priority
# RSR-due tasks → urgent priority
# Everything else → mild by default
# Long-term projects without recent progress → mild → can escalate

def auto_assign_priority(
    task_def: TaskDefinition,
    days_since_last: int,
    is_rsr_due: bool,
    is_scheduled_today: bool
) -> str:
    if is_rsr_due or is_scheduled_today:
        return 'urgent'
    if days_since_last is None:  # never done
        return 'urgent'
    if days_since_last > 14:
        return 'urgent'
    if days_since_last > 7:
        return 'mild'
    return 'other'
```

---

## 8. Weekly Audit Computation

```python
def compute_weekly_audit(week_start: date, week_end: date) -> WeeklyAudit:
    """
    Aggregates all closed daily lists in the week.
    Compared against previous week for trend analysis.
    """
    daily_lists = db.query("""
        SELECT * FROM lists
        WHERE type = 'daily'
          AND status = 'closed'
          AND DATE(valid_from) >= ?
          AND DATE(valid_from) < ?
    """, week_start, week_end)

    if not daily_lists:
        return WeeklyAudit(empty=True)

    all_assignments = []
    for l in daily_lists:
        all_assignments.extend(db.get_assignments(l.id))

    COMPLETE_STATES = {
        'complete', 'deferred_complete_same_day',
        'deferred_complete_next_day', 'deferred_complete_later'
    }
    MISS_STATES = {'missed', 'deferred_missed'}

    total_possible  = sum(a.assigned_points for a in all_assignments)
    total_earned    = sum(a.assigned_points for a in all_assignments if a.state in COMPLETE_STATES)
    total_missed    = sum(1 for a in all_assignments if a.state in MISS_STATES)
    completion_rate = total_earned / total_possible if total_possible > 0 else 0

    # Per-section breakdown
    section_stats = {}
    for section_id in get_all_section_ids():
        section_assignments = [
            a for a in all_assignments
            if a.task_def.section_id == section_id
        ]
        possible = sum(a.assigned_points for a in section_assignments)
        earned   = sum(a.assigned_points for a in section_assignments if a.state in COMPLETE_STATES)
        section_stats[section_id] = {
            'possible': possible,
            'earned':   earned,
            'rate':     earned / possible if possible > 0 else 0
        }

    # Compare to previous week
    prev = db.get_latest_weekly_audit(before=week_start)
    rate_delta = (completion_rate - prev.completion_rate) if prev else None

    audit = WeeklyAudit(
        week_start=week_start,
        week_end=week_end,
        total_points_possible=total_possible,
        total_points_earned=total_earned,
        completion_rate=completion_rate,
        section_stats=section_stats,
        total_tasks=len(all_assignments),
        completed_tasks=sum(1 for a in all_assignments if a.state in COMPLETE_STATES),
        missed_tasks=total_missed,
        deferred_tasks=sum(1 for a in all_assignments if 'deferred' in a.state),
        delegated_tasks=sum(1 for a in all_assignments if a.state == 'delegated'),
        prev_week_rate=prev.completion_rate if prev else None,
        rate_delta=rate_delta,
        wlist_points_total=total_earned
    )

    db.save(audit)
    return audit
```

---

## 9. Task Forbiddance Logic (Zero-Completion Rule)

This rule is intentional friction. A task that received zero work cannot silently reappear. It forces you to consciously decide to try again.

```python
def is_task_forbidden(task_def_id: str, audited_list_id: str | None) -> ForbiddanceCheck:
    if audited_list_id is None:
        return ForbiddanceCheck(forbidden=False)

    prev = db.find_assignment(task_def_id=task_def_id, list_id=audited_list_id)

    if prev and prev.state == 'missed':
        return ForbiddanceCheck(
            forbidden=True,
            severity='hard',
            reason='zero_completion',
            message=(
                f"'{prev.task_def.title}' had zero completion on the previous list. "
                "You must provide a reason to add it again."
            ),
            can_override=True
        )

    if prev and prev.state == 'deferred':
        return ForbiddanceCheck(
            forbidden=True,
            severity='blocking',
            reason='still_deferred',
            message=(
                f"'{prev.task_def.title}' is still on-the-line. "
                "Complete or miss it before adding to a new list."
            ),
            can_override=False
        )

    return ForbiddanceCheck(forbidden=False)
```

---

## 10. Backdate and History Import

For populating historical W-List data from physical records (January 2026 and earlier).

```python
def backdate_completion(
    task_def_id: str,
    section_id: str,
    completed_date: date,
    points_earned: float,
    source: str = 'manual_import'
) -> None:
    """
    Creates a historical frequency log entry without requiring
    a full list + assignment chain. Used for bootstrapping history.
    """
    # Find or create a synthetic list record for the date
    synthetic_list = get_or_create_synthetic_list(completed_date)

    # Create a minimal assignment record
    assignment = TaskAssignment(
        list_id=synthetic_list.id,
        task_def_id=task_def_id,
        assigned_points=points_earned,
        state='complete',
        completed_at=datetime.combine(completed_date, time(23, 59)),
        is_backdated=True,
        backdated_source=source
    )
    db.save(assignment)

    # Log to frequency record
    db.insert(MonthlyFrequencyLog(
        task_def_id=task_def_id,
        list_id=synthetic_list.id,
        assignment_id=assignment.id,
        completed_at=assignment.completed_at,
        points_earned=points_earned
    ))
```
