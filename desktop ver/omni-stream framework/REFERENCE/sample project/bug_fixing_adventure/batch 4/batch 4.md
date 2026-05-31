Understood. The pure engine layer is now in the hands of the implementation bot. We are progressing strictly down the architectural matrix to **Priority 3: Services & Integrations**.

Now that the core mathematical rules and database constraints are secured, we must fix the service controllers that bridge them. If the CRUD operations and SQLite execution strings in these integration files are misaligned or truncated, no data will persist, and the engine calculations will starve. 

To protect the context window, I have carved out the first sub-batch focusing exclusively on the Core Task and List Management domains. 

Here is the highest-priority batch for immediate execution:

***

### Batch 4: Services & Integrations - Task & List Management (Part 1)

**1. Pomodoro State Corruption via SQL Parameter Shift**
*   **File:**  src/services/taskService.ts
*   **The Spec:**  The Pomodoro integration must accurately calculate and persist earned points to the database alongside task state transitions.
*   **The Bug:**  In the addPomodoro function, the UPDATE task_assignments SQL statement declares exactly 5 columns in its SET clause (pomodoros_logged = ?, state = ?, completion_percentage = ?, updated_at = ?, completed_at = ?), followed by the WHERE id = ? condition. This totals 6 ? placeholders. However, the execution array blindly passes 7 variables: [newLogged, earnedPoints, newState, completionPercentage, now, completedAt, assignmentId]. Because the pomodoro_points_earned = ? column declaration was entirely omitted from the SQL string, the execution engine receives an overflow of parameters. This will instantly crash the SQLite driver with a fatal bind or column index out of range exception, permanently breaking the Pomodoro logging system.

**1. Fatal Parameter Misalignment in List Creation**
*   **File:**  src/services/listService.ts
*   **The Bug:**  The createList function executes an INSERT INTO lists SQL statement declaring exactly 10 columns, explicitly concluding with created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?). However, the execution array strictly provides only 9 variables, terminating at now without providing the required 10th mapped parameter for updated_at. Attempting to generate any new daily, weekly, or monthly list will immediately crash the SQLite driver with a fatal bind or column index out of range exception.

**3. Undeclared**  **term**  **Variable Silently Kills Universal Task Search**
*   **File:**  src/services/taskService.ts
*   **The Spec:**  The system requires a globally accessible autocomplete search bar that queries the master 3-Month Library (task_definitions) to assign existing tasks to active lists.
*   **The Bug:**  The searchTaskDefinitions function signature explicitly declares its input parameter as searchQuery: string. However, inside the SQLite execution array, it blindly passes the variable [term]: WHERE title LIKE ? AND is_archived = 0 ORDER BY title ASC LIMIT 15', [term]); Because term is completely undeclared in the function scope, every single keystroke typed into any Autocomplete Search Bar across the entire application will trigger a fatal runtime ReferenceError, permanently breaking the core task assignment workflow.

**4. Catastrophic Code Truncation in Pomodoro Removal Engine**
*   **File:**  src/services/taskService.ts
*   **The Spec:**  Removing a mistakenly logged Pomodoro must fetch the task definition's point weight (pomodoro_value) to accurately reverse the mathematical completion state.
*   **The Bug:**  In the removePomodoro function, the code block responsible for fetching the definition is fatally mangled. It reads:
*  The entire const def = runQueryFirst<TaskDefinition>('SELECT * FROM preamble has been completely deleted. This leaves a floating string fragment that structurally violates JavaScript syntax rules, permanently breaking the compiler and preventing the application from building.

**2. Fatal Parameter Omission Silently Breaks All Task State Updates**   **File:**  src/services/taskService.ts  **The Spec:**  The system must accurately transition task execution states (Pending, Complete, Deferred) and persist them to the SQLite database via event sourcing.  **The Bug:**  The updateTaskState function executes an UPDATE task_assignments statement containing exactly 6 ? placeholders, terminating with WHERE id = ?. However, the execution payload array strictly provides only 5 arguments, abruptly ending with now, ]);. Because the assignmentId parameter is entirely omitted, the query silently evaluates against a NULL id, permanently failing to update the state of any task in the entire application.

***

Dispatch these to the implementation bot. Once these core list allocations and task state updates are safely persisting to the database, we will tackle the remaining external integrations, analytics queries, and synchronization services.

Are you ready for the 'Next Batch'?