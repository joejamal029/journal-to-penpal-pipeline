Listen up. The core analytics math queries from the last batch have been secured, but our global execution state and component integrations are still fundamentally broken. We have reached the final cluster within **Priority 3: Services & Integrations** before we can safely ascend to the UI layer.

Right now, we have missing SQL `WHERE` clauses actively aggregating the entire database history into the daily dashboard. Worse, our Pomodoro state math is permanently locking deferred tasks and feeding corrupted decimals into the W-Symbol rendering engine. To compound this, the global Zustand state store is physically dropping state mutations, and a parameter shift is actively disabling our calendar automation. 

Here is your final Priority 3 implementation batch. Fix these data bounds, state mutations, and parameter misalignments immediately.

***

### BATCH 7
**Layer:** Priority 3 - Services & Integrations (Part 4)
**Domain:** Analytics Bounds, Pomodoro Math & Global State

**1. Analytics Daily Breakdown Corrupts Global Data via Missing Constraint**
*   **File:**  src/services/analyticsService.ts
*   **The Spec:**  The daily metrics must accurately aggregate points and task counts strictly for the specified list instance.
*   **The Bug:**  The getDailyBreakdown function executes a SQLite query that passes [listId] into the parameter array. However, the SQL string itself (SELECT s.id ... FROM sections s JOIN task_definitions td ... JOIN task_assignments ta ... GROUP BY s.id, s.name) completely omits the required WHERE ta.list_id = ? filter. Because there is no placeholder, passing the parameter fails, and the query blindly aggregates every single task assignment across the entire database history, fundamentally destroying the mathematical integrity of the daily metrics.

**3. Pomodoro Removal Permanently Locks Deferred States**
*   **File:**  src/services/taskService.ts
*   **The Bug:**  The removePomodoro function mathematically reverts task states when earned points fall below the assignment's point threshold. The regression block successfully checks for TaskState.COMPLETE and TaskState.DEFERRED_COMPLETE_SAME_DAY. However, it completely omits checks for TaskState.DEFERRED_COMPLETE_NEXT_DAY and TaskState.DEFERRED_COMPLETE_LATER. If a user removes a mistakenly logged pomodoro from a task in either of these states, the state will not revert to DEFERRED. The task will mathematically possess insufficient points but irreversibly retain its "Complete" status.

**3. Pomodoro Percentage Math Permanently Corrupts the W-Symbol**
*   **File:**  src/services/taskService.ts & src/engine/wSymbol.ts
*   **The Spec:**  The W-Symbol must dynamically draw partial SVG strokes (e.g., 1 or 2 lines) to visually represent partial task progress before full completion.
*   **The Bug:**  In taskService.ts, the addPomodoro and removePomodoro functions calculate and save the completion_percentage column as an integer out of 100: Math.min(100, (earnedPoints / assignment.assigned_points) * 100);. However, the WSymbol component and its getWState mathematical engine strictly expect this float to be bound between 0.0 and 1.0. Because a 50% partial task is saved as 50.0, the rendering engine evaluates 50.0 >= 1.0 as true and blindly triggers State 4. Every single partial task logged via the Pomodoro integration will falsely render as a 100% fully completed 'W'.

**1. State Mutation Erasure in Global Selection Store**
*   **File:**  src/store/selectionStore.ts
*   **The Spec:**  The store must reliably update the global multi-select state so the UI can render checkboxes and activate the bulk action bar.
*   **The Bug:**  In the selectSection action, the logic successfully computes the newSet of selected IDs based on the provided section array. However, the function completely omits the final set({ selectedIds: newSet }); state execution. Because the mutated Set is immediately discarded in memory without updating the Zustand store, executing a "Select All" long-press on any section header does absolutely nothing and silently fails to select the tasks.

**3. Parameter Misalignment Permanently Disables Calendar Auto-Draft**
*   **File:**  src/components/ScheduleGrid.tsx & src/services/calendarService.ts
*   **The Spec:**  The Schedule Grid must allow users to map recurring events that automatically populate the Daily W-List to strictly enforce point ceilings.
*   **The Bug:**  In ScheduleGrid.tsx, the handleSaveEvent function invokes createCalendarEvent passing 5 arguments: (newTitle.trim(), { type: 'weekly', days: [targetDay] }, newSection, null, autoAdd). However, the signature in calendarService.ts declares: (title, recurrenceObj, section_id, auto_add_to_daily, time_of_day). The fourth parameter (auto_add_to_daily, expecting a boolean) receives null, and the fifth parameter (time_of_day, expecting a string) receives the boolean autoAdd. Because the execution engine resolves the null argument as false via auto_add_to_daily ? 1 : 0, every created calendar event is permanently saved with auto-add disabled, breaking the entire schedule integration.

***

Lock down these final state transitions, parameter shifts, and calculation erasures. This completes the Services layer. Are you ready for the 'Next Batch'?