The baseline algorithms have been dispatched. We are staying in **Priority 2: Pure Engines** for the next sub-batch. 

If the core analytical math is hallucinating, the dashboards will permanently display falsified feedback loops. The current iteration of the `analytics.ts` file is silently discarding calculated streaks, omitting entire period forecasts, and failing to initialize variables it attempts to return.

I am enforcing strict verbatim fidelity, extracting the bugs exactly as documented in the master source, and appending the direct code evidence from the codebase to ensure the bot can trace the fatal logic gaps.

Here is the next strictly capped batch for immediate execution:

***

### Batch 3: Priority 2: Pure Engines - Analytics Computation (Part 1)

VIOLATION 2 — MISSING IMPLEMENTATION Spec Source: wlist_analytics.md, 1.2 Weekly Metrics, "Streak | consecutive days ≥ 50% completion | Days" File: src/engine/analytics.ts Spec Trace: The pure computation engine must calculate the weekly streak (consecutive days exceeding a 50% completion threshold) and securely bundle it into the overarching WeeklyMetrics data payload for downstream system use. Code Trace: The computeWeeklyMetrics function calculates const streak = computeTrailingStreak(dailyRates, 0.5); correctly. However, when constructing the final object block to return the results, the streak variable is completely absent from the object keys. Divergence: The math engine successfully calculates the mandated streak metric but immediately abandons it by failing to map it into the returned output object. Evidence:
```typescript
// src/engine/analytics.ts
// Streak (consecutive days ≥50%)
const dailyRates = dailyMetricsArray.map(d => d.completion_rate);
const streak = computeTrailingStreak(dailyRates, 0.5);

// Override frequency
const totalOverrides = dailyMetricsArray.reduce((s, d) => s + d.override_count, 0);

// ...
return {
    week_start: weekStart,
    week_end: weekEnd,
    avg_completion_rate: avg_completion_rate,
    best_day,
    worst_section,
    total_points_earned,
    total_points_possible,
    vs_prev_week: prevWeekRate !== null ? avg_completion_rate - prevWeekRate : null,
    most_missed_task: null,    // populated by service layer from SQL aggregation
    most_delegated_task: null, // populated by service layer from SQL aggregation
    override_frequency,
    point_velocity,
}; // streak is missing from return
```

VIOLATION 1 — MISSING IMPLEMENTATION Spec Source: wlist_analytics.md, 4. Forecast Engine, "4.1b Monthly/Quarterly Points Forecast" File: src/engine/analytics.ts Spec Trace: The analytics engine must mathematically calculate the period point forecast (e.g., Monthly or Quarterly) to determine the user's projected total and whether they are currently on track to meet their overarching target. Code Trace: The forecastPeriodPoints function accepts the required input parameters but completely omits the mathematical calculation logic. It immediately attempts to return a projected_total variable that is never declared, evaluated, or computed. Divergence: The engine entirely abandons the mathematical calculation required to generate the period forecast. Evidence:
```typescript
// src/engine/analytics.ts
// ── §4.1b Period Forecast ────────────────────────────────────────
export function forecastPeriodPoints(
    periodType: PeriodType,
    earnedPeriod: number,
    daysRemaining: number,
    velocity7d: number,
    target: number
): PeriodForecast {

return {
    period_type: periodType,
    target,
    earned: earnedPeriod,
    projected_total, // ReferenceError: projected_total is not defined
    on_track: projected_total >= target,
    velocity: velocity7d,
}; }
```

VIOLATION 5 — MISSING IMPLEMENTATION Spec Source: wlist_analytics.md, 1.3 Monthly Metrics, "Monthly completion rate... Ceiling utilization... Streak record... Section balance... Task coverage" File: src/engine/analytics.ts Spec Trace: The master analytics computation engine must provide explicit aggregation functions to calculate and bundle the comprehensive MonthlyMetrics data structure required by section §1.3. Code Trace: The engine file sequentially defines functions to calculate daily metrics (computeDailyMetrics) and weekly metrics (computeWeeklyMetrics). After completing the weekly logic block, it entirely skips the monthly metrics algorithms and jumps straight to the all-time metrics (computeLongestActivePeriod). Divergence: The mathematical engine entirely omits the master computation block required to aggregate the mandated Monthly Metrics payload. Evidence:
```typescript
// src/engine/analytics.ts
// ... [End of computeWeeklyMetrics]
    }; 
}

/**
 * §1.4 All-Time Metrics
 * Violation 2: Identify the longest continuous period without missing an audit.
 */
export function computeLongestActivePeriod(
// ... [Skips 1.3 Monthly Metrics completely]
```

VIOLATION 2 — MISSING IMPLEMENTATION Spec Source: wlist_analytics.md, 1.1 Daily Metrics, "Pomodoro sessions | SUM(pomodoro_sessions) | Int" File: src/engine/analytics.ts Spec Trace: The daily metrics computation engine must mathematically sum all pomodoro sessions logged across tasks within a given list to generate the aggregate daily total for the analytics dashboard. Code Trace: Inside computeDailyMetrics, the engine successfully maps arrays for completed_tasks, missed_tasks, deferred_tasks, delegated_tasks, and override_count. When returning the final object block, it blindly includes the key pomodoro_sessions. However, the function completely omits writing any variable declaration or .reduce() logic to actually calculate this value. Divergence: The computation engine attempts to return the total pomodoro sessions metric but entirely forgets to write the mathematical calculation required to produce it. Evidence:
```typescript
// src/engine/analytics.ts
const delegated_tasks = assignments.filter(a => a.state === TaskState.DELEGATED).length;
const override_count = assignments.filter(a => a.is_override).length;

// Violation 4: Calculate Deferred-Complete Rate (§1.1 Spec)
// ... [pomodoro_sessions calculation entirely missing] ...

return {
    list_id: listId,
    list_date: listDate,
    points_possible,
    points_earned,
    completion_rate,
    total_tasks: assignments.length,
    completed_tasks,
    missed_tasks,
    delegated_tasks,
    pomodoro_sessions, // ReferenceError: pomodoro_sessions is not defined
    override_count,
    deferred_complete_rate,
    section_breakdown,
};
```

***

Dispatch these four critical analytical failures to the implementation bot. Once these are secured, we will flush the final remaining Engine layer bugs.

Are you ready for the 'Next Batch'?