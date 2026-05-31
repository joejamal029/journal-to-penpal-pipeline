The math in our core engines might be secure now, but our execution and integration pipelines are actively sabotaging the workflow. We are moving up the stack to **Priority 3: Services & Integrations**.

I have isolated a highly destructive batch in the task execution and bulk services layer. These bugs are currently ignoring validation guards, destroying carefully backdated timelines, corrupting bulk operations, and crashing auto-draft sequences. Furthermore, our entire Reinforced Spaced Repetition (RSR) system is sitting as unlinked dead code. 

Here is your highly focused implementation batch. Fix the service layer before we even think about touching the UI.

***

### BATCH 4
**Layer:** Priority 3 - Services & Integrations
**Domain:** Task Execution, Bulk Services & Pomodoro Logging

**3. Pomodoro Logging Bypasses the Audit State Machine**  The specification requires strict tracking of "on-the-line" (deferred) tasks to monitor delayed execution. However, in src/services/taskService.ts, the addPomodoro function manually flips the task state to TaskState.COMPLETE via raw SQL when the points threshold is met. This entirely bypasses the isValidTransition guard in the state engine. Consequently, if a user finishes a DEFERRED task using a Pomodoro, it reverts to a standard COMPLETE state instead of the required DEFERRED_COMPLETE_SAME_DAY or LATER, destroying the audit trail and its semantic color-coding.

**2. Pomodoro Logging Silently Destroys Historic Backdated Timestamps**
*   **The Spec:**  The Pomodoro integration is explicitly defined as being "Useful for backdating: 'I did 2 pomodoros yesterday' → log 2, backdate".
*   **The Bug:**  In src/services/taskService.ts, the addPomodoro function uses the following logic to dictate timestamps: const completedAt = newState === TaskState.COMPLETE ? now : assignment.completed_at;. If a user creates a backdated task for yesterday and then logs their pomodoros for it, reaching the completion threshold will trigger this ternary operator and irreversibly overwrite their carefully backdated completed_at timestamp with the current now timestamp.

**2. "Fill Section Remaining" Bulk Action Bypasses User Selection and Multipliers**  The UI specification for bulk operations requires an "Assign ceiling remaining" feature that "auto-fills  **selected**  tasks to use available ceiling". Additionally, tasks are mathematically weighted using explicit multipliers. In src/services/bulkService.ts, the fillSectionRemaining function disregards the user's selected IDs and blindly queries and targets  *all*  PENDING assignments in the section. Furthermore, it distributes the remaining points through flat addition (assigned_points = assigned_points + adjustment), completely overwriting the task's original base_points and ignoring its configured multiplier weight.

**1. Orphaned Reinforced Spaced Repetition (RSR) Scheduling**  The blueprint specifies that tasks can have RSR enabled to automatically delegate them back to the W-List based on retention intervals. While the scheduleRSR function exists in src/services/rsrService.ts to initialize these decay curves, this function is never invoked anywhere in the codebase (e.g., during task creation in src/services/taskService.ts or when setting rsr_enabled: true in src/screens/PinkSlipManagerScreen.tsx). Because the rsr_schedule table is never populated, the RSR algorithm is effectively dead code and will never surface due tasks.

**2. Calendar Auto-Draft Integrity Crash**  In src/screens/NewListScreen.tsx, the daily list generator creates pseudo-assignments for calendar events that lack an explicit task_def_id by injecting an artificial ID like cal-${evt.id}. When the user attempts to commit the list, the system loops through the drafts and calls assignTaskToList. However, assignTaskToList in src/services/taskService.ts strictly queries the database for the definition and throws a fatal error (Task Definition not found) if it doesn't exist. This will completely crash list creation whenever unlinked calendar events are processed.

***

Lock down these integrations and ensure the services communicate properly with the database and engines. Are you ready for the Next Batch?