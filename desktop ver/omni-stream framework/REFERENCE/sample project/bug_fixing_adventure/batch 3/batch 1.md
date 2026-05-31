Listen up. The third compilation of bug reports has arrived, and it is clear we are still bleeding from the foundation up. As your Technical Project Manager and Triage Lead, I enforce strict architectural precedence: no downstream engine or UI fix matters if our database schema, foreign keys, and column constraints are actively crashing the execution pipeline. 

We are starting this group strictly at the bottom of the stack. The absolute highest priority batch targets **Priority 1: Database & Types**. I have isolated exactly five critical schema flaws, missing columns, and constraint violations that will instantly abort data ingestion and permanently sever our analytics tracking.

Focus your implementation exclusively on this exact batch to restore our foundational data integrity before we touch the downstream logic.

***

### BATCH 1
**Layer:** Priority 1 - Database & Types
**Domain:** Schema Definitions, Foreign Keys & Column Constraints

**5. Structural Schema Corruption in Miss Pattern Analytics**
*   **File:**  src/db/schema.sql
*   **The Spec:**  The schema must track miss logs mapped explicitly to task definitions to calculate the task half-life and frequency of failure.
*   **The Bug:**  The core schema definition for the miss_log table is structurally corrupted. Immediately after declaring the id TEXT PRIMARY KEY column, it skips directly to list_id, completely omitting the task_def_id TEXT NOT NULL column required to track which task actually failed. It also completely omits the updated_at TEXT NOT NULL column. Generating a database from this file will permanently crash the getMostMissedTasksForRange analytics engine with a fatal no such column: task_def_id SQLite error.

**2. Fatal SQLite Exception in Pink Slip Course Creation**
*   **File:**  src/services/pinkSlipService.ts & src/db/schema.sql
*   **The Spec:**  The system must securely map academic courses into the Pink Slip subsystem.
*   **The Bug:**  In addCourse, the execution payload explicitly attempts to insert into an 8th column: INSERT INTO pink_slip_courses (..., created_at, updated_at) VALUES (?, ..., ?, ?). However, the rigorous database initialization in schema.sql explicitly declares the pink_slip_courses table with only 7 columns, entirely omitting updated_at. Invoking this service will immediately trigger an unrecoverable SQLITE_ERROR: table pink_slip_courses has no column named updated_at exception and abort.

**3. Non-Existent Column Mismatch in Pink Slip Reads**
*   **File:**  src/services/pinkSlipService.ts & src/db/database.ts
*   **The Spec:**  The Pink Slip system must accurately log reading dates to feed the Reinforced Spaced Repetition engine.
*   **The Bug:**  The recordRead function executes an INSERT INTO pink_slip_reads query that explicitly attempts to write data into a created_at column. However, the strict SQLite schema initialization for the pink_slip_reads table explicitly lacks a created_at column definition entirely. Attempting to log any academic reading will instantly throw an unrecoverable SQLITE_ERROR: table pink_slip_reads has no column named created_at exception and abort the transaction.

**1. Foreign Key Constraint Crash in Historical Importer**
*   **File:**  src/services/historyService.ts & src/db/database.ts
*   **The Spec:**  The system must seamlessly import legacy physical W-List markdown records and accurately map them into the SQLite database.
*   **The Bug:**  In the importFromMarkdown parser, the sectionMap dictionary hardcodes section keys to evaluate as uppercase strings (e.g., 'SCHOOL': 'SCHOOL'). In the subsequent execution loop, it directly inserts this uppercase string into the task_definitions table via the t.section parameter. However, the global database seed explicitly initializes the master sections table with lowercase IDs (e.g., id: 'school'). Because SQLite enforces strict case-sensitivity on REFERENCES sections(id), attempting to import a markdown history file will instantly trigger a fatal SQLITE_CONSTRAINT_FOREIGNKEY crash and abort the ingestion.

**3. SQLite**  **NOT NULL**  **Constraint Crash on Yearly Goals**
*   **File:**  src/services/goalService.ts & src/db/database.ts
*   **The Spec:**  The system must accurately persist Yearly Goals into the SQLite database.
*   **The Bug:**  In database.ts, the initDB schema explicitly enforces the year_goals table with an updated_at TEXT NOT NULL column constraint. However, in goalService.ts, the createYearGoal function executes an INSERT INTO year_goals statement that strictly declares 8 columns (id, year, section_id, title, is_achieved, display_order, notes, created_at), completely omitting the required updated_at column. Attempting to add a Yearly Goal will instantly trigger a fatal SQLITE_CONSTRAINT_NOTNULL exception and abort the insertion.

***

Patch these initialization and schema faults immediately so the system can safely execute its database constraints. 

Are you ready for the 'Next Batch'?