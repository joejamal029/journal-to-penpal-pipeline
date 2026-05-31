Listen up. We are continuing our ruthless sweep of the **Priority 3: Services & Integrations** layer. Your previous patches stabilized the external pipelines, but our internal point economy and analytical math are actively deteriorating.

I have isolated three critical execution flaws directly mutating the task models and analytics aggregations. Right now, our Pomodoro service is permanently trapping tasks in completed states and actively breaking the W-Symbol's required visual feedback loops. Furthermore, our core ceiling capacity mathematics are fundamentally falsified by indiscriminately sweeping dead tasks into the calculation payloads.

Here is your next highly focused batch. Secure the Pomodoro execution states and analytical math before we proceed to the automated drafting sequences.

***

### BATCH 7
**Layer:** Priority 3 - Services & Integrations (Part 5)
**Domain:** Pomodoro Execution & Analytical Math Corruption

**2.**  **removePomodoro**  **Permanently Corrupts Task Points and State**   **File:**  src/services/taskService.ts
*   **The Spec:**  The Pomodoro system maps points directly to task completion dynamically. Removing a logged unit must mathematically revert the derived state.
*   **The Bug:**  While addPomodoro correctly calculates and updates pomodoro_points_earned, completion_percentage, and state, the removePomodoro function executes an incomplete SQL update: UPDATE task_assignments SET pomodoros_logged = MAX(0, pomodoros_logged - 1). It entirely fails to decrement the earned points or revert the COMPLETE/PARTIAL state. If a user accidentally taps [+] then [-], the task remains permanently locked at the inflated point value and completed state.

**3. Pomodoros Silently Fail to Render the W-Symbol**
*   **File:**  src/services/taskService.ts
*   **The Flaw:**  The UI specification requires the W-symbol to dynamically render partial completion states, which the TaskRow component reads directly from the completion_percentage column. In the addPomodoro function, the database UPDATE statement successfully increments pomodoros_logged, pomodoro_points_earned, and state, but entirely omits updating the completion_percentage column.
*   **The Consequence:**  Because the percentage remains static at 0, logging partial Pomodoros will never trigger the SVG path drawing animation. The visual feedback loop is broken until the user logs enough Pomodoros to snap the state entirely to COMPLETE.

**2. Ceiling Utilization Analytics Math Corruption**
*   **File:**  src/services/analyticsService.ts
*   **The Flaw:**  The core business logic explicitly dictates that only 'live' tasks (pending, partial, deferred) occupy ceiling space, while completed, missed, and delegated tasks release their allocation. However, in getCeilingUtilization, the daily_usage CTE calculates SUM(ta.assigned_points) indiscriminately for every task assignment on the list, regardless of its state.
*   **The Consequence:**  By improperly counting completed and missed tasks, the query massively inflates the mathematical ceiling load. This completely falsifies the avg_utilization_pct and the days_near_ceiling metrics, rendering the analytics dashboard structurally useless for capacity calibration.

***

Lock down these point calculations and state reversals. Are you ready for the Next Batch?