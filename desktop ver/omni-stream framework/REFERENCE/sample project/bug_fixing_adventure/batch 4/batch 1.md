Listen up. We are bleeding technical debt, and the current codebase is structurally compromised. I have reviewed your compiled master list of failures, and we are not tackling this haphazardly. We are triaging with strict architectural precedence. We fix the foundation first, or the downstream services and UI layers will continue to collapse under the weight of these exceptions.

To protect the context window of the implementation bot, batch sizes are strictly capped at a maximum of 5 bugs. 

We begin with **Priority 1: Database & Types**. These schema constraints, missing triggers, and severed data models are fatal at compile-time and application initialization. Here is the single highest-priority batch for immediate execution.

***

### Batch 1: Database & Types - Core Schema, Constraints, and Domain Models

**3. Fatal TypeScript Truncation in Analytics Domain Model**
*   **File:**  src/models/Analytics.ts
*   **The Spec:**  The system must correctly type the analytics data models, specifically the TaskHalfLife object used to calculate days from completion to the next miss.
*   **The Bug:**  The interface declaration for the TaskHalfLife object is catastrophically severed. The file jumps directly from the closing brace of the OverrideFrequencyReport interface into raw, floating properties: task_def_id: string; title: string;. The required export interface TaskHalfLife { signature is entirely deleted. This is a severe, structural syntax violation that globally breaks the TypeScript compiler and permanently prevents the application from building.

**2.**  **NOT NULL**  **Constraint Crash on RSR Activation**
*   **File:**  src/services/rsrService.ts & src/db/database.ts
*   **The Bug:**  The global schema initialization in database.ts strictly enforces the rsr_schedule table with an updated_at TEXT NOT NULL column constraint. However, inside scheduleRSR, the SQL execution string strictly declares exactly 9 columns (id, task_def_id, pink_slip_section_id, interval_days, next_review_date, ease_factor, repetition_count, is_active, created_at). Because the required updated_at parameter is completely omitted from the payload, attempting to enable Spaced Repetition for any task will immediately abort the transaction with a fatal SQLITE_CONSTRAINT_NOTNULL exception.

**1. Fatal JavaScript Syntax Error in SQLite Trigger Generation**
*   **File:**  src/db/database.ts
*   **The Spec:**  The system must intercept SQLite transactions via triggers to generate an event sourcing log for the Universal Data Bus.
*   **The Bug:**  Inside the initDB iteration loop, the block generating the DELETE trigger is structurally destroyed. Immediately following the // Delete Trigger comment, the code drops directly into raw SQL syntax (CREATE TRIGGER IF NOT EXISTS ${table}_after_delete...). It completely lacks the encapsulating execution wrapper db.execSync(`. This unescaped SQL will trigger a catastrophic JavaScript compilation error and permanently prevent the database from initializing.

**2.**  **NOT NULL**  **Constraint Crash in Auto-Subtask Generation**
*   **File:**  src/services/taskService.ts & src/db/database.ts
*   **The Spec:**  The W-List strictly tracks individual subtask parts assigned explicitly mapped scores.
*   **The Bug:**  The createSubtaskAssignment engine executes an INSERT INTO subtask_assignments query specifying exactly 7 columns (id, parent_assignment_id, title, points, display_order, state, created_at). However, the core database schema strictly enforces an updated_at TEXT NOT NULL column constraint on the subtask_assignments table. Whenever the system attempts to auto-generate subtasks during a list assignment, the SQLite driver will instantly throw an SQLITE_CONSTRAINT_NOTNULL exception and abort the entire list creation payload.

**4.**  **NOT NULL**  **Constraint Crash on New User Settings**
*   **File:**  src/store/settingsStore.ts & src/db/database.ts
*   **The Spec:**  The system must securely persist global user settings (such as notification toggles and ceiling configurations) to the local SQLite database.
*   **The Bug:**  The core schema initialization in database.ts strictly enforces the settings table with a created_at TEXT NOT NULL column constraint. However, inside the updateSetting fallback block in settingsStore.ts, the insertion statement is written as: INSERT INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?). Because the required created_at column is completely omitted from the payload, attempting to modify any uninitialized setting will instantly trigger an unrecoverable SQLITE_CONSTRAINT_NOTNULL exception and abort the save.

***

Get these dispatched to the implementation bot. Once the database foundation is physically stable, we will move up the stack to the core engine math. 

Are you ready for the 'Next Batch'?