Listen up. Your patches secured the first wave of service execution failures, but our integration layer is still violently unstable. We are remaining strictly within **Priority 3: Services & Integrations**. 

A secondary sweep of our core business pipelines reveals lingering `ReferenceErrors`, catastrophic parameter shifts, and omitted arrays that are actively crashing the cloud sync, destroying delegation lineages, and silently deleting tasks from the Weekly browser. If we do not patch these execution pipelines, any UI we build on top will either crash or render falsified data.

Here is your next highly focused implementation batch. Fix these fatal execution crashes and data erasures immediately.

***

### BATCH 5
**Layer:** Priority 3 - Services & Integrations (Part 2)
**Domain:** Fatal Service Execution Crashes & Data Erasure

**4. Fatal ReferenceError in Cloud Sync Push Execution**
*   **File:**  src/services/syncService.ts
*   **The Spec:**  The Universal Data Bus must package local SQLite event logs into JSON bundles and push them to the Microsoft Graph API.
*   **The Bug:**  Inside the push function, the logic generates a timestamp via const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-');. However, in the very next block, the HTTP PUT request executes using an undeclared variable: fetch(${GRAPH_BASE}${SYNC_FOLDER}/${filename}:/content, ...). Because the filename variable is never declared, initialized, or constructed in the execution scope, initiating a push sync will immediately crash the replication loop with a ReferenceError: filename is not defined.

**2. Parameter Shift and Missing Value in Task Assignment**
*   **File:**  src/services/taskService.ts
*   **The Spec:**  The system must flawlessly persist task assignments into the active daily list, preserving the priority taxonomy dictated by the 3-Month Library.
*   **The Bug:**  The assignTaskToList function executes an INSERT INTO task_assignments statement declaring exactly 12 columns, including priority and state. However, the execution array provides only 11 variables, entirely omitting the priority parameter from the payload. Because the array jumps directly from input.display_order to TaskState.PENDING, all subsequent parameters are misaligned and shifted left. The final ? placeholder receives undefined, which will instantly crash the execution engine with a fatal SQLITE_ERROR: bind or column index out of range.

**2. Undeclared adjustment Variable in Bulk Ceiling Auto-Fill**
*   **File:**  src/services/bulkService.ts
*   **The Bug:**  The fillSectionRemaining function is designed to distribute unused ceiling points across pending tasks. Inside the loop, it calculates the weight of each task, but then executes an UPDATE task_assignments statement, blindly passing an undeclared variable named adjustment into the execution array: [adjustment, now, a.id]. Because adjustment is never calculated or defined in the function's scope, attempting to run this bulk operation will trigger a fatal ReferenceError and abort the transaction.

**4. Delegation Lineage Erasure & SQL Table Space Typo**
*   **File:**  src/services/taskService.ts
*   **The Bug:**  In the delegateTask function, two fatal errors occur. First, the engine queries the monthly ceiling using a malformed SQL string with a space inside the table name: FROM section_ceili ngs sc, which will instantly trigger a no such table SQLite exception. Second, when inserting the delegated assignment into tomorrow's list, the query maps the original assignmentId to the deferred_from_assignment_id column instead of the delegated_assignment_id column required by the spec. This permanently destroys the delegation tracking lineage and falsely pollutes the deferred task analytics.

**5. Omitted 'Other' Priority Array Silently Deletes Tasks**
*   **File:**  src/services/weeklyService.ts
*   **The Spec:**  The Weekly List explicitly requires tasks to be grouped and ordered by three priority levels: Urgent, Mild, and Other.
*   **The Bug:**  When constructing the WeeklySectionGroup mapping object in fetchWeeklyListData, the property declaration for other: secAssignments.filter(...) is entirely omitted. Consequently, when WeeklyListScreen attempts to render the 'OTHER' priority group, the array evaluates to undefined. The UI gracefully swallows the null return, meaning all tasks correctly categorized as 'Other' priority are permanently rendered invisible in the Weekly browser.

***

Lock down these critical service pipelines before we move on to the analytics data layer. Are you ready for the 'Next Batch'?