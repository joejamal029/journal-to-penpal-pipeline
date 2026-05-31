The core execution crashes have been isolated, but our data pipeline is still bleeding. We are remaining strictly within **Priority 3: Services & Integrations** because our analytics service layer is actively throwing fatal exceptions, sweeping invalid list types, and fundamentally breaking the TypeScript compiler.

We cannot build the Analytics UI when the underlying SQLite window functions and CTEs are dropping columns or missing bindings entirely. I have sliced out the next highly focused sub-batch targeting `src/services/analyticsService.ts`. 

Here is your implementation package. Fix these queries immediately.

***

### BATCH 4
**Layer:** Priority 3 - Services & Integrations (Part 2)
**Domain:** Analytics Queries & Compiler Crashes

**3. Missing Bind Parameter in Streak Calendar Engine**  In src/services/analyticsService.ts, the getDailyCompletionCalendar function is responsible for feeding the GitHub-style streak heatmap. The SQL query strictly requires a bind parameter for its date constraint: AND l.valid_from >= DATE('now', '-' || ? || ' months'). However, the execution call blindly passes an empty parameter array [] instead of passing [months]. Because the placeholder ? receives no value, the database execution engine will throw a fatal Incorrect number of bindings supplied error, breaking the Analytics screen.

**1. Fatal Syntax Error in Delegation Analytics (Compiler Crash)**
*   **File:**  src/services/analyticsService.ts
*   **The Spec:**  The engine must accurately query and return a DelegationReport array for time-bound ranges.
*   **The Bug:**  The getDelegationChainsForRange function signature is catastrophically malformed. It abruptly terminates after the second argument (endIso: string) and bleeds directly into the return execution:
*  It is entirely missing the closing parenthesis ) and the opening curly brace {. This is a hard syntax error that will completely break the TypeScript compiler and permanently prevent the application from building.

**4. Ceiling Utilization Subquery Sweeps Invalid List Types**
*   **File:**  src/services/analyticsService.ts
*   **The Spec:**  The getCeilingUtilization analytics must calculate the "avg_daily_usage" specifically against the daily execution limits to recommend ceiling calibrations.
*   **The Bug:**  In the daily_usage CTE subquery, the system joins lists l and task_assignments ta to calculate SUM(ta.assigned_points) AS section_points. However, unlike every other query in the analytics engine, it completely omits the WHERE l.type = 'daily' constraint. Because it blindly aggregates points from all list types (Monthly, Weekly, Quarterly, Yearly) generated on that date, the section_points sum is massively inflated. This perpetually triggers the red "REACHED" threshold in the UI, destroying the integrity of the ceiling calibration data.

**2. Missing Column and Illegal Trailing Comma in Velocity CTE**   **File:**  src/services/analyticsService.ts
*   **The Spec:**  The system must calculate a 7-day and 30-day moving average of point velocity for the analytics dashboard.
*   **The Bug:**  In the getPointVelocity function, the daily_earned CTE calculates the earned points but fails to declare or calculate the possible points. Additionally, the SQL string contains an illegal trailing comma directly preceding the FROM clause: THEN ta.assigned_points ELSE 0 END) AS earned, FROM lists l. When the subsequent continuous_stats CTE attempts to execute COALESCE(de.possible, 0) AS possible, the SQLite engine will throw a fatal no such column: de.possible error and crash the entire Analytics Dashboard.

**3. Task Half-Life Analytics Unclosed Subquery**   **File:**  src/services/analyticsService.ts
*   **The Bug:**  In the getTaskHalfLife function, the CTE miss_after_complete performs an exclusion check using NOT EXISTS (SELECT 1 FROM completion_events between_event WHERE ... AND between_event.state IN ('complete', 'deferred_complete_same_day', 'deferred_complete_next_day', 'deferred_complete_later'). The SQL string immediately proceeds to GROUP BY c.task_def_id without ever providing the closing parenthesis ) to terminate the NOT EXISTS block. Navigating to the Task Attention Report will crash the analytics engine with a fatal SQL syntax error.

***

Patch these analytical queries immediately so we can stabilize the reporting data flow. Are you ready for the Next Batch?