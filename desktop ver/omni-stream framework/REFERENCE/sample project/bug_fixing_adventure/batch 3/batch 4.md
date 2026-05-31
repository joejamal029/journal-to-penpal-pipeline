Listen up. We have secured the compiler and the persistence layer, but our execution pipelines in the Service layer are completely severed. I am holding us strictly at **Priority 3: Services & Integrations**.

A ruthless audit of the remaining logs exposes a catastrophic wave of fatal SQL truncations and undeclared variables actively crashing our core assignment, historic import, and calendar creation pipelines. These are hard runtime exceptions. Any UI workflow wired to these endpoints will instantly crash the application.

I have isolated these five critical execution failures into a high-density sub-batch. Fix these immediately so our database writes actually construct valid statements.

***

### BATCH 4
**Layer:** Priority 3 - Services & Integrations (Part 1)
**Domain:** Fatal Service Execution Crashes (Reference Errors & SQL Truncations)

**1. Undeclared**  **notes**  **Variable in Yearly Goal Creation**
*   **File:**  src/services/goalService.ts
*   **The Bug:**  The createYearGoal function signature explicitly defines only three parameters: (year: number, section_id: string, title: string). However, in the subsequent execution block, it attempts to pass a variable named notes directly into the SQLite parameter array: [id, year, section_id, title, nextOrder, notes || null, now]. Because notes is completely undeclared in the function scope and never passed as an argument, attempting to save any yearly aspiration will instantly throw a fatal ReferenceError and crash the application.

**2. Undeclared**  **task_def_id**  **Crashes Calendar Event Creation**
*   **File:**  src/services/calendarService.ts
*   **The Bug:**  The createCalendarEvent function is responsible for inserting new external schedules into the database. Its parameter signature is strictly defined as (title: string, recurrenceObj: CalendarRecurrence, section_id: SectionId | string | null = null, auto_add_to_daily: boolean = true, time_of_day: string | null = null). Despite this, the inner execute payload array blindly references task_def_id as the fourth parameter. Since this variable is neither passed as an argument nor initialized locally, creating any calendar event will trigger an immediate runtime ReferenceError and abort the insertion.

**4. Fatal SQL Truncation in Historic Data Importer**
*   **File:**  src/services/historyService.ts
*   **The Bug:**  The importFromMarkdown function is designed to seed legacy W-List physical data into the SQLite schema. In the loop generating historical assignments, the execute SQL string is fatally truncated. It begins abruptly with assigned_points, pomodoro_points_earned, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?). It completely omits the fundamental INSERT INTO task_assignments (id, list_id, task_def_id, state, preamble. Executing a markdown import will trigger an unrecoverable SQLite syntax exception and permanently fail the data ingestion.

**1. Fatal**  **INSERT**  **Truncation in Task Assignment Execution**
*   **File:**  src/services/taskService.ts
*   **The Spec:**  The system must accurately assign task definitions to active daily lists following strict constraint evaluations.
*   **The Bug:**  Inside the assignTaskToList function, the core SQLite execute block is fatally truncated. The SQL payload begins blindly with id, list_id, task_def_id, assigned_points and completely omits the required INSERT INTO task_assignments ( preamble. Attempting to assign any task to a daily list will immediately throw an unrecoverable SQLite syntax error and abort the assignment transaction.

**2. Fatal SQL Truncation in Backdate Execution**
*   **File:**  src/services/taskService.ts
*   **The Spec:**  The system must allow users to log task completions after the fact, persisting them correctly into synthetic historical lists.
*   **The Bug:**  In the backdateTaskCompletion function, the execute block for inserting a synthetic task assignment is fatally truncated. The SQL statement string abruptly begins with state, created_at, updated_at, completed_at, display_order, is_backdated ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1). It entirely omits the fundamental INSERT INTO task_assignments (id, list_id, task_def_id, assigned_points, pomodoro_points_earned, preamble. Attempting to backdate any task will immediately trigger an unrecoverable SQLite syntax exception and crash the execution engine.

***

Lock down these catastrophic service execution failures immediately. Are you ready for the 'Next Batch'?