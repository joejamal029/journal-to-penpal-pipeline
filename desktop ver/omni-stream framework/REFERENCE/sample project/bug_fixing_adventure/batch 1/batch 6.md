The services and integration layer is finally stabilizing, meaning the data flowing to the frontend is no longer actively hostile. We are finally moving to the top of the stack: **Priority 4: UI & Components**. 

However, we cannot start wiring up user workflows or complex list-building logic just yet. I have identified a cluster of hard crashes and build failures residing in the core visual components and analytics views. The UI is literally throwing `ReferenceErrors` on mount and failing compilation because of undeclared variables and missing syntax. We need these baseline visual elements rendering without fatal exceptions before we tackle the actual screen logic.

Here is your highly focused UI triage batch.

***

### BATCH 5
**Layer:** Priority 4 - UI & Components
**Domain:** Visuals & Analytics Crashes (Part 1)

**1. W-Symbol Rendering Fatal Crash**  In src/components/WSymbol.tsx, the component attempts to calculate the number of animated SVG strokes by iterating over an undeclared state variable (Array.from({ length: state }...)). The code completely misses invoking the engine function getWState(percentage) to define this variable. Because state is undefined in the functional component's scope, attempting to render the checkmark for any task will immediately trigger a fatal ReferenceError.

**2. Missing Closing Brace Breaks Compilation in Analytics Calendar**
*   **The Bug:**  In src/components/StreakCalendar.tsx, the helper function getMonthLabel completely lacks a closing brace }. The code bleeds directly into the next function declaration: return new Date(year, month, 1).toLocaleString('en-US', { month: 'short' }); function isoDate(d: Date): string {. This is a hard syntax error that will fail the TypeScript compiler and prevent the entire application from building.

**3.**  **TodayCard**  **Reference Error on Points Variable**
*   **The Bug:**  In src/screens/AnalyticsDashboardScreen.tsx, the TodayCard component renders a summary of the day's progress. It attempts to display the earned points using string interpolation: <MetricBox label="Points" value={${pts.toFixed(1)}}... />. The variable pts is never declared or calculated in the component (it should be extracted via metrics.points_earned). Loading the Analytics dashboard will trigger a fatal ReferenceError and crash the screen.

**4.**  **SevenDayChart**  **SVG Rendering Crash**
*   **The Bug:**  Also in src/screens/AnalyticsDashboardScreen.tsx, the SevenDayChart loops over velocity data to draw the daily completion bar charts. It calculates the Y-axis position and rectangle height using a variable named barH (e.g., const y = chartPadding.top + plotHeight - barH; and height={Math.max(barH, 1)}). Because barH is never calculated or declared within the mapping loop, this will result in another ReferenceError crash when the chart attempts to mount.

***

Patch these syntax and reference errors immediately so the application can actually build and mount its core views. Are you ready for the Next Batch?