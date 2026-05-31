[PROMPT 9: FEATURE AUDIT & VERIFICATION]
System Instruction: Activate Feature-Level Verification Engine (Silent Failure Elimination) v5

CONTEXT:
The build is in progress or complete. Code exists. Features have been implemented across many files. But "implemented" does not mean "working." In large applications with hundreds of features, a feature can be structurally present — functions exist, components render, handlers are wired — and yet be functionally dead. An empty loop. A hardcoded value where a database query should be. A state transition that skips a critical check. A math calculation using the wrong input.

These are silent failures. They don't crash the app. They don't throw errors. They don't fail tests (because the tests check what was coded, not what was specified). They sit invisibly in production, corrupting data, bypassing constraints, and lying to users through fabricated outputs.

Phase 8's verification gates catch structural bug categories (schema mismatches, dead handlers, signature alignment). Phase 9 operates at a fundamentally different level: it verifies that each FEATURE — as a complete behavioral unit spanning multiple files — fulfills its contractual obligation as defined in the PRD.

This is not a testing protocol. This is a feature-by-feature forensic audit.

---

## §1. WHEN THIS RUNS

Phase 9 is not a one-time pass. It runs at multiple points:

| Trigger | Scope | Depth |
|---------|-------|-------|
| **Phase Boundary** (end of each plan.md phase) | All FEAT-IDs completed in that phase | Full audit |
| **Mid-Build Checkpoint** (every 15-20 tasks) | FEAT-IDs touched by recent tasks | Targeted audit |
| **Pre-Release Gate** (before presenting "build complete") | ALL FEAT-IDs in the entire project | Exhaustive audit |
| **Post-Fix Verification** (after any bug fix batch) | FEAT-IDs affected by the fixes + their dependents | Regression-focused audit |
| **User-Triggered** (on demand) | User-specified FEAT-IDs | Custom scope |

At Phase Boundaries, Phase 9 runs AFTER Phase 8's Phase Completion Report (§6) and BEFORE user approval to proceed to the next phase. If Phase 9 finds failures, they must be resolved before the phase is approved.

---

## §2. THE FEATURE REGISTRY

Before any audit can run, the agent must construct or update the **Feature Registry** — a living document that maps every FEAT-ID to its complete code footprint.

### Registry Format

Create or update `_audit/feature_registry.md`:

```markdown
# Feature Registry: [Project Name]
**Last updated:** [date]
**Source:** PRD.md FEAT-IDs + codebase trace
**Total features:** [N] MVP + [N] Post-MVP = [N] total
**Verified:** [N] / [N]

---

## FEAT-001: [Feature Name]
**PRD Priority:** [P0/P1/P2/P3]
**Status:** [UNBUILT | IMPLEMENTED | TRACED | VERIFIED | FAILED]
**Last verified:** [date or "never"]

### Acceptance Criteria (from PRD.md)
- [ ] [Criterion 1 — copied verbatim from PRD.md]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

### Code Footprint
| Layer | File | Functions/Components | Role |
|-------|------|---------------------|------|
| Schema | src/db/schema.sql | CREATE TABLE [x] | Data definition |
| Service | src/services/[x]Service.ts | createX(), getX(), updateX() | Business logic |
| Engine | src/engine/[x]Engine.ts | calculateY(), validateZ() | Pure computation |
| Store | src/stores/[x]Store.ts | useXStore() | State management |
| Screen | src/screens/[X]Screen.tsx | [X]Screen component | User interface |
| Component | src/components/[X]Card.tsx | [X]Card component | UI sub-component |

### Cross-Feature Dependencies
| Depends on | How | Critical? |
|-----------|-----|-----------|
| FEAT-XXX | Calls [function] from [file] | Yes — feature fails without it |
| FEAT-YYY | Reads [table] populated by FEAT-YYY | No — degrades gracefully |

### Dependents (features that depend on THIS one)
| Feature | How |
|---------|-----|
| FEAT-ZZZ | Imports [function] from this feature's service |

### Verification History
| Date | Result | Failures Found | Fixed? |
|------|--------|----------------|--------|
[Appended after each audit run]

---
[Repeat for every FEAT-ID]
```

### Building the Registry — Tooling-First Protocol

Manually reading every file to build a registry is unsustainable at scale. The agent MUST use tooling to construct the registry efficiently, then validate with targeted reads.

**Step 1: Automated Discovery (tooling-first)**
1. **Start from PRD.md:** List every FEAT-ID with its name, priority, and acceptance criteria.
2. **Trace through plan.md:** For each FEAT-ID, find every task that references it. List the files each task touches.
3. **Tooling sweep:** For each file identified by plan.md:
   - `grep -rn "FEAT-XXX"` across the codebase to find all references
   - `grep -rn "functionName\|className"` to find callers and importers
   - `grep -rn "tableName"` in service/repository layers to find all DB operations on feature-related tables
   - Use the IDE/editor's "find all references" or equivalent for cross-file dependency mapping
   - For JS/TS projects: `grep -rn "import.*from.*featureFile"` to map the import graph
4. **Build the footprint table** from tooling output — don't read files line-by-line to discover what's there.

**Step 2: Targeted Validation (manual reads)**
5. **Read only the functions identified by tooling.** Verify they perform meaningful work (not stubs). This is where human-level judgment applies — but on a pre-filtered set, not the entire codebase.
6. **Map dependencies:** For each function in the footprint, check if it calls functions from other FEAT-IDs or is called by them.

**Step 3: Gap Detection**
7. **Reverse trace:** `grep -rn "FEAT-"` across the entire codebase. Any FEAT-ID found in code but NOT in the registry indicates an untracked feature implementation.
8. **Orphan detection:** For every exported function in feature-related files, `grep` for callers. Zero callers = orphaned code.

**Critical Rule:** If a FEAT-ID from PRD.md has NO code footprint — no files, no functions, nothing — it is an **Unimplemented Feature**. Flag it immediately. This is the most severe class of silent failure: a feature that was specified, planned, and "completed" but never actually built.

---

## §3. THE SILENT FAILURE TAXONOMY

The following categories are the **known baseline** — failure patterns that have been observed and catalogued from real production data. They are the floor, not the ceiling.

These 10 categories represent the failures that have been caught so far. They do NOT represent all possible ways a feature can silently fail. The universe of silent failures is unbounded. New tech stacks, new architectural patterns, new business domains, and new levels of application complexity WILL produce failure modes that no taxonomy has anticipated.

**The agent's mandate is twofold:**
1. Run every baseline category check against every feature in scope
2. **Apply the Adversarial Engineering Mindset.** Think beyond the taxonomy. Actively probe for anomalies, inconsistencies, and "things that feel wrong" even if they don't match a named category. If you discover a novel failure pattern, FLAG IT, document it, and propose it as a new taxonomy category.

The taxonomy is a living, evolving instrument — not a fixed checklist.

### Category 1: HOLLOW IMPLEMENTATION
**What:** A function/handler exists but does nothing meaningful.
**Signals:**
- Empty function bodies: `() => {}`
- Console.log-only implementations: `console.log('Updated...')`
- Loops that iterate but perform no operations: `items.forEach(item => { })`
- Functions that return hardcoded values instead of computed results
- `// TODO`, `// stub`, `// placeholder` comments in production code
**Check procedure:**
1. For every function in the feature's footprint, read the function body
2. Verify the function performs a meaningful operation (database write, state mutation, calculation, API call)
3. If the function body is < 3 lines, scrutinize it — short bodies are high-risk for stubs
**Observed in:** W-List Batch 12 — handlers that "exist" but are empty loops or log-only stubs. This is only one manifestation. Any implementation that structurally satisfies a function signature but performs no meaningful work falls here.

---

### Category 2: MOCKED DATA
**What:** Real data sources replaced with fake/random values.
**Signals:**
- `Math.random()` generating values that should come from the database
- `Math.floor(Math.random() * N)` creating IDs, scores, or metrics
- Hardcoded arrays where a database query should be (`const items = [{...}, {...}]`)
- Template literals with placeholder text (`"Item ${index}"`)
- `Date.now()` or `new Date()` where a stored timestamp should be used
**Check procedure:**
1. For every data-producing function in the footprint, trace the data source
2. Verify it reads from the documented source (database table, API endpoint, store)
3. Flag any value that is computed locally where the PRD specifies it should come from persistent storage
**Observed in:** W-List Batch 12 — `Math.floor(Math.random() * 20)` replacing actual frequency data. Think broader: any synthetic data generation where the spec requires real data — including AI-generated placeholder content, seeded test data left in production paths, or fallback values that were meant to be temporary.

---

### Category 3: HARDCODED OVERRIDES
**What:** Dynamic values replaced with static constants, destroying the data model.
**Signals:**
- `const cost = 1.0` where the value should come from a task definition's `base_points`
- `priority: Priority.MILD` where the value should come from the task's actual priority
- `status: 'active'` where the value should be derived from business logic
- Any assignment where the right-hand side is a literal but the PRD says it should be variable
**Check procedure:**
1. For every data write in the footprint (INSERT, UPDATE, state mutation), inspect each field value
2. Cross-reference against BACKEND_STRUCTURE.md — does the code use the correct source column?
3. Cross-reference against PRD.md — does the acceptance criterion specify this value should be dynamic?
**Observed in:** W-List Batch 12 — `priority: Priority.MILD` overwriting all tasks' actual priorities. Think broader: any value that should flow from a source-of-truth but is instead hardcoded — default configs that should be user-settable, environment-specific values baked into code, permissions hardcoded instead of role-derived.

---

### Category 4: LOGIC BYPASS
**What:** Conditional checks that miss valid states, allowing forbidden operations.
**Signals:**
- State checks that test one enum value but miss others (`=== 'MISSED'` without testing `'DEFERRED_MISSED'`)
- Queries that filter by a status that will change over time (`status = 'audited'` when audited lists transition to `'closed'`)
- Boundary conditions using wrong operators (`< 2` instead of `<= 2`, or `> 0` instead of `>= 0`)
- `if` conditions that don't cover all enum values defined in the schema CHECK constraint
**Check procedure:**
1. For every conditional in the footprint that checks entity state, list all possible states from the schema
2. Verify EVERY valid state is handled (either explicitly or by a catch-all)
3. For time-dependent queries: verify the query accounts for state transitions that happen asynchronously
4. For boundary checks: verify the operator matches the PRD's stated constraint (inclusive vs exclusive)
**Observed in:** W-List Batches 1/3 — restriction checks that miss `DEFERRED_MISSED` or queries that fail after asynchronous status transitions. Think broader: any temporal logic where the system's state at check-time differs from its state at action-time — race conditions, eventual consistency gaps, cron-dependent state changes, user timezone edge cases.

---

### Category 5: SCHEMA DRIFT
**What:** Code references columns, tables, or values that don't match the actual schema.
**Signals:**
- Column names in SQL that differ from schema.sql (typos, deprecated names)
- INSERT statements missing NOT NULL columns
- Enum values in code that don't exist in CHECK constraints (or vice versa)
- Foreign key values that violate case sensitivity rules
**Check procedure:**
1. For every SQL operation in the footprint, extract all column names and table names
2. Open schema.sql / BACKEND_STRUCTURE.md and verify exact match (case-sensitive)
3. For INSERT statements: verify every NOT NULL column without DEFAULT is included
4. For enum values: verify code-level enums match CHECK constraint value sets exactly
**Observed in:** W-List Batches 1/3 — `earned_points` vs `pomodoro_points_earned`, uppercase vs lowercase foreign keys. Think broader: any divergence between what the code thinks the data layer looks like and what it actually looks like — including migration artifacts, renamed columns that weren't updated everywhere, and ORM-generated schemas that drift from raw SQL.

---

### Category 6: UNDECLARED DEPENDENCIES
**What:** Variables, functions, or imports used but never declared or imported.
**Signals:**
- Variables used in scope without `const`, `let`, or `var` declaration
- Functions called without import statements
- Object properties accessed on variables that were never assigned
- Template literals referencing variables from parent scopes that don't exist
**Check procedure:**
1. For every file in the footprint, identify all variable references
2. Verify each has a corresponding declaration in scope (local, parameter, import, or module-level)
3. For functions called across file boundaries: verify the import statement exists AND the function is exported from the source
**Observed in:** W-List Batches 1/7 — `now` never declared, `getActiveQuarterlyList` never imported, `columns` never extracted. Think broader: any invisible assumption about what's "available" — environment variables never set, config values never loaded, third-party SDK initialization never called, middleware never registered.

---

### Category 7: MATH CORRUPTION
**What:** Calculations that use wrong inputs, skip relevant data, or produce mathematically incorrect results.
**Signals:**
- Loop `continue` statements that skip data points before they're fully processed
- Aggregation loops that don't account for all entity types
- Division operations without zero-division guards
- Averaging calculations that count rows instead of calendar days
- Window functions operating on rows instead of time ranges
**Check procedure:**
1. For every mathematical operation in the footprint (sum, average, percentage, rate), identify:
   - What inputs feed it
   - What the PRD says the output should represent
2. Verify the inputs match the PRD's definition (e.g., "30-day average" must use 30 calendar days, not 30 rows)
3. Verify no valid data is excluded by early loop exits (`continue`, `break`, `filter`)
4. Verify aggregation covers all entity states specified in the schema
**Observed in:** W-List Batches 1/3 — audit computation skipping DELEGATED tasks, velocity using ROW windows instead of DATE windows. Think broader: any calculation whose output "looks reasonable" but is subtly wrong — rounding errors that compound, integer division truncating precision, UTC/local time mismatches in date arithmetic, floating point comparisons without epsilon.

---

### Category 8: STATE CORRUPTION
**What:** State not properly initialized, cleared, or synchronized, leading to phantom operations or data leaks.
**Signals:**
- Global state (stores, caches) not cleared after operations complete
- Selection state persisting after bulk operations, causing repeat executions
- State updated optimistically without rollback on failure
- Multiple components writing to the same state without coordination
- React state read synchronously inside async loops (stale closure)
**Check procedure:**
1. For every state mutation in the footprint, trace the lifecycle: initialized → modified → cleared/reset
2. Verify that after every "completing" operation (submit, save, navigate away), transient state is cleared
3. For bulk operations: verify selection state is cleared after execution
4. For async operations: verify state reads are current, not captured in closures
**Observed in:** W-List Batch 7 — `selectedIds` not cleared after bulk action, enabling phantom re-execution. Think broader: any state that outlives its intended scope — navigation state surviving page transitions, form data persisting after submission, cached API responses served after the underlying data has changed, websocket subscriptions not cleaned up on unmount.

---

### Category 9: CONSTRAINT BYPASS
**What:** Safety constraints (ceilings, limits, permissions) that don't cover all code paths.
**Signals:**
- Ceiling/limit checks that receive stale or incorrect input values
- Constraint functions that are called from some code paths but not others
- Working variables (tracking running totals) not passed to validation functions
- Time-dependent constraints that can be waited out
**Check procedure:**
1. For every constraint defined in the PRD's acceptance criteria, find EVERY code path that should enforce it
2. Verify the constraint is checked on ALL code paths (not just the primary one)
3. Verify the inputs to the constraint function are current (not stale state, not initial values)
4. For time-dependent constraints: verify they cannot be circumvented by waiting for a state transition
**Observed in:** W-List Batch 7 — ceiling check receiving static `0` instead of running total, restriction evaporating when audited list transitions to closed. Think broader: any safety mechanism that can be circumvented — rate limits that don't account for retries, permissions checked at the UI layer but not the service layer, validation run on the client but not re-validated on the server, feature gates that only check on initial load.

---

### Category 10: INTEGRATION VOID
**What:** Features that are complete in isolation but not wired into the rest of the system.
**Signals:**
- Service functions that exist but are never called by any screen or controller
- Database tables that are created and populated but never queried
- Engine functions that compute results but whose output is never consumed
- UI components that render but whose user actions dispatch to empty handlers
- API endpoints that respond correctly but are never hit by the frontend
**Check procedure:**
1. For every function in the feature's footprint, search the ENTIRE codebase for callers
2. For every table the feature writes to, search for SELECT queries that read from it
3. For every store action the feature dispatches, search for components that consume the state
4. If zero callers/consumers are found: the feature is functionally orphaned — implemented but invisible
**Observed in:** W-List Batch 5 — `deleteCalendarEvent` as empty stub, services that exist but are never imported. Think broader: any code that was written "for later" but never connected — utility functions with zero callers, database tables with zero reads, event emitters with zero listeners, error handlers that catch but never surface to the user.

---

### §3.1: EMERGENT FAILURE DISCOVERY

The 10 baseline categories are drawn from a single project's production data. They are a starting point. The agent MUST actively look for failure patterns that don't fit any category.

**Proactive Discovery Protocol:**

After running all baseline categories, the agent performs the following **concrete analyses** for each feature. Each analysis has a specific procedure — not just a question to ponder.

#### 1. Temporal Analysis
**Question:** Does this feature degrade over time?
**Procedure:**
1. Identify every data structure this feature writes to (DB tables, caches, state stores, log files)
2. Check: is there a cleanup/archival/rotation mechanism? If not, what happens when the table has 1M rows instead of 100?
3. Check: are there any timestamps used in queries? Do they handle timezone changes, daylight saving, or clock drift?
4. Check: are there TTLs on cached data? What serves stale data if the cache isn't invalidated?
5. `grep -n "Date.now\|new Date\|setTimeout\|setInterval"` in feature files — each is a temporal assumption to verify

#### 2. Scale Analysis
**Question:** Does this feature break at 10x–100x expected load?
**Procedure:**
1. Identify every loop and query in the feature's footprint
2. For each loop: what is the iteration count at 10x scale? Is it O(n), O(n²), O(n·m)?
3. For each DB query: does it use LIMIT/pagination? Does it have an index on the WHERE clause columns?
4. `grep -n "SELECT.*FROM\|find(\|filter(\|forEach(\|map("` — each is a scale-sensitive operation
5. Check: are there any unbounded list renders in UI? (rendering 10,000 items without virtualization)

#### 3. Concurrency Analysis
**Question:** What happens with simultaneous access?
**Procedure:**
1. Identify every write operation (DB INSERT/UPDATE, state mutation, file write)
2. For each: is there a transaction boundary? A lock? An optimistic concurrency check (version column, ETag)?
3. Check: can two users trigger the same handler simultaneously? What happens to shared state?
4. `grep -n "async\|await\|Promise\|setTimeout"` — each async boundary is a potential race condition site
5. For state stores: are there actions that read-then-write without atomicity?

#### 4. Environment Analysis
**Question:** Does this feature assume a specific environment?
**Procedure:**
1. `grep -n "process.env\|import.meta.env\|window\.\|navigator\.\|localStorage\|document\."` — each is an environment assumption
2. Check: does the feature work without network? What's the offline behavior?
3. Check: does the feature use locale-sensitive formatting (dates, numbers, currency)? Is it hardcoded to one locale?
4. Check: does the feature read screen dimensions or viewport? What happens on mobile vs desktop?

#### 5. Error Propagation Analysis
**Question:** When a dependency fails, does this feature fail cleanly or corrupt silently?
**Procedure:**
1. For every external call (API, DB, file I/O) in the feature's footprint, find the error handler
2. Check: does the catch block actually handle the error, or does it swallow it? (`catch(e) {}` is a silent corruption factory)
3. Check: if a service call fails mid-operation, is partial state rolled back?
4. `grep -n "catch\|.catch\|try {"` — verify every catch block has meaningful error handling, not just logging
5. Trace: if this feature's service function throws, does the calling UI show an error state? Or does it render stale/empty data silently?

#### 6. Semantic Analysis
**Question:** Does the code do what a user *thinks* it does?
**Procedure:**
1. Read each UI label, button text, and tooltip in the feature's components
2. Trace what the handler actually does when the user clicks/triggers it
3. Check: does the action name match the action behavior? ("Save" that actually creates a new record, "Delete" that only soft-deletes)
4. Check: are success/error messages accurate? Does "Saved successfully" fire even when the save silently failed?
5. Check: do metric displays (counts, percentages, averages) match how a user would define them? ("Active users" that counts bots, "Average" that's actually a median)

#### 7. Composition Analysis
**Question:** Do features interact safely when combined?
**Procedure:**
1. From the Feature Registry, identify features that share DB tables or state stores
2. For each shared resource: list all writers and readers across features
3. Check: does Feature A's write produce a state that Feature B's read doesn't expect?
4. Walk the user journeys in APP_FLOW.md that chain multiple features — does the output of step N match the expected input of step N+1?
5. Check: are there event listeners or subscriptions from Feature A that react to Feature B's mutations unexpectedly?

**When a novel failure is discovered:**

```
EMERGENT FAILURE: [descriptive name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:    FEAT-XXX
File:       [path:line]
Discovery:  [Which analysis — temporal, scale, concurrency, environment, error propagation, semantic, composition]
Procedure step: [Which step in the procedure caught it]
Behavior:   [What the code does]
Problem:    [Why this is a silent failure]
Nearest baseline category: [closest match, or "NONE — truly novel"]
Proposed new category name: [if this represents a pattern]
Severity:   [CRITICAL / HIGH / MEDIUM]
Fix:        [Specific fix]
```

Emergent failures are treated with the SAME severity rules as baseline failures. They are not second-class findings.

---

## §4. THE SURGICAL VERIFICATION LOOP

For each FEAT-ID under audit, the agent executes this loop:

```
FOR each FEAT-ID in audit scope:

  ┌─────────────────────────────────────────┐
  │  1. LOAD FEATURE CONTEXT               │
  │     Read: PRD.md entry for this FEAT-ID │
  │     Read: Feature Registry footprint    │
  │     Read: ALL files in the footprint    │
  │     If 10+ messages into session:       │
  │        RE-READ everything               │
  └─────────────┬───────────────────────────┘
                │
  ┌─────────────▼───────────────────────────┐
  │  2. TRACE DATA FLOW                     │
  │     For this feature, trace:            │
  │     • Where does data ENTER?            │
  │       (user input, DB read, API call)   │
  │     • Where is data TRANSFORMED?        │
  │       (engine, service, computed prop)  │
  │     • Where is data STORED?             │
  │       (DB write, state mutation)        │
  │     • Where is data DISPLAYED?          │
  │       (UI binding, export, report)      │
  │     Flag any break in the chain         │
  └─────────────┬───────────────────────────┘
                │
  ┌─────────────▼───────────────────────────┐
  │  3. RUN TAXONOMY + PROACTIVE ANALYSIS   │
  │     a. Apply all baseline categories    │
  │        to EVERY function in footprint   │
  │     b. THINK BEYOND THE TAXONOMY:       │
  │        - What could go wrong here that  │
  │          no category covers?            │
  │        - What assumptions is this code  │
  │          making that aren't guaranteed? │
  │        - What edge cases would a user   │
  │          hit that the dev didn't test?  │
  │        - What happens under load, over  │
  │          time, or with unexpected input?│
  │     Record: PASS / FAIL + evidence      │
  │     If novel failure found: flag as     │
  │     EMERGENT — [description]            │
  └─────────────┬───────────────────────────┘
                │
  ┌─────────────▼───────────────────────────┐
  │  4. VERIFY ACCEPTANCE CRITERIA          │
  │     For each criterion in PRD.md:       │
  │     • Can you DEMONSTRATE it?           │
  │     • What command/action proves it?    │
  │     • Does the code path actually       │
  │       produce the stated behavior?      │
  │     A criterion is VERIFIED only if     │
  │     you can trace from user action →    │
  │     code path → observable output       │
  └─────────────┬───────────────────────────┘
                │
          ┌─────┴─────┐
          │           │
       ✅ ALL        ❌ ANY
       PASS          FAIL
          │           │
          │   ┌───────▼───────────────────┐
          │   │  5. GENERATE FAILURE      │
          │   │     REPORT                │
          │   │  For each failure:        │
          │   │  • Category (1-10 or     │
          │   │    EMERGENT-[name])       │
          │   │  • File + line reference  │
          │   │  • What SHOULD happen     │
          │   │  • What ACTUALLY happens  │
          │   │  • Severity (CRITICAL /   │
          │   │    HIGH / MEDIUM)         │
          │   │  • Suggested fix          │
          │   └───────────────────────────┘
          │
  ┌───────▼───────────────────────────────┐
  │  6. UPDATE REGISTRY                   │
  │     Set status:                       │
  │     VERIFIED (all pass)               │
  │     FAILED (any fail — with count)    │
  │     Append to verification history    │
  └───────────────────────────────────────┘
```

---

## §5. PROOF OF LIFE

A feature is not VERIFIED by reading its code. Code can look correct and still be wrong. **Reading the code and deciding it works is a proof of plausibility, not a proof of life.** A feature is VERIFIED when the agent can demonstrate an **observable chain of causation** backed by **execution evidence**.

### Proof Types

| Type | What It Means | When Required |
|------|--------------|---------------|
| **STATIC** | Agent traces the chain by reading code. No runtime execution. | P2/P3 features; or when test infra doesn't exist yet |
| **EXECUTED** | Agent triggers the feature and observes runtime behavior: runs a test, hits an endpoint, executes a command, or triggers a UI action and checks the result. | P0/P1 features — **mandatory** |

STATIC proof catches code-level breaks (missing imports, wrong signatures, stub bodies). EXECUTED proof catches runtime breaks (type errors at runtime, missing env vars, incorrect query results, failed constraint checks that only surface with real data). Both are necessary; neither is sufficient alone.

### The Proof Chain
For each acceptance criterion in PRD.md:

```
PROOF OF LIFE: FEAT-XXX — [Feature Name]
Criterion: "[acceptance criterion text]"
Proof type: [STATIC | EXECUTED]

Chain:
  → User action: [What the user does — e.g., "taps Create List"]
  → Handler: [file:function — e.g., src/screens/NewListScreen.tsx:handleCreateList]
  → Service call: [file:function — e.g., src/services/listService.ts:createList]
  → DB operation: [exact SQL — e.g., INSERT INTO lists (id, title, status...) VALUES (?, ?, 'active'...)]
  → Schema match: [Verified — all columns exist, all NOT NULL columns present]
  → Constraint check: [file:function — e.g., src/engine/listEngine.ts:validateActiveListCount]
  → State update: [store:action — e.g., useListStore:setActiveList]
  → UI reflection: [component:binding — e.g., DashboardScreen reads useListStore.activeList]
  → Observable output: [What the user sees — e.g., "New list appears in dashboard with status 'active'"]

Execution evidence (if EXECUTED):
  → Method: [test run | API call | CLI command | UI interaction]
  → Command: [exact command or action taken — e.g., `npm test -- --grep "createList"` or `curl -X POST /api/lists`]
  → Result: [actual output observed — e.g., "Test passes: 'creates list with active status'" or "HTTP 201, body: {id: 'xxx', status: 'active'}"]
  → DB verification: [query run to confirm state — e.g., `SELECT * FROM lists WHERE id = 'xxx'` returns expected row]

Verdict: ✅ ALIVE — full chain verified, execution confirmed
```

If ANY link in the chain is broken (function doesn't exist, SQL has wrong columns, handler is a stub, state isn't consumed by UI), the verdict is:

```
Verdict: ❌ DEAD — chain breaks at [Service call]: createList calls generateId()
  which is imported from utils but utils file does not export generateId
```

If the static chain looks intact but execution fails:

```
Verdict: ❌ DEAD (RUNTIME) — static chain intact but execution failed:
  Command: npm test -- --grep "createList"
  Error: "TypeError: Cannot read property 'id' of undefined at listService.ts:42"
  Root cause: [analysis of why the runtime failure occurs despite correct-looking code]
```

### Execution Evidence Methods

The agent should use the **lightest method that provides sufficient evidence:**

| Method | When to Use | Evidence Produced |
|--------|------------|-------------------|
| **Run existing test** | Test exists for this feature | Test pass/fail + output |
| **Run type checker** | TypeScript/typed language | Compilation success for feature files |
| **Hit API endpoint** | Backend feature with exposed route | HTTP response code + body |
| **Run CLI command** | CLI feature or DB operation | Command output |
| **Execute script** | Complex feature needing custom verification | Script output + assertions |
| **Run app + smoke test** | UI feature at phase boundary | App boots + feature renders + action produces result |

**If no execution method is available** (no test infra, no running server, no CLI): document this explicitly and downgrade to STATIC proof with a flag:
```
Proof type: STATIC (EXECUTION UNAVAILABLE — no test infrastructure)
Execution debt: [What would need to exist to execute this proof — e.g., "needs integration test for /api/lists endpoint"]
```
Execution debt items are added to plan.md as tasks.

### Proof Depth Tiers

Not every feature needs the same depth of proof:

| Feature Priority | Proof Depth | Proof Type | What's Required |
|-----------------|-------------|------------|-----------------|
| **P0 (Critical)** | Full chain | **EXECUTED** | Every acceptance criterion gets a complete Proof of Life chain with runtime evidence |
| **P1 (High)** | Full chain | **EXECUTED** | Every acceptance criterion gets a complete Proof of Life chain with runtime evidence |
| **P2 (Medium)** | Partial chain | STATIC | Trace data flow + taxonomy checks; Proof of Life for primary criterion only |
| **P3 (Low)** | Taxonomy only | STATIC | Run all 10 taxonomy checks; skip Proof of Life chain |

---

## §6. CROSS-FEATURE INTEGRITY

After individual features are verified, the audit checks cross-feature integrity. This section is critical — most insidious production bugs live at feature boundaries, not within features.

### 6.1 Dependency Chain Verification
For every cross-feature dependency in the registry:
1. Feature A says it depends on Feature B's `getX()` function
2. Verify Feature B's `getX()` is VERIFIED (not just implemented)
3. Verify Feature A calls `getX()` with the correct parameters
4. Verify the return type of `getX()` matches what Feature A expects
5. **Verify error propagation:** If Feature B's `getX()` throws or returns null, does Feature A handle it? Or does it crash/corrupt?
6. **Verify version alignment:** If Feature B's `getX()` signature changed during the build (plan mutation), does Feature A's call site reflect the change?

**Tooling:** `grep -rn "import.*from.*featureBFile"` across the codebase to find ALL callers of Feature B's exports — not just the ones in the registry. Undocumented callers are a hidden dependency risk.

### 6.2 Shared Resource Audit
For entities (database tables, stores, caches) accessed by multiple features:

**Step 1: Build the resource matrix**
```
| Resource | Writers (FEAT-ID: function) | Readers (FEAT-ID: function) | Conflict? |
|----------|---------------------------|---------------------------|----------|
```
Use `grep -rn "INSERT INTO tableName\|UPDATE tableName\|DELETE FROM tableName"` and `grep -rn "SELECT.*FROM tableName"` to build this exhaustively.

**Step 2: Conflict detection** — for each shared resource, check:
1. **Schema assumption conflicts:** Do all writers write the same columns? Does any writer set a column to a value that a reader doesn't expect? (e.g., Writer A sets `status = 'archived'` but Reader B's WHERE clause only handles `'active'` and `'deleted'`)
2. **Ordering conflicts:** Do two writers assume they're the only one modifying a record? Is there a last-write-wins race?
3. **Lifecycle conflicts:** Does Writer A create records that Writer B assumes already exist? Or does Writer B delete records that Reader A assumes persist?
4. **Type conflicts:** Does Writer A store a string where Reader B expects an integer? (especially in loosely-typed columns like JSON blobs)

**Step 3: State transition coverage**
For each entity with a status/state column:
1. List every state value from the schema CHECK constraint (or enum)
2. Map which feature transitions the entity INTO each state
3. Map which feature transitions the entity OUT OF each state
4. Flag any state with zero exit transitions (entity gets stuck)
5. Flag any state with zero entry transitions (unreachable state)
6. Flag any transition that bypasses the state engine (raw SQL UPDATE on state column)

### 6.3 Integration Path Verification
For every user journey in APP_FLOW.md:

**Step 1: Chain mapping**
1. Trace the journey through features: FEAT-001 → FEAT-003 → FEAT-007
2. For each link: what data does Feature N produce that Feature N+1 consumes?
3. Verify the data shape matches: types, nullability, field names

**Step 2: Failure mode analysis**
4. For each link: what happens if Feature N fails mid-journey? Does the user get stuck in a broken state?
5. Is there a way to recover or retry from the failure point?
6. Are there any journeys where partial completion leaves the system in an inconsistent state?

**Step 3: Execution verification (for P0/P1 journeys)**
7. If test infrastructure exists: run an integration test that exercises the full journey
8. If no integration test exists: flag as execution debt and add to plan.md
9. At minimum: verify the app boots and the entry point of each journey is reachable

**Step 4: Coverage gap detection**
10. Cross-reference: are there feature combinations that users will naturally exercise but that NO journey in APP_FLOW.md documents? These are untested interaction paths.
11. Flag any journey where a link in the chain is FAILED or UNVERIFIED

---

## §7. OUTPUT: FEATURE AUDIT REPORT

After every audit run, generate `_audit/feature_audit_[scope]_[date].md`:

```markdown
# Feature Audit Report
**Scope:** [Phase boundary / Mid-build / Pre-release / Post-fix]
**Date:** [date]
**Features audited:** [N]
**Features verified:** [N] ✅
**Features failed:** [N] ❌
**Silent failures found:** [N]

---

## Summary

| Status | Count | FEAT-IDs |
|--------|-------|----------|
| ✅ VERIFIED | [N] | FEAT-001, FEAT-003, ... |
| ❌ FAILED | [N] | FEAT-005, FEAT-012, ... |
| ⚠️ PARTIALLY VERIFIED | [N] | FEAT-008 (1 criterion unverifiable) |
| 🔲 NOT YET AUDITED | [N] | FEAT-020, FEAT-021, ... |

---

## Failures

### FEAT-XXX: [Feature Name] — ❌ FAILED

**Failure 1: [Category Name]**
- **Category:** [N] — [Category Name]
- **Severity:** [CRITICAL / HIGH / MEDIUM]
- **File:** [path:line]
- **Expected:** [What the PRD says should happen]
- **Actual:** [What the code actually does]
- **Evidence:** [Code snippet or trace showing the failure]
- **Impact:** [What breaks for the user]
- **Fix:** [Specific fix — not "fix the bug" but "replace Math.random() with getLastCompletedDate(taskId) from analyticsService"]

[Repeat for each failure in this feature]

---
[Repeat for each failed feature]

## Cross-Feature Integrity

### Dependency Chain Results
| Source | Depends on | Chain intact? |
|--------|-----------|---------------|
| FEAT-XXX | FEAT-YYY.getX() | ✅ / ❌ [reason] |

### Shared Resource Conflicts
| Resource | Writers | Readers | Conflicts? |
|----------|---------|---------|-----------|
| [table/store] | FEAT-XXX, FEAT-YYY | FEAT-ZZZ | ✅ / ❌ [reason] |

### User Journey Integrity
| Journey | Features | All verified? |
|---------|----------|---------------|
| [Journey name] | FEAT-001 → FEAT-003 → FEAT-007 | ✅ / ❌ breaks at FEAT-003 |

---

## Actions Required

### CRITICAL (must fix before proceeding)
1. [FEAT-XXX] [description] — blocks [downstream features/journeys]

### HIGH (fix in current phase)
1. [FEAT-XXX] [description]

### MEDIUM (fix before release)
1. [FEAT-XXX] [description]

---

## Plan Mutations Required
[If the audit reveals work the plan didn't anticipate]

| Type | Task | Reason | Add to Phase |
|------|------|--------|-------------|
| ADD | Wire deleteCalendarEvent to DB DELETE | Category 1: Hollow Implementation | Current |
| ADD | Replace Math.random() frequency data with DB query | Category 2: Mocked Data | Current |
| SPLIT | FEAT-012 needs separate wiring task | Category 10: Integration Void | Current |
```

---

## §8. PLAN IMPACT

Phase 9 findings MUST flow back into Phase 8's plan mutation protocol:

### Critical Failures
- **Immediately** add fix tasks to plan.md
- Mark them as `⚡ MUTATED [date]: Feature Audit Category [N] — [description]`
- These tasks get highest priority in the current phase
- The phase does NOT proceed until all CRITICAL failures are resolved

### High Failures
- Add fix tasks to the current phase in plan.md
- These must be resolved before the Phase Completion Report

### Medium Failures
- Add fix tasks to the final plan.md phase (pre-release hardening)
- Track them in progress.txt under a `=== FEATURE AUDIT DEFERRED ===` section

### Registry Updates
After fixes are applied:
1. Re-run the audit for affected FEAT-IDs only
2. Update the Feature Registry status
3. Append to the verification history

---

## §9. SESSION INTEGRATION

### How Phase 9 fits into the Phase 8 session lifecycle:

**At session start:**
- Read `_audit/feature_registry.md` (if it exists) alongside the standard startup sequence
- Note which features are VERIFIED vs FAILED vs UNAUDITED

**During the session:**
- After completing tasks that close out a FEAT-ID's implementation, run a targeted audit for that FEAT-ID
- This catches failures IMMEDIATELY rather than at phase boundaries

**At phase boundaries:**
- Run the full Phase 9 audit for all FEAT-IDs completed in this phase
- Include results in the Phase Completion Report (Phase 8 §6)
- The Phase Completion Report template now includes:
  ```
  Feature Audit:
    Features audited:     [N]
    Features verified:    [N] ✅
    Features failed:      [N] ❌ — [summary]
    Silent failures found:[N] — Categories: [list]
  ```

**Pre-release:**
- Run exhaustive audit across ALL FEAT-IDs
- Every P0 and P1 feature must be ✅ VERIFIED
- Any P0/P1 feature that is ❌ FAILED blocks release

---

## §10. ANTI-PATTERNS FOR THE AUDITOR

Rules the agent must follow when running Phase 9:

1. **Never trust code appearance.** A function can look complete and be dead. READ the body. TRACE the data.
2. **Never skip a category.** Even if the feature "obviously works," run all baseline taxonomy checks. Silent failures are silent precisely because they're not obvious.
3. **Never stop at the taxonomy.** The 10 baseline categories are the minimum, not the maximum. After running them, ask: "What else could be wrong here that no category covers?" Your critical thinking IS a verification tool.
4. **Never mark VERIFIED without a Proof of Life.** For P0/P1 features, if you can't trace the chain from user action to observable output, the feature is NOT verified. For P0/P1, STATIC proof alone is insufficient — EXECUTED proof is mandatory.
5. **Never batch-verify.** Each FEAT-ID is verified individually. "All features in this module work" is not an acceptable verification.
6. **Never assume cross-feature integrity.** Feature A working in isolation and Feature B working in isolation does NOT mean A→B works. Test the chain.
7. **Re-read files after 10+ messages.** Context decay will cause you to "verify" against stale mental models.
8. **Quantify, don't qualify.** "This function looks suspicious" is not a finding. "This function returns hardcoded `1.0` but PRD criterion 3 requires it to use `task_definition.base_points`" is a finding.
9. **Be the adversary.** Don't verify like a colleague confirming good work. Verify like an adversary trying to break a system. Ask: "If I were a user doing unexpected things, where would this feature fail silently?" Ask: "If this feature ran for 6 months in production, what would slowly degrade?"
10. **Surface the uncomfortable.** If something feels architecturally fragile, semantically misleading, or "technically correct but practically dangerous," flag it — even if it passes every taxonomy check. Your unease is data.
11. **Never confuse reading with running.** A static code trace that looks correct is a hypothesis. An executed test that produces the expected output is evidence. Prefer evidence over hypothesis for critical features.

---

## §11. TAXONOMY EVOLUTION PROTOCOL

The Silent Failure Taxonomy is a living document. It grows with every project that uses it.

### How New Categories Are Born

1. **Pattern recognition:** When 3+ EMERGENT failures across different features share a common root cause or structural pattern, they are candidates for a new baseline category.

2. **Category proposal format:**
```markdown
### Category [N+1]: [NAME]
**What:** [One-line description of the failure pattern]
**Signals:** [Observable indicators in code]
**Check procedure:** [Step-by-step verification]
**First observed in:** [Project, FEAT-ID, date]
**Why existing categories don't cover it:** [Explanation]
```

3. **Immediate adoption:** Once proposed, the new category is added to the taxonomy and applied to ALL subsequent audits. It does not require approval — if the pattern is real, it is immediately dangerous.

### Cross-Project Learning

When Phase 9 completes a pre-release exhaustive audit, the agent generates a **Taxonomy Addendum** appended to the audit report:

```
TAXONOMY EVOLUTION: [Project Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Baseline categories used:    10
Emergent failures found:     [N]
New categories proposed:     [N]
Categories that found most failures: [ranked list]
Categories that found zero failures: [list — may indicate inapplicable, not absent]

Stack-specific observations:
  [Any failure patterns unique to this project's tech stack]

Domain-specific observations:
  [Any failure patterns unique to this project's business domain]
  
Recommendation: [Which emergent findings should be promoted to baseline]
```

This data feeds the next project. The taxonomy starts at 10 categories. After 5 projects, it may have 15. After 20, it may have 25. Each one was earned by a real failure that cost real debugging time.

---

## §12. SAVE OUTPUTS TO

```
_audit/feature_registry.md                    — living feature-to-code mapping (updated continuously)
_audit/feature_audit_[scope]_[date].md         — audit report per run
```

These files persist across sessions. The Feature Registry is a living document. Audit reports are append-only — each run creates a new dated file, preserving the audit trail.
