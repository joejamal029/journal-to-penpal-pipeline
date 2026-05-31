Listen up. I have reviewed the latest triage queue from the Group 5 backlog. Our database foundation is currently stable, meaning we skip Priority 1 and begin our triage directly at **Priority 2: Pure Engines**. 

We cannot process UI or Service failures when the underlying mathematical engines and state machine rules are actively fighting the master specification. To ensure the implementation bot does not suffer context degradation, I have carved out a strict sub-batch focusing exclusively on the Core State, Constraints, and Spaced Repetition algorithms.

Here is the single highest-priority batch for immediate execution. Do not alter, summarize, or hallucinate beyond these exact parameters.

***

### Batch 1: Priority 2: Pure Engines - Core State Machine, Constraints, & RSR

VIOLATION 3 — INVERTED RULE Spec Source: wlist_overview.md, Failure & Backlog Philosophy, "Manual corrections: States can be manually overridden (e.g., marking a missed task as complete with a reason)." File: src/engine/stateEngine.ts Spec Trace: The system is designed to gracefully handle failures and explicitly permits manual corrections to state machine rules. Users must be allowed to manually override a task marked as "missed" back into a "complete" status, logging the reason. Code Trace: The isValidTransition function strictly dictates allowed state machine pathways. It groups TaskState.MISSED together with other final end-states and unconditionally returns false to block any outgoing transition. When updateTaskState attempts the manual correction, it receives a false evaluation and throws an "Invalid state transition" error. Divergence: The code structurally forbids transitioning out of the MISSED state, rejecting the specific manual correction pathway demanded by the specification. Evidence:

VIOLATION 5 — WRONG IMPLEMENTATION Spec Source: wlist_integrations.md, 3. Reinforced Spaced Repetition (RSR), "The SM-2 algorithm, adapted for W-List task integration." File: src/engine/rsrEngine.ts Spec Trace: The system must enforce an adapted SM-2 spaced repetition algorithm for RSR scheduling. Progressive spacing dictates an initial interval (typically 1 day) for the first successful repetition, moving to a larger interval (typically 6 days) on the subsequent review. Code Trace: The calculateNextRsrInterval function executes the SM-2 logic when a passing quality score is received. Inside the repetition_count === 0 logic block, the code accurately assigns interval_days = 1; but immediately overwrites it with interval_days = 6; on the exact next line, unconditionally. Divergence: The implementation incorrectly skips the 1-day interval for the first repetition by immediately re-assigning the interval integer to 6. Evidence:

VIOLATION 5 — ORPHANED IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 4: Weekly List View, "MISC section rules: ... No subtasks by convention" File: src/engine/restrictionEngine.ts Spec Trace: The MISC section is strictly designated for lightweight, spontaneous tasks and explicitly forbids the appendage of subtasks. Code Trace: The system defines the validateMiscConstraints function within the restriction engine to structurally enforce this rule by returning false if subtaskCount > 0 for the 'misc' section ID. However, this function is completely orphaned; it is never imported or executed during assignment creation or subtask generation in src/services/taskService.ts. Divergence: The system provides the validation logic but permanently abandons it, allowing users to freely and illegally append subtasks to MISC assignments. Evidence:

***

Dispatch these logic failures to the implementation bot immediately. Once the core rules engine is respecting the specification, we will tackle the remaining Analytics math. 

Are you ready for the 'Next Batch'?