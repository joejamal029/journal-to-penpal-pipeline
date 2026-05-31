Listen up. The core task state controllers have been secured by the implementation bot. We are continuing our sweep of **Priority 3: Services & Integrations**, shifting focus entirely to the **Analytics & Reporting Pipelines** (Part 2).

If the service layer is feeding corrupted data payloads, truncating database columns, or mapping the wrong mathematical aggregates to the schema, the entire dashboard UI is rendered useless. 

I am enforcing strict verbatim fidelity to the master backlog. I have pulled the corresponding raw code blocks directly from the repository to supply the missing evidence. 

Here is the next strictly capped batch for immediate execution.

***

### Batch 5: Priority 3: Services & Integrations - Analytics & Reporting (Part 2)

VIOLATION 2 — WRONG IMPLEMENTATION Spec Source: wlist_analytics.md, 1.3 Monthly Metrics, "Top 5 missed | by miss_count this month | Ranked list" File: src/services/analyticsService.ts Spec Trace: The analytics dashboard must generate a ranking of the top missed tasks, strictly bounded to analyze only miss events that occurred within the current chronological month. Code Trace: The getMostMissedTasks wrapper function internally delegates to getMostMissedTasksForRange but passes hardcoded, infinite date boundaries ('2000-01-01' to '9999-12-31') instead of deriving the current month. Divergence: The service computes a lifetime, all-time ranking of missed tasks instead of filtering strictly by the current month. Evidence:
```typescript
// src/services/analyticsService.ts
export function getMostMissedTasks(minMisses: number = 2): MissedTaskReport[] {
    return getMostMissedTasksForRange(
        '2000-01-01', // Basically all time
        '9999-12-31',
        minMisses
    );
}
```

VIOLATION 1 — PARTIAL IMPLEMENTATION Spec Source: wlist_overview.md, Failure & Backlog Philosophy, "Backdated entries are flagged in analytics but treated as valid completions." File: src/services/analyticsService.ts Spec Trace: The analytics ingestion pipeline must explicitly extract the is_backdated boolean flag from the database so that the dashboard can mathematically process them but visually contextualize or flag post-facto completions as required by the design philosophy. Code Trace: The getAssignmentsForAnalytics SQL query explicitly enumerates exactly 9 columns to pull into memory, ending with ta.is_override. It entirely skips fetching the ta.is_backdated column from the schema. Divergence: The data fetch layer permanently blinds the analytics engine to historical backdates by actively dropping the required flag during database ingestion. Evidence:
```typescript
// src/services/analyticsService.ts
export function getAssignmentsForAnalytics(listId: string): AssignmentRow[] {
    return runQuery<AssignmentRow>(
        `SELECT
            ta.id,
            ta.list_id,
            ta.task_def_id,
            td.section_id,
            s.name AS section_name,
            ta.assigned_points,
            ta.state,
            ta.pomodoros_logged,
            ta.is_override
        FROM task_assignments ta
        JOIN task_definitions td ON ta.task_def_id = td.id
        JOIN sections s ON td.section_id = s.id
        WHERE ta.list_id = ?`,
        [listId]
    );
}
```

VIOLATION 3 — WRONG IMPLEMENTATION Spec Source: wlist_analytics.md, 1.3 Monthly Metrics, "Backlog growth | net new tasks vs tasks completed | Delta" File: src/services/analyticsService.ts Spec Trace: The system defines the backlog as the persistent master task library (the 3-month list definitions). The "Backlog growth" metric must mathematically isolate the delta between newly created core task definitions and the volume of tasks successfully completed over the month. Code Trace: Inside the getBacklogGrowth query, the SQL engine calculates the delta by subtracting the monthly_frequency_log count from the task_assignments count, entirely bypassing the task_definitions table. Divergence: The engine incorrectly measures backlog growth by counting daily task assignments (which occur every time a task is added to a list) instead of master task definition creations, drastically inflating the metric. Evidence:
```typescript
// src/services/analyticsService.ts
export function getBacklogGrowth(monthId: string): { delta: number } {
    return runQueryFirst<{ delta: number }>(
        `SELECT
            (SELECT COUNT(*) FROM task_assignments
             WHERE STRFTIME('%Y-%m', created_at) = ?)
            -
            (SELECT COUNT(*) FROM monthly_frequency_log
             WHERE STRFTIME('%Y-%m', completed_at) = ?) AS delta`,
        [monthId, monthId]
    ) || { delta: 0 };
}
```

VIOLATION 5 — MISSING IMPLEMENTATION Spec Source: wlist_analytics.md, 1.2 Weekly Metrics, "Point velocity | SUM(earned) / days_active | pts/day" File: src/services/weeklyAuditService.ts Spec Trace: The analytics pipeline must compute the overarching weekly point velocity (points earned per active day) and successfully persist it into the database as part of the Weekly Metrics audit block. Code Trace: The pure computation engine (computeWeeklyMetrics) successfully calculates the point_velocity integer and returns it to the caller. However, when computeAndSaveWeeklyAudit maps the summary object to push to the SQLite table, it entirely omits the velocity field. Divergence: The weekly point velocity metric is calculated but immediately abandoned by the service layer before it is ever saved to the database. Evidence:
```typescript
// src/services/weeklyAuditService.ts
const summary: WeeklyAuditSummary = {
    id,
    week_list_id: weekListId,
    // ... [omitted for brevity] ...
    prev_week_rate: prevWeekRate,
    rate_delta: weekly.vs_prev_week,
    wlist_points_total: weekly.total_points_earned,
    created_at: now,
    // point_velocity is missing from this object payload
};
```

VIOLATION 2 — WRONG IMPLEMENTATION Spec Source: wlist_analytics.md, 1.1 Daily Metrics, "W-List points | Same as points earned | Lifetime accumulator" File: src/services/weeklyAuditService.ts Spec Trace: The analytics system demands that the wlist_points_total field acts as a gamified "Lifetime accumulator" that permanently grows as points are earned over the user's entire lifespan. Code Trace: Inside computeAndSaveWeeklyAudit, the engine constructs the WeeklyAuditSummary payload to insert into the database. For the wlist_points_total column, it maps weekly.total_points_earned. weekly.total_points_earned is mathematically just the sum of the points earned strictly *within the current 7-day week*. Divergence: The service erroneously maps a localized weekly total into the field structurally mandated to be an infinite lifetime accumulator. Evidence:
```typescript
// src/services/weeklyAuditService.ts
const summary: WeeklyAuditSummary = {
    // ... [omitted for brevity] ...
    prev_week_rate: prevWeekRate,
    rate_delta: weekly.vs_prev_week,
    wlist_points_total: weekly.total_points_earned, // Maps weekly sum instead of lifetime accumulation
    created_at: now,
};
```

***

Dispatch these queries and payload mappings to the implementation bot immediately. 

Are you ready for the 'Next Batch'?