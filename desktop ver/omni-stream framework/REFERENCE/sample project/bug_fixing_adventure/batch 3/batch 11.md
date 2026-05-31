Listen up. We have finally cleared the compiler crashes and hook failures that were physically preventing the application from running. We are now in the final stretch of **Priority 4: UI & Components**, focusing strictly on the components that are actively betraying the user.

A final sweep of the third compilation reveals five remaining catastrophic workflow failures. These are not just visual bugs—these are dead UI stubs that completely silence user actions, and components that actively orphan their own database schemas or pollute the master library with permanent duplicates. 

If a user taps "Share" and nothing happens, or if they quick-add a task and it vanishes into the void, the application is functionally broken. Worse, our Pink Slip bulk-assign is currently acting as a data replication virus.

Here is your next highly focused implementation batch. Fix these orphaned schemas and dead stubs immediately.

***

### BATCH 11
**Layer:** Priority 4 - UI & Components (Part 4)
**Domain:** Dead Stubs, Orphaned Schema & UI Data Pollution

**2. Subtask UI Completely Orphans the Database Schema**
*   **File:**  src/components/TaskRow.tsx
*   **The Bug:**  The system specification mandates tracking individual subtask parts and assigning them relevant scores. The database schema explicitly supports this via the subtask_assignments table. However, the TaskRow component entirely bypasses this table. Instead, it extracts subtasks by executing a static regex against the parent title string (const match = assignment.def_title.match(/\^ \[([^\]]+)\]/);) and renders them as lifeless text strings. Users are physically prevented from interacting with, completing, or assigning points to subtasks, rendering the SubtaskState enum completely useless.

**4. Weekly Share Button Execution is a Silenced Stub**
*   **File:**  src/screens/AnalyticsDashboardScreen.tsx
*   **The Bug:**  The UI includes a "SHARE WEEKLY ->" trigger meant to export the Weekly Audit Report. The onShareWeekly callback correctly calculates the 7-day range and executes const report = generateWeeklyReport(...). However, the function block abruptly terminates immediately after storing the string in memory. Because it completely fails to invoke the shareReport() service, tapping the share button executes silently and fails to trigger the device's native share sheet.

**5. Pink Slip Bulk-Add Pollutes 3-Month Library with Duplicates**
*   **File:**  src/screens/PinkSlipManagerScreen.tsx
*   **The Bug:**  The system allows bulk-assigning academic Pink Slip readings to the active W-List. When handleBulkAddToWList executes, the engine loops over selected sections and unconditionally invokes const def = createTaskDef(...) for every item. It completely fails to query the task_definitions table to check if a definition with the matching pink_slip_ref already exists. Consequently, if a user bulk-assigns their readings twice in the same semester, the system blindly generates permanent, duplicated task definitions in the master 3-Month Library, corrupting the database.

**5. Weekly List MISC Quick-Add is a Dead UI Stub**
*   **File:**  src/screens/WeeklyListScreen.tsx
*   **The Spec:**  The MISC section rules explicitly mandate a "Quick-add interface: lightweight, spontaneous, urgent tasks".
*   **The Bug:**  The <TextInput> designed to accept these quick-add tasks executes an entirely empty workflow: onSubmitEditing={() => setMiscInput('')}. It successfully clears the text input from the screen but completely fails to invoke any database service (like createTaskDef or assignTaskToList) or update the application state. The input is silently erased, making it physically impossible for users to add MISC tasks to their Weekly browser.

**2. Quarterly Registry Initialization is a Dead UI Stub**
*   **File:**  src/screens/QuarterlyScreen.tsx
*   **The Spec:**  The 3-Month/Quarterly list must be initialized by migrating active tasks from the master task definitions library into the quarterly execution window.
*   **The Bug:**  The empty-state UI provides an "Initialize Q{quarter} Assignments" button intended to bootstrap the quarter. However, the execution payload is completely hardcoded to a dead stub: onPress={() => Alert.alert('Action', 'Trigger Definition Migration mapping to DB...')}. It completely fails to invoke the migrateLibraryToQuarterly service function. Users are physically trapped on this screen and permanently prevented from initializing their Quarterly W-List.

***

Wire these execution handlers and schemas immediately so the interface genuinely drives the underlying engines. 

Are you ready for the 'Next Batch'?