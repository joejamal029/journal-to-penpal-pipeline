Listen up. We are pushing deep into the **Priority 4: UI & Components** layer, and the data visualization components are actively fighting the specification. The analytics engine is processing the math correctly, but the presentation layer is silently discarding data, rendering incorrect chart types, and violating hard threshold constraints.

I have carved out a highly focused sub-batch targeting the **Analytics & Dashboards** domain. I am enforcing strict verbatim fidelity, exactly as documented in the master backlog, and I have pulled the raw code blocks directly from the codebase to populate the missing evidence payloads as you commanded.

Here is the next strictly capped batch for immediate execution. Do not let the bot hallucinate beyond these exact DOM trees.

***

### Batch 9: Priority 4: UI & Components - Analytics & Dashboards

VIOLATION 2 — WRONG IMPLEMENTATION Spec Source: wlist_analytics.md, 1.3 Monthly Metrics, "Section balance | section_points / total_points distribution | Pie/donut" File: src/screens/AnalyticsDashboardScreen.tsx Spec Trace: Within the Monthly Metrics analytics view, the system must calculate the point distribution balancing across sections and visually render this specific metric as a Pie or Donut chart. Code Trace: The SectionBreakdownCard component maps through the section data, calculating the correct pct (percentage). However, it structurally feeds this value into a barTrack container, utilizing a linear width percentage styling (width: ${Math.min(pct, 100)}%) to draw a horizontal progress bar. Divergence: The system displays the section balance distribution using linear horizontal bars instead of the explicitly mandated Pie/donut chart visualization. Evidence:
```tsx
// src/screens/AnalyticsDashboardScreen.tsx
<View style={styles.barTrack}>
    <View
        style={[
            styles.barFill,
            { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor },
        ]}
    />
</View>
```

VIOLATION 1 — WRONG IMPLEMENTATION Spec Source: wlist_analytics.md, 1.3 Monthly Metrics, "Top 5 missed | by miss_count this month | Ranked list" File: src/screens/TaskAttentionReportScreen.tsx Spec Trace: The analytics specification explicitly limits the ranked lists for attention metrics. The "Most Missed" and "Most Delegated" views must be strictly bounded to show exactly the top 5 records. Code Trace: The TaskAttentionReportScreen component receives the sorted arrays from the analytics engine. When rendering the Most Missed card, the logic calls missed.slice(0, 10). For Most Delegated, it calls delegated.slice(0, 8). Divergence: The UI incorrectly widens the rendering threshold to display up to 10 missed tasks and 8 delegated tasks instead of restricting the output to the top 5. Evidence:
```tsx
// src/screens/TaskAttentionReportScreen.tsx
{/* 2. Most Missed Tasks */}
<View style={styles.card}>
    <Text style={styles.cardTitle}>? Most Missed</Text>
    {missed.length === 0 ? (
        <Text style={styles.emptyText}>No frequently missed tasks</Text>
    ) : (
        missed.slice(0, 10).map((task, i) => (
            <View key={task.task_def_id} style={styles.taskRow}>
// ...
{/* 3. Most Delegated */}
<View style={styles.card}>  $<Text style={styles.cardTitle}>→ Most Delegated</Text>$
    {delegated.length === 0 ? (
        <Text style={styles.emptyText}>No delegated tasks</Text>
    ) : (
        delegated.slice(0, 8).map((task, i) => (
```

VIOLATION 4 — MISSING IMPLEMENTATION Spec Source: wlist_analytics.md, 1.3 Monthly Metrics, "Point velocity trend | 30-day moving average | Line chart" File: src/screens/AnalyticsDashboardScreen.tsx Spec Trace: The analytics dashboard must plot the historical point velocity trend. The specification demands this specific metric be mapped as a 30-day moving average and explicitly rendered as a Line chart. Code Trace: The AnalyticsDashboardScreen fetches velocityData from the data layer and pipes it exclusively into a component called <SevenDayChart />. This component draws a 7-day SVG Bar Chart (Rect). The 30-day moving average is mathematically calculated by the backend but never mapped to a UI component. Divergence: The dashboard displays a 7-day bar chart but completely abandons rendering the mandated 30-day moving average line chart visualization. Evidence:
```tsx
// src/screens/AnalyticsDashboardScreen.tsx
{/* 2. 7-Day Bar Chart */}
<SevenDayChart
    data={velocityData}
    onShareWeekly={() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const  report  = generateWeeklyReport(sevenDaysAgo.toISOString().split('T'));
        shareReport('W-List Weekly Summary', report);
    }}
/>
```

VIOLATION 1 — PARTIAL IMPLEMENTATION Spec Source: wlist_analytics.md, 1.4 All-Time Metrics, "Best completion streak ever | Days + date range" File: src/components/StreakCalendar.tsx Spec Trace: The analytics dashboard must display the user's best completion streak of all time. This metric specifically demands rendering both the integer count of days and the exact historical date range (start to end) that the streak occurred. Code Trace: The StreakCalendar component checks if streak.best_streak > 0. It correctly maps and renders the integer count via {streak.best_streak}d, but completely ignores the best_streak_start and best_streak_end properties available in the payload. Divergence: The UI successfully renders the best streak day count but completely omits the explicitly mandated date range context. Evidence:
```tsx
// src/components/StreakCalendar.tsx
<View style={styles.streakRow}>
    <Text style={styles.streakLabel}>? Current streak:</Text>
    <Text  style={styles.streakValue}>{streak?.current_streak  ??  0} days</Text>
    {streak && streak.best_streak > 0 && (
        <Text style={styles.streakBest}>
            · Best: {streak.best_streak}d
        </Text>
    )}
</View>
```

***

Dispatch these to the bot immediately. We must force the UI to render the mathematical truths the engine is providing.

Are you ready for the 'Next Batch'?