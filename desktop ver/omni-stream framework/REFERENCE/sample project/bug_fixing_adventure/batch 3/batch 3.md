Listen up. Your previous patches successfully secured the remaining database constraints and the bulk of the engine syntax failures, but our audit is not complete. A deeper sweep revealed one final, insidious mathematical corruption lingering in our **Priority 2: Pure Engines** layer. 

Simultaneously, as we transition up the stack into **Priority 3: Services & Integrations**, we have hit a catastrophic wall of TypeScript compiler crashes. We have unclosed type signatures, severed variable declarations, and floating return statements that are completely destroying the build pipeline. We cannot evaluate external integrations or UI logic if the service layer physically refuses to compile.

I have grouped the final Priority 2 math flaw with the most fatal Priority 3 compiler crashes into a strict, maximum-density batch. Fix these immediately to restore our build integrity before we address the SQL logic.

***

### BATCH 3
**Layer:** Priority 2 & Priority 3 (Pure Engines & Services)
**Domain:** Analytics Math & Service Compiler Crashes

**4. Weekly Earned Points Math Corruption**
*   **File:**  src/engine/analytics.ts
*   **The Spec:**  The analytics engine must correctly calculate the "worst section" across the week by evaluating the true ratio of earned points to possible points.
*   **The Bug:**  In the computeWeeklyMetrics engine, the worst_section calculation aggregates data across days via a sectionAgg dictionary loop. In the if (existing) block, it successfully accumulates existing.possible += sb.points_possible; but entirely omits the corresponding existing.earned += sb.points_earned; mathematical addition. This permanently deflates the earned points to only represent the first active day, while possible points accrue all week, fundamentally falsifying the worst section metric.

**1. Fatal Function Signature Truncation in Bulk Service**
*   **File:**  src/services/bulkService.ts
*   **The Bug:**  The primary execution function for batch actions, bulkUpdateTasks, contains a completely unclosed TypeScript signature. The parameter definition abruptly ends at rsr_enabled?: boolean without ever providing the closing }) => { braces to open the function body. The code bleeds directly into const now = new Date().toISOString();. This is a fatal syntax violation that breaks the compiler and prevents the entire bulk execution layer from loading.

**5. Illegal Floating Return Statement Breaks Compilation**
*   **File:**  src/services/weeklyAuditService.ts
*   **The Spec:**  The data retrieval layer must accurately query the weekly_audit_summaries table to pull previous audit records for macro-analytics.
*   **The Bug:**  Directly beneath the // ── Retrieve comment block, the code executes a raw return runQueryFirst<WeeklyAuditSummary>(...); }. The entire required TypeScript function signature, name, parameter list, and opening bracket (e.g., export function getWeeklyAuditByDate(weekStart: string) {) have been completely deleted. Because this return statement is floating illegally in the global module scope, it triggers an immediate structural syntax error and breaks the application build.

**4. Catastrophic Signature Bleed in RSR Engine**
*   **File:**  src/services/rsrService.ts
*   **The Spec:**  The RSR engine must query active spaced repetition schedules to auto-add due items to the daily list.
*   **The Bug:**  The getDueRsrItems function contains a completely unclosed generic type signature that breaks the TypeScript compiler. It reads return runQuery<RSRSchedule & { title: string, section_id: string, base_points: and directly bleeds into the raw SQL string SELECT rsr.*, td.title.... It completely omits the closing }> brackets and the opening backtick ` required to encapsulate the SQLite query. This is a hard structural failure that prevents the application build.

**2. Catastrophic Truncation in Pink Slip State Resolution**
*   **File:**  src/services/taskService.ts
*   **The Spec:**  Completing a task synced to a Pink Slip module must dynamically update the academic reading log.
*   **The Bug:**  Inside the updateTaskState function, the execution block designed to fetch the pink_slip_ref is fatally mangled. The code abruptly starts with: FROM task_definitions WHERE id = ?', [assignment.task_def_id]);. The entire variable declaration, execution wrapper, and the SELECT SQL preamble (e.g., const td = runQueryFirst<{pink_slip_ref: string}>('SELECT pink_slip_ref...) are completely deleted. This structural syntax violation will permanently break the TypeScript compiler and prevent the application from building.

***

Crush these remaining math and compiler failures immediately. Are you ready for the 'Next Batch'?