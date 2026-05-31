Listen up. As your Triage Lead and Technical Project Manager, I have reviewed the compiled bug reports. Our architecture is currently bleeding from the ground up. Any downstream UI fixes are utterly meaningless if our persistence layer is crashing from malformed queries and schema mismatches. We are tackling this codebase strictly by architectural precedence. 

Here is the absolute highest priority batch. We are hitting the **Priority 1: Database & Types** layer first. Specifically, I have isolated a batch intersecting with the **History Import & Core Task Initialization** domains. These specific bugs contain broken `INSERT` statements that trigger fatal SQLite exceptions or ReferenceErrors, completely breaking our data integrity.

I am enforcing strict batch sizing to prevent context window degradation. Focus solely on these three critical schema and persistence failures before we even look at the engines.

***

### BATCH 1
**Layer:** Priority 1 - Database & Types
**Domain:** History Import & Task Initialization

**5. History Service SQLite Column Typo**  The src/services/historyService.ts module is responsible for generating synthetic lists for historical data import. When seeding the default section ceilings for these synthetic lists, it executes an INSERT INTO section_ceilings (id, list_id, section_id, ceiling_value). However, the database schema defined in src/db/schema.sql explicitly names this column ceiling_points. This syntax mismatch will cause a fatal SQLite exception whenever the user attempts to import legacy Markdown logs.

**5. Historic Markdown Import Triggers SQLite Exception**
*   **The Bug:**  The specification requires the ability to populate legacy physical W-List data (e.g., January 2026). In src/services/historyService.ts, the importFromMarkdown fallback executes an INSERT INTO task_assignments and a subsequent UPDATE, explicitly targeting a column named earned_points. However, the actual database schema (src/db/schema.sql) does not contain an earned_points column inside the task_assignments table (it relies on pomodoro_points_earned or completion_percentage). Executing a legacy import will trigger a fatal SQLite syntax error and permanently fail.

**1. Undeclared**  **now**  **Variable in Task Creation**
*   **The Bug:**  In src/services/taskService.ts, the createTaskDef function executes an INSERT INTO task_definitions statement and attempts to set the created_at and updated_at columns using a variable named now. However, const now = new Date().toISOString(); is never declared anywhere within the function's scope. Attempting to create any new task definition (from the Library or New List screen) will immediately crash the application with a ReferenceError.

***

Implement these fixes against the schema immediately. Are you ready for the Next Batch?