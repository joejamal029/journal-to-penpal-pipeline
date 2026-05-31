Excellent execution. By deploying Batch 6 before Batch 5, you correctly secured the underlying data pipeline before mounting the dependent UI. That is the exact ruthless architectural precedence I expect.

Now that the Priority 3 integrations are locked down, we are returning to the top of the stack: **Priority 4: UI & Components**. 

While Batch 5 addresses the visual rendering crashes, I have compiled your next highly focused package. This batch targets severe state desyncs and reference errors actively breaking the core screen workflows. If these remain unpatched, the UI will actively bypass our mathematical constraints, silently corrupt data during bulk updates, or completely crash the application during navigation.

Here is your next highly focused implementation batch.

***

### BATCH 7
**Layer:** Priority 4 - UI & Components
**Domain:** Screen Workflows & State Desyncs

**1. Calendar Auto-Drafting Ceiling Bypass**
*   **The Spec:**  The point ceiling constraint is a hard rule that cascades down to every assignment to ensure users never overcommit ("Tasks are assigned with the constraint of the total number of points... to ensure that the total points in 2 lists do not exceed the ceiling point").
*   **The Bug:**  In src/screens/NewListScreen.tsx, the auto-drafting loop for calendar events checks the ceiling using canAddTask(cost, draftSectionPts, Math.max(0, limit - trail)). To simulate the deduction of points as multiple events are processed, the developer added cMapWorking[sec] -= cost;. However, cMapWorking is  **never passed**  into the canAddTask function. Furthermore, draftSectionPts is calculated from the React state draftTasks, which does not update synchronously during the loop. As a result, the ceiling check evaluates against a static 0 points used for every iteration, allowing the system to blindly auto-draft an infinite number of calendar events and massively exceed the monthly ceiling.

**2. Zero-Completion Restriction Evaporates on List Close**
*   **The Spec:**  The "intentional friction" rule dictates that "A task that received zero work [on the audited list] is forbidden from being on the new list except it is absolutely necessary... [requiring] an override."
*   **The Bug:**  In src/screens/NewListScreen.tsx, the engine enforces this restriction by fetching the prior list using status = "audited". However, audited lists automatically transition to status = "closed" after the 24-hour deferred resolution window expires (handled in src/services/auditService.ts). If a user simply waits 24 hours for the audited list to close, the query in NewListScreen will return undefined, the prevAssignment check will be bypassed entirely, and the user can freely re-add the missed task without providing any strategic override reason, fundamentally breaking the behavioral loop.

**4. Bulk Action State Desync and Phantom Executions**
*   **The Spec:**  The system must support rapid "Bulk assignment of scores, sections, tags" safely via the floating selection bar.
*   **The Bug:**  In src/components/BulkActionBar.tsx, the execution handlers (like handleBulkState, handleBulkPoints, etc.) map over selectedIds from the useSelectionStore, send the SQLite update, and trigger onOperationComplete(). However, they entirely fail to invoke clearSelection() or exitSelectionMode(). Because the selection store is a global state manager, the selectedIds Set retains the IDs of the modified tasks. If the user taps another bulk action, the system will blindly execute SQLite updates against those stale, hidden IDs again, leading to severe, silent data corruption.

**4. Pink Slip Bulk W-List Assignment Crash**  In src/screens/PinkSlipManagerScreen.tsx, the handleBulkAddToWList function iterates through a flat array of PinkSlipSectionAnalytics objects to convert them into W-List tasks. Inside this loop, it attempts to generate the task title using an undeclared variable: ${course?.course_code || 'PS'}: ${section.title}. Because the parent course object is never fetched or defined within that specific loop's scope, executing this bulk action will trigger a ReferenceError.

**5. Quarterly Registry Initialization Crash**  In src/screens/QuarterlyScreen.tsx, the loadData function is responsible for loading the 3-month library data by invoking getActiveQuarterlyList(). However, getActiveQuarterlyList is never actually imported into the file from src/services/quarterlyService.ts. The moment a user navigates to the Quarterly registry, the application will throw a ReferenceError and crash.

***

Patch these critical workflow and state management flaws within the UI components. Are you ready for the Next Batch?