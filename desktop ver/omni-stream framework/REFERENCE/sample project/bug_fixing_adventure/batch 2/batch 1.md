Listen up. The second compilation of bug reports has arrived, and the state of this codebase is completely unacceptable. We are starting over from the bedrock. As your Technical Project Manager and Triage Lead, I enforce strict architectural precedence: no downstream engine or UI fix matters if our persistence layer and type contracts are structurally compromised.

We are executing this strictly by architectural precedence. The absolute highest priority batch targets **Priority 1: Database & Types**. I have isolated five critical schema flaws, truncated SQL triggers, and missing TypeScript enums that are actively preventing the application from booting or permanently blocking valid state transitions. 

Focus your implementation exclusively on this exact batch to restore our foundational data integrity before we even look at the business logic.

***

### BATCH 1
**Layer:** Priority 1 - Database & Types
**Domain:** Database Initialization, Schema & Type Definitions

**5. Database Initialization Fatal SQL Syntax Errors**  In src/db/database.ts, the initDB function executes a hardcoded SQLite schema string to bootstrap the application. This payload contains two fatal syntax errors. First, the calendar_events table defines a column with an invalid data type: auto_add_to_daily BO OLEAN DEFAULT 1. Second, the miss_log table contains an illegal trailing comma directly preceding its closing parenthesis: miss_type TEXT CHECK(...)), );. Executing this raw string on app launch will trigger an unrecoverable SQLite syntax exception, preventing the database from constructing and crashing the entire application on boot.

**1. SQLite Schema**  **rsr_schedule**  **Column Crash**   **File:**  src/db/database.ts
*   **The Bug:**  In the initDB function, the hardcoded SQLite string attempts to create an index for the Spaced Repetition engine: CREATE INDEX IF NOT EXISTS idx_rsr_next ON rsr_schedule(next_review_date, is_active);. However, the table creation statement for rsr_schedule directly above it completely omits the is_active column definition. Booting the application will instantly trigger a fatal no such column: is_active SQLite exception and abort database creation.

**2. Truncated SQL Syntax in Event Sourcing Triggers**   **File:**  src/db/database.ts
*   **The Bug:**  The dynamic loop generating _after_update triggers for the Universal Data Bus contains a mangled SQL string. It executes INSERT INTO sync_log (id, table_name, record_id, operation, sync_status, created_at) 'pending', datetime('now'));. It completely misses the VALUES ( keyword and the first four required parameters (like the UUID generation, table name, and operation type). Attempting to update  *any*  row in the application will crash the local execution engine.

**3. Universal Data Bus Pull Crash on Missing Columns**   **File:**  src/services/syncService.ts
*   **The Spec:**  The Universal Data Bus must pull cloud payloads and apply them using a last-write-wins timestamp resolution strategy against local data.
*   **The Bug:**  In the applyRemoteEvent function, the engine queries the local table using: SELECT created_at, updated_at FROM ${table} WHERE id = ?. However, several tables actively registered in the sync array (e.g., rsr_schedule, calendar_events, year_goals, event_log)  **do not have an**  **updated_at**  **column**  defined in src/db/schema.sql. Whenever the cloud sync pulls an event for these tables, SQLite will instantly throw a fatal no such column: updated_at exception, permanently crashing the replication loop.

**4.**  **SubtaskState**  **Enum Permanently Blocks Completion**   **File:**  src/models/Enums.ts
*   **The Spec:**  The system must track subtasks defined inline, allowing them to be individually completed and recorded. The database schema correctly enforces this via CHECK(state IN ('pending','partial','complete','deferred','missed')).
*   **The Bug:**  The TypeScript domain model entirely omits the completion state. The SubtaskState enum explicitly defines PENDING, PARTIAL, DEFERRED, and MISSED, but completely lacks COMPLETE. Because of this omission, the application layer is physically incapable of typing, passing, or transitioning a subtask to a finished state without triggering a strict TypeScript compiler violation.

***

Patch these initialization and schema faults immediately so the system can safely construct its tables. Are you ready for the 'Next Batch'?