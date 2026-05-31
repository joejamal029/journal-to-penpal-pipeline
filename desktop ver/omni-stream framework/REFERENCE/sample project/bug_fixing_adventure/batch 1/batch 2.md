Understood. We are not leaving the persistence layer yet. I have reviewed the remainder of the backlog, and we have a severe volume of silent database corruption, orphaned foreign keys, and malformed JSON payloads actively poisoning the application's memory. 

Before we touch a single line of the Core Engines (Priority 2), we must eliminate these data integrity bleed-outs. If the SQLite database is swallowing bad timestamps and dropping relational mappings, the engine will be calculating pure garbage. 

Here is your next highly focused batch.

***

### BATCH 2
**Layer:** Priority 1 - Database & Types
**Domain:** Data Persistence & Analytics Integrity

**3. Deferred Completion Semantic Colors Are Never Persisted**  The blueprint relies heavily on semantic color-coding, such as using blue ink to denote deferred tasks completed after the list is closed. While the schema and task models properly define a deferred_color column constrained to 'same_day', 'next_day', 'later', the updateTaskState function in src/services/taskService.ts completely neglects to update this field. When transitioning a task to DEFERRED_COMPLETE_NEXT_DAY or DEFERRED_COMPLETE_LATER, only the state and completed_at timestamps are updated. Because deferred_color remains permanently null, the UI's ability to render the correct historical colors is broken.

**1. Backdated Completions Break Monthly Frequency Analytics**
*   **The Spec:**  The blueprint dictates that backdating a task sets the completion to a past date and explicitly "recomputes frequency log". The monthly_frequency_log table is the source of truth that "Records when a task was last completed" to prioritize low-frequency tasks.
*   **The Bug:**  In src/services/taskService.ts, the backdateTaskCompletion function correctly creates a synthetic list and inserts a historic task_assignment. However, it completely fails to insert a corresponding row into the monthly_frequency_log table. Because the getTaskFrequencies engine relies  *strictly*  on a LEFT JOIN against monthly_frequency_log to determine "days since last completed", backdated tasks will permanently appear as "never done" or "stale", fundamentally breaking the system's low-frequency prioritization loop.

**3. Pink Slip Read Logs Are Permanently Orphaned from Task Assignments**
*   **The Spec:**  The Pink Slip system tracks modular readings and supports tracking "individual parts... showing their last date". To tie the reading logs to the execution layer, the database schema explicitly defines an assignment_id foreign key inside the pink_slip_reads table.
*   **The Bug:**  The execution layer completely fails to map this relationship. In src/services/pinkSlipService.ts, the recordRead function does not accept an assignment_id parameter and simply inserts NULL. Furthermore, the automatic Pink Slip triggers inside updateTaskState and addPomodoro only pass the pink_slip_ref string, dropping the context of the active task. As a result, assignment_id in pink_slip_reads is permanently null, making it impossible to audit which specific daily list assignment fulfilled a reading block.

**4. Weekly Audit "Section Stats" Saves Malformed Flat Arrays**
*   **The Spec:**  The weekly audit is required to capture the "Section breakdown | All above per section" and store the aggregated result as a JSON string in WeeklyAuditSummary.section_stats.
*   **The Bug:**  In src/services/weeklyAuditService.ts, the computeAndSaveWeeklyAudit function bypasses the pure engine's proper aggregation math and instead constructs the JSON payload by blindly executing JSON.stringify(dailyMetricsArray.flatMap(d => d.section_breakdown)). Instead of a clean dictionary of weekly totals per section, it injects a massive, unaggregated flat array of up to 56 isolated daily section logs (8 sections × 7 days) directly into the database, which will break downstream analytics parsing.

**3. Settings Time Input Silently Corrupts the Database**
*   **The Spec:**  Settings should securely persist valid data. Cron-like notification times (e.g., Morning RSR alerts) rely on strict HH:mm parsing.
*   **The Bug:**  In src/screens/SettingsScreen.tsx, the updateTimeSetting function attempts to validate input using a regex: if (!/^(?|2):$/.test(time)). If the user types an invalid time (like "08:a"), the code catches the failure but immediately executes settings.updateSetting(key, time); anyway before returning. Because updateSetting directly executes a SQLite UPDATE or INSERT, the malformed string is permanently written to the database. On the next app boot, the notification scheduler will parse this corrupted string, return NaN for the hours/minutes, and silently break the application's reminder system.

***

Implement these data persistence and relationship fixes to secure the database layer. Are you ready for the Next Batch?