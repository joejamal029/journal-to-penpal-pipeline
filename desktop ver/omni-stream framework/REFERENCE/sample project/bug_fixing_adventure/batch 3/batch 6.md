Listen up. Your previous patches locked down the catastrophic execution crashes and parameter shifts, but our analytical data layer and query constraints are structurally compromised. We are remaining in **Priority 3: Services & Integrations**.

Our analytics dashboard is currently feeding the user mathematically falsified data. The SQL queries calculating miss rates and annual velocities are missing core multipliers or filtering out valid states entirely. Furthermore, our delegation tracker is querying the wrong database columns, and an unfiltered global query is actively polluting the ceiling limits for the daily list builder.

I have isolated these five critical data corruption bugs into a highly focused sub-batch. Fix these SQL queries and math logic immediately so our data reporting regains its integrity.

***

### BATCH 6
**Layer:** Priority 3 - Services & Integrations (Part 3)
**Domain:** Analytics SQL Math & Database Queries

**1. Analytics `miss_rate_pct` Mathematical Erasure**
*   **File:**  src/services/analyticsService.ts
*   **The Spec:**  The analytics engine must accurately rank the most missed tasks by their actual failure percentage.
*   **The Bug:**  In the getMostMissedTasksForRange SQL query, the miss_rate_pct is computed as ROUND(100.0 / NULLIF(COUNT(ta.id), 0), 1). The mathematical formula entirely omits multiplying the numerator by the actual miss count (COUNT(CASE WHEN ta.state IN...). Because the query only divides 100 by the total appearances, the miss rate percentage is structurally falsified, returning identical percentages for tasks that appeared the same number of times regardless of whether they were missed once or ten times.

**2. Velocity Mathematics Erasure in Annual Tracker**
*   **File:**  src/services/analyticsService.ts
*   **The Spec:**  The Annual Points Tracker must accurately calculate the days_to_target_at_current_velocity based on the true average points earned per day.
*   **The Bug:**  In the getAnnualPointsTracker SQL query, the days_to_target_at_current_velocity calculation relies on dividing the remaining target by the current daily velocity. However, the SUM(CASE WHEN ta.state IN (...) subquery utilized for the velocity divisor explicitly omits the core completion states. It reads: ta.state IN ('deferred_complete_next_day','deferred_complete_later'). Because it completely ignores 'complete' and 'deferred_complete_same_day', the derived daily velocity is astronomically deflated. This falsifies the mathematical denominator, ballooning the "days to target" projection into an impossibly large number and breaking the annual forecast.

**3. Delegation Analytics Falsely Conflates Deferred Roll-Overs**
*   **File:**  src/services/analyticsService.ts
*   **The Spec:**  The analytics dashboard must accurately report a "Most Delegated" metric to track tasks pushed to future W-Lists via explicit user delegation.
*   **The Bug:**  In the getDelegationChainsForRange SQL query, the engine calculates received delegations by executing: COUNT(CASE WHEN ta.deferred_from_assignment_id IS NOT NULL THEN 1 END) AS received_delegations. The deferred_from_assignment_id column is exclusively utilized by the Daily Audit Engine to track tasks that time out and roll over to the next day. Actual delegations are structurally tracked via delegated_assignment_id. By querying the wrong column, the analytics engine structurally falsifies the report, classifying every single delayed/rolled-over task in the system's history as a "received delegation."

**4. Delegation Analytics Unprojected Column Breakage**
*   **File:**  src/services/analyticsService.ts & src/screens/TaskAttentionReportScreen.tsx
*   **The Bug:**  The UI component for the "Most Delegated" report strictly relies on mapping the task's parent section via <Text style={styles.taskMeta}>{task.section_name}</Text>. However, in the underlying query getDelegationChainsForRange, the SQL execution string strictly queries SELECT td.title, COUNT(...). It explicitly joins the sections table and groups by s.name, but completely fails to project s.name AS section_name in the final SELECT clause. Consequently, the UI will permanently receive undefined data and render empty section labels for every delegated task.

**5. Unfiltered Global Query Pollutes Daily Ceilings**
*   **File:**  src/screens/NewListScreen.tsx
*   **The Spec:**  The daily list drafting engine must enforce section constraints based strictly on the current active Monthly W-List ceilings.
*   **The Bug:**  During loadPlanningContext, the system attempts to load the ceilings by executing: runQuery<any>('SELECT section_id, ceiling_points FROM section_ceilings');. It fatally omits the required WHERE list_id = ? clause. By querying the entire database history of ceilings across all past, closed, and active lists indiscriminately, it overwrites the local cMap dictionary non-deterministically. This severely corrupts the ceiling enforcement engine, randomly allowing or blocking tasks based on outdated historical constraints.

***

Lock down these queries so our math and analytical forecasts are actually correct. Are you ready for the 'Next Batch'?