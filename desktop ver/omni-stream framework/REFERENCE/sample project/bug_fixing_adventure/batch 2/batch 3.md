The core engines are now mathematically sound. We are moving strictly up the stack to **Priority 3: Services & Integrations**. 

However, the sheer volume of catastrophic errors in our execution pipelines is staggering. We have hard SQL syntax failures, parameter shifts, and truncated strings actively destroying data before it can ever be persisted. Any UI workflow you build on top of this layer will instantly crash.

To prevent context window degradation, I am slicing the massive Services backlog into highly focused sub-batches. Here is your first Priority 3 package, targeting fatal SQL execution crashes.

***

### BATCH 3
**Layer:** Priority 3 - Services & Integrations (Part 1)
**Domain:** Core Task & Audit SQL Execution Crashes

**1. Weekly Audit SQL Parameter Mismatch Crash**  In src/services/weeklyAuditService.ts, the computeAndSaveWeeklyAudit function executes an INSERT INTO weekly_audit_summaries query. The SQL string defines 17 columns (starting with id) and provides exactly 17 placeholders (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?). However, the array of bound variables skips summary.id entirely, passing only 16 parameters starting with summary.week_list_id. This causes a catastrophic shift in data mapping and leaves the 17th placeholder undefined, triggering a fatal SQLITE_ERROR: bind or column index out of range whenever the weekly audit attempts to save.

**2. Backdate Completion SQL Syntax & Mapping Crash**  In src/services/taskService.ts, the backdateTaskCompletion function attempts to insert a synthetic historic assignment. The INSERT INTO task_assignments SQL string declares 11 columns but provides only 10 placeholders and a hardcoded integer 1: VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1). Despite this, the execution parameter array passes 11 variables: [id, listId, taskDefId, ... , 0, now, now, completedAt, 0]. Furthermore, the variables passed are entirely out of order (e.g., passing 0 for created_at, now for completed_at, and the ISO string completedAt for display_order). This will instantly crash with a SQLite parameter binding exception.

**1. List Creation SQL Bind Parameter Crash**   **File:**  src/services/listService.ts
*   **The Spec:**  The system must flawlessly construct new daily lists and persist them accurately.
*   **The Bug:**  In the createList function, the INSERT INTO lists query explicitly declares 9 columns (id, type, title, status, valid_from, valid_until, parent_list_id, notes, created_at) and provides 9 ? placeholders. However, the array of bound variables passed to the execution engine contains only 8 items: [id, input.type, input.title || null, ListStatus.ACTIVE, input.valid_until, input.parent_list_id || null, input.notes || null, now]. The input.valid_from parameter is entirely skipped. This misalignment will instantly crash list creation with a fatal SQLite Incorrect number of bindings supplied exception.

**1. Monthly Ceilings SQL Conflict Truncation (Database Crash)**
*   **File:**  src/services/monthlyService.ts
*   **The Spec:**  The monthly list governs the ceiling points for every section. The system must allow users to update these constraints seamlessly.
*   **The Bug:**  In the updateSectionCeiling function, the execute call contains a fatally truncated SQL string. It reads: ON CONFLICT(list_id, section_id) DO UPDATE SET ceiling_points =  and abruptly terminates the string before the closing backtick and parameter array on the next line. Because the assignment value (e.g., ? or excluded.ceiling_points) is completely missing, attempting to edit any section's ceiling will immediately trigger an unrecoverable SQLITE_ERROR: near ",": syntax error.

**3. Fatal SQL Truncation in Pink Slip Read Logging**   **File:**  src/services/pinkSlipService.ts
*   **The Spec:**  The Pink Slip system must log academic reading instances to track modular review dates.
*   **The Bug:**  The recordRead function contains a catastrophically truncated SQL INSERT statement. The execution string abruptly terminates at INSERT INTO pink_slip_reads (id, section_id, read_date, read_type, without ever providing the VALUES payload, the closing parenthesis, or the execution parameter array. The source code abruptly bleeds into logic intended for the Quarterly Registry ("${ListType.THREE_MONTH}" AND status = 'active' ORDER BY...). This is a hard syntax error that will permanently fail compilation.

***

Lock down these catastrophic SQL execution failures immediately so our persistence writes stop crashing. Are you ready for the Next Batch?