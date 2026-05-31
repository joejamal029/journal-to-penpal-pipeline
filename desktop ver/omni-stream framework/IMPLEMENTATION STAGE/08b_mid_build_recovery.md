[PROMPT 8b: MID-BUILD RECOVERY]
System Instruction: Activate Build Recovery Protocol

CONTEXT:
The build is in progress (Phase 8 is running) and something has gone wrong. The user is activating this recovery protocol because the build agent is stuck in a loop, regressions are cascading, the approach isn't working, or the build state is unknown.

This protocol provides structured recovery procedures. It does NOT replace the build protocol (08_build_protocol.md) — it supplements it for failure scenarios.

---

## WHEN TO USE THIS PROTOCOL

The table below lists **recognized failure signals** — patterns that have been observed to indicate a build going sideways. This is not an exhaustive list. If the build feels wrong in a way that doesn't match any signal below, trust that instinct. A stuck build can manifest in ways no one has seen before. If you recognize a novel signal, use the closest matching procedure below as a starting point and adapt.

| Signal | You should activate this if: |
|--------|------------------------------|
| **Fix Loop** | The build agent has attempted to fix the same error 3+ times without resolution |
| **False Completion** | The agent claimed tasks were complete, but they don't work when tested |
| **Cascading Regressions** | Fixing one bug creates new bugs in previously-working features |
| **Wrong Approach** | A fundamental approach chosen in the plan turns out to be flawed |
| **Unknown State** | You've lost track of what's built, what works, and what doesn't |
| **Context Decay** | The agent is referencing variables, functions, or files that don't exist |
| **Unclassified** | *Something is wrong but it doesn't fit the patterns above. Start with the State Audit (Procedure 5) to ground truth, then adapt from there.* |

---

## RECOVERY PROCEDURE 1: HARD RESET (Fix Loop / Context Decay)

**Activate when:** The agent is stuck on the same error after 2+ attempts, or is clearly operating against stale context.

```
STEP 1: FULL STOP
  Stop all implementation. Do not attempt another fix.

STEP 2: CONTEXT RECONSTRUCTION
  Re-read (in order):
  1. progress.txt — what does the project think exists right now?
  2. plan.md — what task was being attempted?
  3. LESSONS.md — has this type of failure happened before?
  4. The actual files involved in the failure — read them fresh, top to bottom.
     Do NOT rely on memory. Read the files.

STEP 3: MENTAL MODEL AUDIT
  State explicitly:
  "Here's what I thought was true:
   - [assumption 1]
   - [assumption 2]

   Here's what's actually true (after re-reading):
   - [reality 1]
   - [reality 2]

   The gap between my model and reality is:
   - [gap — this is likely the root cause]"

STEP 4: ALTERNATIVE APPROACH
  Propose a fundamentally different approach to the stuck task.
  Not a variation of the same fix — a different strategy entirely.

  Format:
  "Previously I was trying: [approach]
   It failed because: [root cause]
   Alternative: [new approach]
   Why this is different: [structural reason it addresses the root cause]
   Risk: [what could go wrong with the new approach]"

STEP 5: USER DECISION
  Present the alternative. Wait for user approval before proceeding.
  If the user says "step back" or "we're going in circles":
  drop everything and re-plan from Step 2 of the session lifecycle (§2 of build protocol).

STEP 6: LOG
  Update LESSONS.md:
  - What went wrong
  - Why the original approach failed
  - What the alternative approach is
  - Prevention rule for the future
```

---

## RECOVERY PROCEDURE 2: FORCED VERIFICATION (False Completion)

**Activate when:** The agent claimed work was complete but features don't actually work.

```
STEP 1: IDENTIFY SCOPE
  List every task the agent marked as complete in the current or recent session(s).

STEP 2: RE-VERIFY EACH TASK
  For each claimed-complete task, run the full verification sequence:

  a. STRUCTURAL GATES (from 08_build_protocol.md §4):
     - Schema Concordance: do SQL column names match the schema?
     - No Dead Handlers: do all event handlers have real implementations?
     - State Machine Compliance: do all state changes go through the engine?
     - No Magic Values: are there hardcoded stand-ins for real data?
     - Signature Alignment: do function call sites match signatures?

  b. BEHAVIORAL VERIFICATION:
     - Does the code compile without errors?
     - Do the tests pass?
     - Does the feature work end-to-end (not just the happy path)?

  c. REPORT per task:
     ```
     TASK: [task description]
     CLAIMED: Complete ✅
     ACTUAL:
       Schema Concordance:  [✅ PASS / ❌ FAIL — details]
       No Dead Handlers:    [✅ PASS / ❌ FAIL — details]
       State Compliance:    [✅ PASS / ❌ FAIL — details]
       No Magic Values:     [✅ PASS / ❌ FAIL — details]
       Signature Alignment: [✅ PASS / ❌ FAIL — details]
       Compiles:            [✅ PASS / ❌ FAIL — details]
       Tests:               [✅ PASS / ❌ FAIL — details]
       End-to-end:          [✅ PASS / ❌ FAIL — details]
     VERDICT: [ACTUALLY COMPLETE / NEEDS REWORK]
     ```

STEP 3: TRIAGE
  Group failed tasks by failure category:
  - Schema issues: [list]
  - Stub issues: [list]
  - Logic issues: [list]
  - Integration issues: [list]

  Fix in this order: Schema → State Machine → Logic → Integration → UI
  (Foundation first, surface last)

STEP 4: RE-EXECUTE
  For each task needing rework:
  - Mark it as [REWORK REQUIRED] in plan.md
  - Execute the Build-Verify-Fix loop from 08_build_protocol.md §3
  - Do NOT move to the next task until the current one passes ALL gates

STEP 5: UPDATE PROGRESS
  - Update progress.txt: "Recovery procedure ran. [N] tasks re-verified. [N] needed rework."
  - Update LESSONS.md: "False completion detected. Root cause: [analysis]. Prevention: [rule]."
```

---

## RECOVERY PROCEDURE 3: REGRESSION TRIAGE (Cascading Failures)

**Activate when:** Fixing one bug creates new bugs in previously-working features.

```
STEP 1: FULL STOP
  Stop all new work immediately. No new features, no new tasks.

STEP 2: INVENTORY ALL FAILURES
  Run the COMPLETE test suite.
  List every failing test with:
  - Test name
  - File it tests
  - Error message
  - When it last passed (if known)

STEP 3: DEPENDENCY MAP
  For each failing test, trace which recent change could have caused it:
  ```
  FAILING: [test name]
  TESTS: [file]
  ERROR: [message]
  LIKELY CAUSE: [recent change in file X, which imports/is imported by the tested file]
  ```

STEP 4: ROOT CAUSE CLUSTERING
  Group failures by root cause. Often 10 failing tests trace to 2-3 root causes.
  ```
  ROOT CAUSE 1: [description]
    Affects: [test 1, test 2, test 3]
    Fix: [what needs to change]

  ROOT CAUSE 2: [description]
    Affects: [test 4, test 5]
    Fix: [what needs to change]
  ```

STEP 5: FIX IN DEPENDENCY ORDER
  Fix root causes in dependency order:
  1. Database/schema issues first
  2. Engine/core logic second
  3. Service layer third
  4. UI layer last

  After each fix:
  - Run the full test suite
  - Verify the fix didn't introduce new failures
  - If it did: this fix has a side effect → investigate before proceeding

STEP 6: PREVENTION
  After all tests pass:
  - Log each root cause in LESSONS.md
  - Add regression prevention tasks to plan.md if needed
  - Update progress.txt: "Regression triage complete. [N] root causes fixed."
```

---

## RECOVERY PROCEDURE 4: PLAN ROLLBACK (Wrong Approach)

**Activate when:** A fundamental approach chosen in the plan turns out to be flawed and needs to be replaced — not tweaked, replaced.

```
STEP 1: DOCUMENT THE FAILURE
  In memory.md §Superseded Decisions:
  ```markdown
  **Decision:** [Original approach]
  **Why it failed:** [Specific, technical reason — not "it didn't work"]
  **Evidence:** [Error messages, test failures, or structural analysis]
  **Date superseded:** [date]
  ```

STEP 2: ASSESS BLAST RADIUS
  Determine what's affected:
  - Which completed tasks used this approach?
  - Which files contain code built on this approach?
  - Which pending tasks assume this approach?
  - What's salvageable vs. what needs rewriting?

  ```
  BLAST RADIUS:
  - Completed tasks affected: [list]
  - Files affected: [list]
  - Pending tasks affected: [list]
  - Salvageable: [what can stay]
  - Must rewrite: [what has to change]
  ```

STEP 3: PROPOSE ALTERNATIVE
  Present the new approach:
  ```
  ALTERNATIVE APPROACH:
  - What: [new approach]
  - Why it's different: [structural difference from the failed approach]
  - Why it will work: [evidence or reasoning]
  - Migration path: [how to get from current state to new approach]
  - Estimated rework: [number of tasks, files, rough effort]
  ```

STEP 4: UPDATE PLAN
  After user approval:
  - Mark affected completed tasks as [REWORK REQUIRED] in plan.md
  - Add new tasks for the rework
  - Update pending tasks that assumed the old approach
  - Log all changes in plan.md §Mutation Log

  Never delete prior work. Fix it incrementally. The git history is
  a safety net — don't destroy it by starting over.

STEP 5: LOG
  Update LESSONS.md with:
  - What the failed approach was
  - Why it was chosen originally (seemed correct because...)
  - Why it failed (but actually...)
  - How the new approach prevents the same class of failure
```

---

## RECOVERY PROCEDURE 5: STATE AUDIT (Unknown Build State)

**Activate when:** The build state is unclear — you don't know what works, what's broken, or what's been built.

```
STEP 1: GROUND TRUTH INVENTORY
  Read every file in the project. Build a map:
  ```
  FILE INVENTORY:
  - [file]: [exists ✅ / missing ❌] — [status: functional / partial / stub / broken]
  ```

STEP 2: PLAN RECONCILIATION
  Compare the inventory against plan.md:
  ```
  PLAN vs REALITY:
  - [task from plan]: [DONE — code exists and works / PARTIAL — code exists, not verified / MISSING — no code found / EXTRA — code exists but no plan task]
  ```

STEP 3: TEST SUITE STATUS
  Run every available test:
  ```
  TEST STATUS:
  - Total tests: [N]
  - Passing: [N]
  - Failing: [N]
  - No test coverage: [list of features/files]
  ```

STEP 4: REBUILD PROGRESS.TXT
  Write a new progress.txt from scratch based on ground truth:
  ```
  === WHAT EXISTS RIGHT NOW ===
  [Based on file inventory — only list what actually works]

  === WHAT WAS JUST COMPLETED ===
  [Based on plan reconciliation]

  === WHAT IS IN PROGRESS ===
  [Based on partial implementations found]

  === WHAT IS BLOCKED ===
  [Based on failing tests and missing dependencies]

  === WHAT IS NEXT ===
  [First task from plan.md that is NOT done or partial]
  ```

STEP 5: PRESENT TO USER
  ```
  STATE AUDIT COMPLETE
  ━━━━━━━━━━━━━━━━━━━━━

  Plan tasks:           [N total]
  Actually complete:    [N] (verified working)
  Partially built:      [N] (code exists, needs verification/completion)
  Not started:          [N]
  Extra (unplanned):    [N]

  Tests:                [N passing / N failing / N total]

  Recommended next step: [specific action based on findings]
  ━━━━━━━━━━━━━━━━━━━━━
  ```

STEP 6: RESUME
  After user reviews the audit:
  - Resume normal Build-Verify-Fix loop from the first incomplete task
  - Re-verify any "partially built" tasks before moving on
  - Add any "extra" unplanned code to plan.md with appropriate FEAT refs
```

---

## META-RULE: WHEN TO ESCALATE TO USER

Some problems should not be solved autonomously. The triggers below are **known indicators** — situations where autonomous resolution has been observed to fail or make things worse. This list is not exhaustive. If you encounter a novel situation where you genuinely don't know the right path, that is also an escalation. Silence about confusion is worse than escalation.

1. The same error has resisted 3+ fix attempts with different approaches
2. Two documentation sources contradict each other on the same point
3. A required feature has no documented acceptance criterion
4. A plan mutation would affect more than 3 downstream tasks
5. You discover a requirement that contradicts a Crucible decision
6. You need to delete more than 50 lines of working code
7. The blast radius of a change is larger than the original task
8. *You feel uncertain and can articulate why — your uncertainty is signal, not weakness*

**Escalation format:**
```
🚨 ESCALATION:
What happened: [specific description]
What I've tried: [approaches attempted]
Why I'm stuck: [root cause analysis]
Options I see:
  A. [option] — [tradeoff]
  B. [option] — [tradeoff]
Recommended: [A or B] because [reasoning]
→ Need your decision to proceed.
```
