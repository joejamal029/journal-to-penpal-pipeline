# W-List: Analytics Specification

> "I was extremely negatively constrained in my existing implementation as everything
> was done manually. This will be one of the most important leverage points as we go
> electronic."
> — Analytic Capabilities Brief

---

## Philosophy

The analytics system is not a dashboard bolted on after the fact. It is the data layer of the W-List's own philosophy: **Data → Analyze → Engineer → Systemize → Optimize**, applied to your own operating system.

Every metric answers a question the manual system could not. The goal is not gamification alone — it is the closing of a feedback loop that was always structurally open on paper.

---

## 1. Core Metric Taxonomy

### 1.1 Daily Metrics (per list)

| Metric | Formula | Display |
|---|---|---|
| Points possible | `SUM(assigned_points)` | Number |
| Points earned | `SUM(assigned_points) WHERE state = complete*` | Number |
| Completion rate | `earned / possible` | % |
| W-List points | Same as points earned | Lifetime accumulator |
| Tasks total | `COUNT(assignments)` | Int |
| Tasks completed | `COUNT WHERE state = complete*` | Int |
| Tasks missed | `COUNT WHERE state = missed*` | Int |
| Tasks deferred | `COUNT WHERE state = deferred*` | Int |
| Tasks delegated | `COUNT WHERE state = delegated` | Int |
| Pomodoro sessions | `SUM(pomodoro_sessions)` | Int |
| Override count | `COUNT WHERE is_override = 1` | Int |
| Deferred-complete rate | `deferred_complete / total_deferred` | % |
| Section breakdown | All above per section | Table |

`complete*` = complete + deferred_complete_same_day + deferred_complete_next_day + deferred_complete_later
`missed*` = missed + deferred_missed
`deferred*` = deferred + deferred_complete_*

### 1.2 Weekly Metrics

| Metric | Formula | Display |
|---|---|---|
| 7-day completion rate | `avg(daily_rate)` over week | % |
| Best day | max(daily_rate) this week | Day name + % |
| Worst section | min(section_rate) this week | Section + % |
| Total W-points | `SUM(daily_earned)` | Number |
| Streak | consecutive days ≥ 50% completion | Days |
| vs previous week | `this_week_rate - prev_week_rate` | Delta % |
| Most missed task | `task with highest miss_count this week` | Task title |
| Most delegated task | `task with highest delegation_count` | Task title |
| Override frequency | overrides / total_additions | % (flag if >10%) |
| Point velocity | `SUM(earned) / days_active` | pts/day |

### 1.3 Monthly Metrics

| Metric | Formula | Display |
|---|---|---|
| Monthly completion rate | `avg(weekly_rate)` | % |
| Ceiling utilization | `avg_daily_used / ceiling` per section | % per section |
| Streak record | longest streak in month | Days |
| Section balance | `section_points / total_points` distribution | Pie/donut |
| Task coverage | unique tasks attempted / total in 3-month list | % |
| Top 5 completed | by completion_count this month | Ranked list |
| Top 5 missed | by miss_count this month | Ranked list |
| Top 5 delegated | by delegation_count | Ranked list |
| Pomodoro total | total sessions this month | Int + hours |
| Point velocity trend | 30-day moving average | Line chart |
| Backlog growth | net new tasks vs tasks completed | Delta |

### 1.4 All-Time Metrics

| Metric | Display |
|---|---|
| Total W-points earned (lifetime) | Large number — gamified milestone |
| Total lists completed | Int |
| Total tasks logged | Int |
| Best completion streak ever | Days + date range |
| Longest active period | Days without missing an audit |
| Section distribution (all time) | Where has time gone? |
| Point velocity (all time MA) | pts/day |
| Annual target progress | 6000pt goal tracker |
| Task half-life | Days after completion until a task is typically missed on next appearance. Computed from historical completion-then-miss patterns per task_def. Signal for frequency/ceiling calibration. |

---

## 2. SQL Queries

### 2.1 Daily completion breakdown

```sql
SELECT
    s.name AS section,
    COUNT(ta.id) AS total_tasks,
    SUM(ta.assigned_points) AS points_possible,
    SUM(CASE WHEN ta.state IN (
        'complete', 'deferred_complete_same_day',
        'deferred_complete_next_day', 'deferred_complete_later'
    ) THEN ta.assigned_points ELSE 0 END) AS points_earned,
    ROUND(
        SUM(CASE WHEN ta.state IN (
            'complete','deferred_complete_same_day',
            'deferred_complete_next_day','deferred_complete_later'
        ) THEN ta.assigned_points ELSE 0 END)
        * 100.0 / NULLIF(SUM(ta.assigned_points), 0), 1
    ) AS completion_pct
FROM sections s
JOIN task_definitions td ON s.id = td.section_id
JOIN task_assignments ta ON td.id = ta.task_def_id
WHERE ta.list_id = :daily_list_id
GROUP BY s.id, s.name
ORDER BY s.display_order;
```

### 2.2 Point velocity (7-day moving average)

```sql
WITH daily_earned AS (
    SELECT
        DATE(l.valid_from) AS list_date,
        SUM(CASE WHEN ta.state IN (
            'complete','deferred_complete_same_day',
            'deferred_complete_next_day','deferred_complete_later'
        ) THEN ta.assigned_points ELSE 0 END) AS earned,
        SUM(ta.assigned_points) AS possible
    FROM lists l
    JOIN task_assignments ta ON l.id = ta.list_id
    WHERE l.type = 'daily' AND l.status = 'closed'
    GROUP BY DATE(l.valid_from)
)
SELECT
    list_date,
    earned,
    possible,
    ROUND(earned * 100.0 / NULLIF(possible, 0), 1) AS daily_rate_pct,
    ROUND(AVG(earned) OVER (
        ORDER BY list_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 2) AS velocity_7d,
    ROUND(AVG(earned) OVER (
        ORDER BY list_date
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ), 2) AS velocity_30d
FROM daily_earned
ORDER BY list_date DESC;
```

### 2.3 Most missed tasks (recency-weighted)

```sql
SELECT
    td.id,
    td.title,
    s.name AS section,
    COUNT(CASE WHEN ta.state IN ('missed','deferred_missed') THEN 1 END) AS miss_count,
    COUNT(ta.id) AS total_appearances,
    ROUND(
        COUNT(CASE WHEN ta.state IN ('missed','deferred_missed') THEN 1 END) * 100.0
        / NULLIF(COUNT(ta.id), 0), 1
    ) AS miss_rate_pct,
    MAX(l.valid_from) AS last_appeared,
    JULIANDAY('now') - JULIANDAY(
        MAX(CASE WHEN ta.state IN ('missed','deferred_missed')
            THEN l.valid_from END)
    ) AS days_since_last_miss
FROM task_definitions td
JOIN sections s ON td.section_id = s.id
JOIN task_assignments ta ON td.id = ta.task_def_id
JOIN lists l ON ta.list_id = l.id
WHERE l.type = 'daily'
GROUP BY td.id, td.title, s.name
HAVING miss_count >= 2
ORDER BY miss_rate_pct DESC, miss_count DESC;
```

### 2.4 Ceiling utilization analysis

```sql
-- Answers: are your ceilings calibrated correctly?
-- Consistently > 90% utilization → ceiling too low
-- Consistently < 40% utilization → ceiling too high
SELECT
    sc.section_id,
    s.name AS section,
    sc.ceiling_points,
    ROUND(AVG(daily_usage.section_points), 2) AS avg_daily_usage,
    ROUND(AVG(daily_usage.section_points) * 100.0 / sc.ceiling_points, 1) AS avg_utilization_pct,
    COUNT(CASE WHEN daily_usage.section_points >= sc.ceiling_points * 0.90
               THEN 1 END) AS days_near_ceiling,
    COUNT(CASE WHEN daily_usage.section_points < sc.ceiling_points * 0.40
               THEN 1 END) AS days_underused
FROM section_ceilings sc
JOIN sections s ON sc.section_id = s.id
JOIN (
    SELECT
        td.section_id,
        l.id AS list_id,
        SUM(ta.assigned_points) AS section_points
    FROM lists l
    JOIN task_assignments ta ON l.id = ta.list_id
    JOIN task_definitions td ON ta.task_def_id = td.id
    WHERE l.type = 'daily'
      AND l.valid_from >= DATE('now', '-30 days')
    GROUP BY td.section_id, l.id
) daily_usage ON sc.section_id = daily_usage.section_id
GROUP BY sc.section_id, s.name, sc.ceiling_points
ORDER BY s.display_order;
```

### 2.5 Task frequency ranking (for low-frequency prioritization)

```sql
SELECT
    td.id,
    td.title,
    s.name AS section,
    td.base_points,
    COUNT(mfl.id) AS total_completions,
    MAX(mfl.completed_at) AS last_completed,
    CASE
        WHEN MAX(mfl.completed_at) IS NULL
        THEN 9999
        ELSE JULIANDAY('now') - JULIANDAY(MAX(mfl.completed_at))
    END AS days_since_last,
    CASE
        WHEN MAX(mfl.completed_at) IS NULL THEN 'never'
        WHEN JULIANDAY('now') - JULIANDAY(MAX(mfl.completed_at)) > 14 THEN 'stale'
        WHEN JULIANDAY('now') - JULIANDAY(MAX(mfl.completed_at)) > 7  THEN 'mild'
        ELSE 'recent'
    END AS freshness
FROM task_definitions td
JOIN sections s ON td.section_id = s.id
LEFT JOIN monthly_frequency_log mfl ON td.id = mfl.task_def_id
WHERE td.is_archived = 0
GROUP BY td.id, td.title, s.name, td.base_points
ORDER BY days_since_last DESC NULLS FIRST;
```

### 2.6 Delegation chain tracker

```sql
-- See how many times a task has been delegated across lists
SELECT
    td.title,
    s.name AS section,
    COUNT(CASE WHEN ta.state = 'delegated' THEN 1 END) AS delegation_count,
    COUNT(CASE WHEN ta.deferred_from_assignment_id IS NOT NULL THEN 1 END) AS received_delegations,
    MAX(l.valid_from) AS last_delegated
FROM task_definitions td
JOIN sections s ON td.section_id = s.id
JOIN task_assignments ta ON td.id = ta.task_def_id
JOIN lists l ON ta.list_id = l.id
WHERE l.type = 'daily'
GROUP BY td.id, td.title, s.name
HAVING delegation_count > 0
ORDER BY delegation_count DESC;
```

### 2.7 Annual points tracker (6000pt goal)

```sql
SELECT
    STRFTIME('%Y', l.valid_from) AS year,
    ROUND(SUM(CASE WHEN ta.state IN (
        'complete','deferred_complete_same_day',
        'deferred_complete_next_day','deferred_complete_later'
    ) THEN ta.assigned_points ELSE 0 END), 2) AS points_earned_ytd,
    6000 AS annual_target,
    ROUND(
        SUM(CASE WHEN ta.state IN (
            'complete','deferred_complete_same_day',
            'deferred_complete_next_day','deferred_complete_later'
        ) THEN ta.assigned_points ELSE 0 END) * 100.0 / 6000, 1
    ) AS pct_of_target,
    CAST(STRFTIME('%j', 'now') AS INTEGER) AS day_of_year,
    ROUND(
        SUM(CASE WHEN ta.state IN (
            'complete','deferred_complete_same_day',
            'deferred_complete_next_day','deferred_complete_later'
        ) THEN ta.assigned_points ELSE 0 END)
        / CAST(STRFTIME('%j', 'now') AS REAL), 2
    ) AS avg_pts_per_day,
    ROUND(
        (6000 - SUM(CASE WHEN ta.state IN (
            'complete','deferred_complete_same_day',
            'deferred_complete_next_day','deferred_complete_later'
        ) THEN ta.assigned_points ELSE 0 END))
        / NULLIF(
            SUM(CASE WHEN ta.state IN (
                'complete','deferred_complete_same_day',
                'deferred_complete_next_day','deferred_complete_later'
            ) THEN ta.assigned_points ELSE 0 END)
            / CAST(STRFTIME('%j', 'now') AS REAL),
        0), 1
    ) AS days_to_target_at_current_velocity
FROM lists l
JOIN task_assignments ta ON l.id = ta.list_id
WHERE l.type = 'daily'
  AND STRFTIME('%Y', l.valid_from) = STRFTIME('%Y', 'now')
GROUP BY year;
```

---

## 3. Analytics Views (UI)

### 3.1 Today Card (home screen summary)

```
┌─────────────────────────────────────────────┐
│  Today · Fri 09 Jan                         │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   71%    │  │  34 pts  │  │  🔥 4d   │  │
│  │ Complete │  │  Today   │  │  Streak  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  W-Points: 1,247 (YTD) · Target: 6000      │
│  ████████████░░░░░░░░░░░░░░░  20.8%        │
└─────────────────────────────────────────────┘
```

### 3.2 Weekly Overview Chart

```
7-DAY COMPLETION RATE
100% │
 80% │     ████
 60% │ ████████  ████
 40% │ ████████  ████  ████
 20% │ ████████  ████  ████  ████
  0% └────────────────────────────
      Mon  Tue  Wed  Thu  Fri  Sat  Sun
                                 ↑ today
Avg this week: 68%  │  Prev week: 61%  ↑ +7%
```

### 3.3 Section Balance (monthly)

```
SECTION DISTRIBUTION · Jan 2026
  SCHOOL    ████████████░░░░░░  35%  ✓
  SPIRITUAL ████████░░░░░░░░░░  22%  ✓
  DEPTS     ████░░░░░░░░░░░░░░  12%  ↓ low
  SKILL     ████░░░░░░░░░░░░░░  10%
  BUSINESS  ██░░░░░░░░░░░░░░░░   7%  ↓ low
  REFLECT   ████░░░░░░░░░░░░░░   8%
  RESTORE   ██░░░░░░░░░░░░░░░░   4%
  RECREAT   ██░░░░░░░░░░░░░░░░   2%

⚠️ DEPTS and BUSINESS below 15% target

Section balance targets (user-configurable):
  SCHOOL: 30%  SPIRITUAL: 25%  DEPTS: 15%
  SKILL: 10%   BUSINESS: 10%   REFLECT: 5%
  RESTORE: 3%  RECREATION: 2%
  Targets edit: Settings → Section Balance Targets
```

### 3.4 Ceiling Utilization Gauge (per section)

```
CEILING UTILIZATION · Last 30 days
SCHOOL    ████████████████████  95%  ⚠️ Near limit — consider raising ceiling
SPIRITUAL ██████████░░░░░░░░░░  58%  ✓ Healthy
DEPTS     ████░░░░░░░░░░░░░░░░  22%  ↓ Underused — or ceiling too high
SKILL     ███████░░░░░░░░░░░░░  41%  ✓
BUSINESS  █████░░░░░░░░░░░░░░░  28%  ↓
```

### 3.5 Task Attention Report (weekly)

```
ATTENTION NEEDED

Most missed this week:
  1. Journalistic (5/7 lists) — 71% miss rate
  2. Beyond Shuffle (4/7)     — 57% miss rate
  3. Japanese (4/7)           — 57% miss rate

Most delegated:
  1. Musicolet DB Manager — delegated 3× this week

Never appeared:
  - Reinforced Spaced Revision (last done: 14d ago)
  - E-backup (last done: 22d ago)
  - Old Journal Writings (never done)
```

### 3.6 Streak Calendar (GitHub-style)

```
COMPLETION STREAK · Jan–Mar 2026
         Jan  Feb  Mar
Week 1   ████ ████ ██░░
Week 2   ████ ████
Week 3   ░░██ ████
Week 4   ████ ██░░

■ > 80%  ▪ 50-80%  · < 50%  ░ no list

Current streak: 4 days
Best streak: 23 days (Jun–Jul 2025)
```

---

## 4. Forecast Engine

### 4.1 Annual Points Forecast

```python
def forecast_annual_points(target: int = 6000) -> AnnualForecast:
    earned_ytd = get_total_points_ytd()
    day_of_year = get_day_of_year()
    velocity_7d = get_velocity_7d()  # pts/day, 7-day average
    velocity_30d = get_velocity_30d()  # pts/day, 30-day average

    remaining = target - earned_ytd
    days_remaining_in_year = 365 - day_of_year

    if velocity_7d > 0:
        days_to_target = remaining / velocity_7d
        projected_date = today() + timedelta(days=days_to_target)
        on_track = days_to_target <= days_remaining_in_year
    else:
        projected_date = None
        on_track = False

    expected_by_eoy = earned_ytd + (velocity_30d * days_remaining_in_year)

    return AnnualForecast(
        target=target,
        earned_ytd=earned_ytd,
        remaining=remaining,
        velocity_7d=velocity_7d,
        velocity_30d=velocity_30d,
        projected_completion_date=projected_date,
        on_track=on_track,
        expected_eoy_total=expected_by_eoy,
        deficit_or_surplus=expected_by_eoy - target
    )
```

### 4.1b Monthly/Quarterly Points Forecast

```python
def forecast_period_points(
    period_type: str = 'monthly',  # 'monthly' | 'quarterly'
    target: float = None
) -> PeriodForecast:
    """
    Shorter-horizon forecasts for monthly and quarterly planning.
    target: if None, uses average from prior periods.
    """
    if period_type == 'monthly':
        days_in_period = days_remaining_in_month()
        earned_period = get_points_this_month()
        avg_prior = get_avg_monthly_points(lookback=3)
    else:  # quarterly
        days_in_period = days_remaining_in_quarter()
        earned_period = get_points_this_quarter()
        avg_prior = get_avg_quarterly_points(lookback=2)

    target = target or avg_prior
    velocity = get_velocity_7d()
    projected_total = earned_period + (velocity * days_in_period)

    return PeriodForecast(
        period_type=period_type,
        target=target,
        earned=earned_period,
        projected_total=projected_total,
        on_track=(projected_total >= target),
        velocity=velocity
    )
```

### 4.2 Section Completion Forecast

```python
def forecast_section_coverage(section_id: str) -> SectionForecast:
    """
    Given current velocity in a section, when will all
    tasks in the 3-month list have been touched at least once?
    """
    pending_tasks = count_never_done_tasks(section_id)
    recent_rate   = get_section_completion_rate(section_id, days=14)

    if recent_rate == 0 or pending_tasks == 0:
        return SectionForecast(
            pending=pending_tasks,
            rate=recent_rate,
            projected_days=None,
            warning="No recent activity in this section"
        )

    projected_days = pending_tasks / recent_rate

    return SectionForecast(
        pending=pending_tasks,
        rate=recent_rate,
        projected_days=projected_days,
        projected_date=today() + timedelta(days=projected_days)
    )
```

### 4.3 Ceiling Calibration Recommendation

```python
def recommend_ceiling_adjustment(section_id: str) -> CeilingRecommendation:
    """
    Analyzes 30-day utilization to suggest ceiling adjustments.
    """
    utilization = get_avg_ceiling_utilization(section_id, days=30)
    override_count = get_override_count(section_id, days=30)
    current_ceiling = get_current_ceiling(section_id)

    if utilization > 0.90 or override_count > 3:
        # Consistently near or at ceiling — raise it
        suggested = round(current_ceiling * 1.25, 1)
        return CeilingRecommendation(
            action='increase',
            current=current_ceiling,
            suggested=suggested,
            reason=f"Avg utilization {utilization*100:.0f}% over 30 days. "
                   f"{override_count} overrides this month."
        )
    elif utilization < 0.40:
        # Consistently underusing — lower it to enforce focus
        suggested = round(current_ceiling * 0.80, 1)
        return CeilingRecommendation(
            action='decrease',
            current=current_ceiling,
            suggested=suggested,
            reason=f"Avg utilization only {utilization*100:.0f}% over 30 days. "
                   "Ceiling may be too permissive."
        )
    else:
        return CeilingRecommendation(action='maintain', current=current_ceiling)
```

---

## 5. Export & Accountability

### Day Audit Report Format (Markdown export)

```markdown
# W-List Day Report: Fri 09 Jan 2026

**Total:** 34.0 / 47.5 pts (71.6%)
**Streak:** 4 days 🔥
**W-Points YTD:** 1,247

---

## SCHOOL (9.0 / 14.0 pts)
| Task | State | Points |
|------|-------|--------|
| PHA 402 | ✓ W | 2.0 |
| PCA 402 ×2 | ✓ W | 4.0 |
| PCL 401 | ═ deferred (blue) | 2.0 → |
| PCA 404 | ✗ missed | 0/2.0 |

## SPIRITUAL (7.0 / 6.5 pts)
| Task | State | Points |
|------|-------|--------|
| Devotion | ✓ W | 2.0 |
| Prayer | ✓ W | 1.0 |
| Can 2 Walk Together | ✓ W | 1.0 |
| Bible Reading | ✓ W | 1.0 |

...
---
*Generated by W-List v1.0*
```

### Weekly Audit Report Format

```python
def export_weekly_report(week_start: date) -> str:
    audit = get_weekly_audit(week_start)
    lines = [
        f"# Weekly W-List Audit: {week_start} – {week_start + timedelta(6)}",
        f"",
        f"**Completion:** {audit.completion_rate*100:.1f}% "
        f"({'+' if audit.rate_delta >= 0 else ''}{audit.rate_delta*100:.1f}% vs last week)",
        f"**Points:** {audit.total_points_earned:.1f} / {audit.total_points_possible:.1f}",
        f"**Streak:** {audit.current_streak} days",
        f"",
        f"## Section Breakdown",
        *[
            f"- **{sid.upper()}:** {stats['rate']*100:.1f}% "
            f"({stats['earned']:.1f}/{stats['possible']:.1f}pt)"
            for sid, stats in audit.section_stats.items()
        ],
        f"",
        f"## Attention",
        f"Most missed: {audit.most_missed_task}",
        f"Most delegated: {audit.most_delegated_task}",
        f"Override count: {audit.override_count}"
    ]
    return '\n'.join(lines)
```
