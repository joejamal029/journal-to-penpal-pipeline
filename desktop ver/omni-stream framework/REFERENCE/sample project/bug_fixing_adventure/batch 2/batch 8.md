Listen up. Your previous patches locked down the point calculations, but our automated drafting and bulk execution pipelines in the Service layer are actively bypassing those constraints. We have one final, critical cluster in **Priority 3: Services & Integrations** before we can safely pivot to the UI layer.

Right now, bulk operations are creating orphaned data, and our automated schedule generators are illegally bypassing the mathematical ceilings by forcing `NaN` values and hijacking sections into the uncapped MISC domain. 

Here is your final Priority 3 batch. Fix these pipelines so the automated drafting sequences actually respect the constraints.

***

### BATCH 8
**Layer:** Priority 3 - Services & Integrations (Part 6)
**Domain:** Bulk Operations & Automated Drafting Pipelines

**4. Bulk RSR Assignment Orphans Scheduling Data**
*   **File:**  src/services/bulkService.ts
*   **The Flaw:**  The system allows rapid bulk assignment of attributes, including toggling RSR. When a user executes handleBulkRsr, the bulkUpdateTasks function translates this by flipping the rsr_enabled = 1 boolean in the task_definitions table.
*   **The Consequence:**  Unlike single-task creation, the bulk service completely fails to invoke the scheduleRSR() initialization function. Because the corresponding rsr_schedule rows are never generated in the database, the SM-2 spaced repetition engine will permanently ignore these tasks, despite the UI falsely displaying them as RSR-enabled.

**5. Calendar Auto-Draft Section Hijacking**
*   **File:**  src/services/taskService.ts
*   **The Flaw:**  When the system auto-drafts daily schedules, it assigns pseudo-IDs (e.g., cal-123) which assignTaskToList must resolve by injecting a synthetic task definition into the database. The SQL INSERT statement for this synthetic definition completely hardcodes the section as 'misc': VALUES (?, ?, ?, 'task', 1.0, 1.0, ?, ?) executing with [taskDefId, ..., 'misc', ...].
*   **The Consequence:**  Even if the underlying calendar event was strictly mapped to school and evaluated against the school ceiling during drafting, the moment it is committed to the database, its structural identity is hijacked into misc. Because the MISC section explicitly has "No ceiling constraint", this silently exempts all scheduled events from future mathematical capacity checks.

**3. RSR Auto-Add**  **NaN**  **Point Corruption Bypasses Ceilings**
*   **File:**  src/services/rsrService.ts & src/screens/NewListScreen.tsx
*   **The Spec:**  The daily list drafting engine must rigorously enforce point ceilings, even when auto-adding due RSR tasks.
*   **The Bug:**  In rsrService.ts, the getDueRsrItems SQL query explicitly omits td.multiplier from its SELECT statement. Consequently, when handleAutoAddRSR in NewListScreen.tsx attempts to calculate the task's weight (const proposed = taskDef.base_points * taskDef.multiplier;), it multiplies by undefined, resulting in NaN. When NaN is passed into the canAddTask ceiling engine, NaN > availableCeiling evaluates to false, illegally bypassing the mathematical constraint. The task is then saved to the SQLite database with assigned_points set to NaN, severely corrupting the list's point economy.

***

Lock down these automated service pipelines. Are you ready for the Next Batch?