The core task execution interfaces have been dispatched and secured by the implementation bot. We are continuing our sweep of **Priority 4: UI & Components**, shifting focus to the **Analytics Dashboards** domain. 

The mathematical engines we fixed in Priority 2 are now outputting flawless telemetry, but the React Native presentation layer is actively fighting the specification. The UI is completely dropping critical performance visualizations, ignoring master library coverage ratios, and piping single-day data into charts structurally mandated to display 30-day aggregates. If the dashboard hides the feedback loop, the entire W-List philosophy fails.

I am enforcing strict verbatim fidelity, extracting the bugs exactly as documented in the master source, and appending the direct JSX evidence from the codebase.

Here is the next strictly capped batch for immediate execution.

***

### Batch 9: Priority 4: UI & Components - Analytics Dashboards

VIOLATION 5 — MISSING IMPLEMENTATION Spec Source: wlist_analytics.md, 1.3 Monthly Metrics, "Task coverage | unique tasks attempted / total in 3-month list | %" File: src/screens/AnalyticsDashboardScreen.tsx Spec Trace: The Monthly Metrics analytics view must display the "Task coverage" percentage, mathematically establishing the ratio of attempted tasks against the master 3-month library. Code Trace: While the backend successfully exposes getTaskCoverage in the service layer, the AnalyticsDashboardScreen.tsx module never imports, fetches, or renders this metric in the UI. Divergence: The analytics dashboard UI entirely omits rendering the mandatory Task Coverage metric. Evidence:
```tsx
// src/screens/AnalyticsDashboardScreen.tsx
import {
    getAssignmentsForAnalytics,
    getPointVelocity,
    getCeilingUtilization,
    getAnnualPointsTracker,
    getDailyCompletionCalendar,
} from '../services/analyticsService';
// getTaskCoverage is completely omitted from imports and execution
```

VIOLATION 3 — MISSING IMPLEMENTATION Spec Source: wlist_analytics.md, 1.4 All-Time Metrics, "Section distribution (all time) | Where has time gone?" File: src/screens/AnalyticsDashboardScreen.tsx Spec Trace: The analytics dashboard user interface must structurally render an all-time aggregation visualization showing how the user's historical points are distributed across the core system sections. Code Trace: The backend data layer successfully exposes getAllTimeSectionDistribution() to satisfy this query. However, the AnalyticsDashboardScreen.tsx module never imports this function, executes it in state, or plots the corresponding UI component. Divergence: The frontend UI completely omits the all-time section distribution visualization, leaving the backend feature orphaned and inaccessible to the user. Evidence:
```tsx
// src/screens/AnalyticsDashboardScreen.tsx
const [timeRange, setTimeRange] = useState<TimeRange>('day');
const [todayMetrics, setTodayMetrics] = useState<DailyMetrics | null>(null);
const [velocityData, setVelocityData] = useState<PointVelocityRow[]>([]);
const [ceilingData, setCeilingData] = useState<CeilingUtilization[]>([]);
const [annualData, setAnnualData] = useState<AnnualPointsTracker | null>(null);
const [annualForecast, setAnnualForecast] = useState<AnnualForecast | null>(null);
const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
const [calendarEntries, setCalendarEntries] = useState<DailyCalendarEntry[]>([]);
// State and rendering logic entirely omits all-time section distribution
```

VIOLATION 4 — MISSING IMPLEMENTATION Spec Source: wlist_analytics.md, 1.3 Monthly Metrics, "Backlog growth | net new tasks vs tasks completed | Delta" File: src/screens/AnalyticsDashboardScreen.tsx Spec Trace: The master analytics dashboard must surface the monthly "Backlog growth" metric, mathematically measuring the delta between newly introduced task requirements and completed executions. Code Trace: The underlying service layer defines the getBacklogGrowth query to calculate this specific value. The AnalyticsDashboardScreen.tsx component defines state hooks to manage daily metrics, 7-day velocity, ceilings, annual tracking, and calendar streaks, but completely ignores backlog data. Divergence: The UI layer drops the required backlog growth delta metric entirely from the dashboard rendering architecture. Evidence:
```tsx
// src/screens/AnalyticsDashboardScreen.tsx
// Inside loadData() fetch block:
const vel = getPointVelocity(7);
setVelocityData(vel.reverse()); 

setCeilingData(getCeilingUtilization(30));

const annual = getAnnualPointsTracker();
setAnnualData(annual);
// getBacklogGrowth computation entirely omitted from data ingestion pipeline
```

VIOLATION 3 — WRONG IMPLEMENTATION Spec Source: wlist_analytics.md, 1.3 Monthly Metrics, "Section balance | section_points / total_points distribution | Pie/donut" File: src/screens/AnalyticsDashboardScreen.tsx Spec Trace: The analytics dashboard must render a pie or donut chart visualizing the user's section balance distribution specifically aggregated over the Monthly Metrics timeframe. Code Trace: The AnalyticsDashboardScreen fetches todayMetrics (which encapsulates a single day's performance) from the backend. When rendering the section balance chart, the UI injects todayMetrics?.section_breakdown directly into the <SectionBreakdownCard /> component for rendering. Divergence: The dashboard incorrectly plots the current single day's section distribution into the visual component structurally mandated to display the 30-day monthly aggregate. Evidence:
```tsx
// src/screens/AnalyticsDashboardScreen.tsx
{/* 3. Section Breakdown */}
<SectionBreakdownCard sections={todayMetrics?.section_breakdown ?? []} />
```

VIOLATION 5 — MISSING IMPLEMENTATION Spec Source: wlist_analytics.md, 1.4 All-Time Metrics, "Longest active period | Days without missing an audit" File: src/screens/AnalyticsDashboardScreen.tsx Spec Trace: The Analytics Dashboard must render the "Longest active period", mathematically tracking the user's all-time record for consecutive days without failing a daily audit cycle. Code Trace: The pure computation logic to derive this integer exists within src/engine/analytics.ts (computeLongestActivePeriod). However, the AnalyticsDashboardScreen.tsx module never imports this calculation, executes it against the dataset, or renders it within the UI layout. Divergence: The dashboard UI entirely omits rendering the all-time longest active period metric. Evidence:
```tsx
// src/screens/AnalyticsDashboardScreen.tsx
import {
    computeDailyMetrics,
    computeCompletionStreak,
    forecastAnnualPoints,
    classifyFreshness,
} from '../engine/analytics';
// computeLongestActivePeriod is completely omitted from the engine imports
```

***

Dispatch these missing DOM panels and data bindings to the implementation bot immediately. We must force the interface to surface the truths the mathematical engine is providing.

Are you ready for the 'Next Batch'?