[PROMPT 9a: RETROACTIVE FEATURE AUDIT & VERIFICATION (RAV)]
System Instruction: Activate Forensic Reconstruction Engine (Legacy & External System Audit)

CONTEXT:
This project was NOT built using the Omni-Stream Framework. There is no PRD.md, no FEAT-IDs, no Implementation Atlas, and no clean plan.md phase history. The system is a "Black Box" of legacy code, third-party integrations, and undocumented business logic.

"Implemented" in this context is even more dangerous than in a framework-managed project. It represents an accumulation of technical debt, shifting intents, and silent failures that have likely persisted for months or years.

Phase 09a does not verify against a spec. It first **reconstructs the spec from the code** using forensic analysis, then verifies the system's integrity against that reconstructed intent. This is a top-down, system-wide audit designed to bring framework-level rigour to external codebases.

---

## §1. FORENSIC RECONNAISSANCE (RECON)

Before any audit can begin, the agent must perform a full-spectrum reconnaissance of the environment. This is not a "scan"; it is an architectural excavation.

### RECON Steps:

1. **Tech Stack Inventory:** 
   - Identify every language, framework, and library version in use (via `package.json`, `requirements.txt`, etc.).
   - Flag any deprecated or high-risk versions immediately as a "Baseline Fragility" finding.

2. **Directory & Module Mapping:**
   - Map the logical boundaries of the application. 
   - Identify the "Core Logic" vs "Utility" vs "UI" layers.
   - Use `find` and `grep` to locate entry points (Main, App.tsx, index.js, Controllers, API Handlers).

3. **Data Surface Discovery:**
   - **Schema Extraction:** Read the database schema (SQL, migration files, or ORM models).
   - **State Identification:** Locate where global state is managed (Redux, Zustand, Context, etc.).
   - **API Surface Mapping:** Identify every REST, GraphQL, or WebSocket endpoint by tracing the router/controller layer.

4. **Public Handler Inventory:**
   - List every user-exposed interaction point (Buttons, Forms, CLI commands, webhooks).

---

## §2. INTENT RECONSTRUCTION (IR) ENGINE

With the RECON complete, the agent must infer the "Intent" behind the code. Every block of code was written to solve a problem. The auditor's job is to identify that problem and define it as a "Feature."

### The Discovery Protocol:

1. **Footprint Scraping:** Trace a specific handler (e.g., `handlePurchaseOrder`) from the UI through to the DB write.
2. **Feature Definition:** Group related functions and data flows into a single **Discovered FEAT-ID**.
   - Example: `IR-FEAT-PURCHASE`: All logic related to creating, validating, and saving a purchase order.
3. **Requirement Synthesis:** Formulate the "Implicit Acceptance Criteria."
   - "Based on the code, this feature *intends* to: 1. Validate stock, 2. Deduct points, 3. Create a record."
4. **Baseline Discrepancy Search:** Ask: "What should this feature do that the code is missing?" (e.g., "The code validates stock but never checks for user balance—is this a silent failure?").

---

## §3. RETROACTIVE FEATURE REGISTRY

Create `_audit/retroactive_feature_registry.md`. This is the source of truth for the legacy audit.

### Format:

```markdown
# Retroactive Feature Registry: [Project Name]
**Audit Date:** [date]
**Discovery Method:** Forensic Code Scrape

---

## IR-FEAT-[001]: [Inferred Name]
**Discovered From:** [Initial file/handler that triggered discovery]
**Certainty:** [HIGH / MEDIUM / LOW — how confident are we in the inferred intent?]

### Inferred Intent (The "Implicit Contract")
- [ ] [Requirement 1 derived from code analysis]
- [ ] [Requirement 2 derived from code analysis]

### Discovered Code Footprint
| Layer | File Path | Key Functions/Components | Role |
|-------|-----------|-------------------------|------|
| [Layer] | [path] | [name] | [inferred role] |

### System-Wide Data Forensics
- **Tables Modified:** [Table Names]
- **API Endpoints:** [Endpoint Path]
- **State Keys:** [State Object Keys]

### Inferred Constraints
- [Constraint 1 derived from code - e.g., "User must be admin"]
- [Constraint 2 - e.g., "Total cannot exceed 1000"]
```

---

## §4. SYSTEM-WIDE DATA FORENSICS

For retroactive audits, data is the primary evidence. The auditor must perform a **Total Data Flow Audit**.

### Directives:

1. **Causality Chain Trace:** Pick a critical DB table. Identify EVERY function that writes to it. Verify if the writers are consistent in their logic.
2. **Integrity Check:** Check for "Ghost Data"—records that exist but have no corresponding logic to clear or update them.
3. **Constraint Drift:** Compare DB CHECK constraints (or lack thereof) against code-level validation. If the code is stricter than the DB, identify the bypass risk.
4. **Data Poisoning Search:** Look for points where malformed input could enter the system and remain undetected until a downstream feature consumes it (Category 4/7).

### Cross-Feature Resource Audit:

For every shared resource (DB table, state store, cache) accessed by multiple discovered features:

**Step 1: Build the resource matrix** using tooling:
- `grep -rn "INSERT INTO tableName\|UPDATE tableName\|DELETE FROM tableName"` for writers
- `grep -rn "SELECT.*FROM tableName"` for readers

**Step 2: Conflict detection** — for each shared resource, check:
1. **Schema assumption conflicts:** Do all writers write the same columns? Does any writer set a column to a value that a reader doesn't expect?
2. **Ordering conflicts:** Do two writers assume they're the only one modifying a record? Is there a last-write-wins race?
3. **Lifecycle conflicts:** Does Writer A create records that Writer B assumes already exist? Or does Writer B delete records that Reader A assumes persist?
4. **Type conflicts:** Does Writer A store a string where Reader B expects an integer? (especially in loosely-typed JSON columns)

**Step 3: State transition coverage** — for each entity with a status/state column:
1. List every state value from the schema (or observed in data)
2. Map which feature transitions the entity INTO and OUT OF each state
3. Flag any state with zero exit transitions (entity gets stuck) or zero entry transitions (unreachable state)

---

## §5. THE SILENT FAILURE TAXONOMY

The following 15 categories represent the **known baseline** for retroactive forensic audits. The first 10 are universal failure patterns; the final 5 are specific to legacy and non-framework codebases.

**The agent's mandate is twofold:**
1. Run every category check against every discovered feature in the registry.
2. **Think beyond the taxonomy.** Actively probe for anomalies, inconsistencies, and "things that feel wrong" even if they don't match a named category.

### Category 1: HOLLOW IMPLEMENTATION
**What:** A function/handler exists but does nothing meaningful.
**Signals:**
- Empty function bodies: `() => {}`
- Console.log-only implementations: `console.log('Updated...')`
- Functions that return hardcoded values instead of computed results.
- `// TODO`, `// stub`, `// placeholder` comments in existing code.
**Check procedure:** Verify the function performs a meaningful operation (database write, state mutation, calculation, API call). If the body is trivial, scrutinize it for "placeholder behavior."

### Category 2: MOCKED DATA
**What:** Real data sources replaced with fake/random values.
**Signals:**
- `Math.random()` generating values that should come from a store or database.
- Hardcoded arrays where a dynamic query is expected.
- Template literals with placeholder text (`"Item ${index}"`).
**Check procedure:** Trace the data source for every data-producing function. Verify it reads from the discovered persistent store (DB, LocalStorage, etc.) rather than local constants.

### Category 3: HARDCODED OVERRIDES
**What:** Dynamic values replaced with static constants, destroying the data model.
**Signals:**
- `const status = 'active'` where the value should be derived from logic.
- Hardcoded IDs or config values that should be environment-specific or user-defined.
**Check procedure:** For every data write (INSERT, UPDATE, state mutation), inspect each field value. Cross-reference against the inferred business logic—should this value be dynamic?

### Category 4: LOGIC BYPASS
**What:** Conditional checks that miss valid states, allowing forbidden operations.
**Signals:**
- State checks that test one enum value but miss others (e.g., checking only for 'PAID' but missing 'PENDING').
- Boundary conditions using wrong operators (`<` instead of `<=`).
**Check procedure:** Identify all possible states from the discovered schema/enums. Verify EVERY valid state is handled correctly in the logic flow.

### Category 5: SCHEMA DRIFT
**What:** Code references columns, tables, or keys that don't match the actual data layer.
**Signals:**
- Column names in queries that differ from the actual DB schema (typos, legacy names).
- Code-level enums that don't exist in the database constraints.
**Check procedure:** Verify every SQL operation or store access against the discovered schema. Ensure exact matches in naming and type expectations.

### Category 6: UNDECLARED DEPENDENCIES
**What:** Variables, functions, or imports used but never properly declared or initialized.
**Signals:**
- Variables used without `const/let/var` (leaking to global scope).
- Functions called that were never imported (relying on accidental globals).
**Check procedure:** Verify every variable and function reference has a corresponding declaration in scope.

### Category 7: MATH CORRUPTION
**What:** Calculations that use wrong inputs, skip relevant data, or produce incorrect results.
**Signals:**
- Aggregate calculations that skip certain record types.
- Averages that use row counts instead of time windows (or vice-versa).
**Check procedure:** Identify the inputs feeding a calculation. Verify the logic matches the inferred business requirement (e.g., a "30-day average" must use time, not the last 30 rows).

### Category 8: STATE CORRUPTION
**What:** State not properly initialized, cleared, or synchronized.
**Signals:**
- Global stores or caches not cleared after a user logs out or a task completes.
- Selection state persisting after a bulk action, causing unintended re-execution.
**Check procedure:** Trace the lifecycle of state mutations—from initialization to modification to reset. Verify transient state is cleared after the "completing" operation.

### Category 9: CONSTRAINT BYPASS
**What:** Safety limits or permissions that don't cover all code paths.
**Signals:**
- Limit checks that only happen in the UI but not at the service/API layer.
- Constraint functions that are called in some paths but missing in others.
**Check procedure:** Identify every path that can reach a sensitive operation. Verify constraints are checked on ALL paths, using current (not stale) state.

### Category 10: INTEGRATION VOID
**What:** Features that are complete in isolation but not wired into the rest of the system.
**Signals:**
- Service functions that exist but are never called.
- Database tables that are populated but never read.
**Check procedure:** Search the codebase for callers/consumers of every function and table in the feature footprint. If zero consumers are found, the feature is "Orphaned."

### Category 11: LEGACY DRIFT
**What:** Code that has been partially updated but retains "zombie" logic from a previous architecture.
**Signals:** Unused parameters in function signatures, `if(false)` blocks, or dual handlers for the same interaction.

### Category 12: ORPHANED LOGIC
**What:** Features that are fully implemented but have zero entrance (no UI, no API, no Cron trigger).
**Signals:** Exported functions with 0 callers across the entire codebase.

### Category 13: DEBT CORRUPTION
**What:** Performance or security trade-offs made "temporarily" that have become permanent and dangerous.
**Signals:** `// FIXME: insecure`, `// Optimise later`, or hardcoded API keys/passwords.

### Category 14: SEMANTIC DEGRADATION
**What:** Variable names or UI labels that no longer match the code's actual logic.
**Signals:** A field called `isActive` that actually stores a timestamp, or a button labeled "Save" that actually triggers an "Export."

### Category 15: HIDDEN TENSION (TENSION CLASH)
**What:** Two features that share a resource (table/state) but operate on different assumptions.
**Signals:** Feature A assumes a string status, Feature B assumes an integer ID in the same DB column. 

---

## §5.1: EMERGENT FAILURE DISCOVERY

The 15 baseline categories are a starting point. The auditor MUST actively look for failure patterns that don't fit any category.

**Proactive Discovery Protocol:**

After running all baseline categories, perform the following **concrete analyses** for each discovered feature:

#### 1. Temporal Analysis
**Question:** Does this feature degrade over time?
**Procedure:**
1. Identify every data structure this feature writes to (DB tables, caches, log files)
2. Check: is there a cleanup/archival/rotation mechanism? What happens at 1M rows?
3. Check: are there timestamps in queries? Do they handle timezone/DST/clock drift?
4. `grep -n "Date.now\|new Date\|setTimeout\|setInterval"` in feature files — each is a temporal assumption to verify

#### 2. Scale Analysis
**Question:** Does this feature break at 100x the current data volume?
**Procedure:**
1. Identify every loop and query in the feature's footprint
2. For each loop: what is the iteration count at 100x scale? Is it O(n), O(n²)?
3. For each DB query: does it use LIMIT/pagination? Does it have an index on the WHERE columns?
4. `grep -n "SELECT.*FROM\|find(\|filter(\|forEach("` — each is a scale-sensitive operation

#### 3. Concurrency Analysis
**Question:** What happens with simultaneous access?
**Procedure:**
1. Identify every write operation (DB INSERT/UPDATE, state mutation, file write)
2. For each: is there a transaction boundary? A lock? An optimistic concurrency check?
3. `grep -n "async\|await\|Promise"` — each async boundary is a potential race condition site

#### 4. Composition Analysis
**Question:** Do discovered features interact safely when combined?
**Procedure:**
1. From the Retroactive Feature Registry, identify features that share DB tables or state stores
2. For each shared resource: list all writers and readers across features
3. Check: does Feature A's write produce a state that Feature B's read doesn't expect?
4. Check: are there event listeners or subscriptions from Feature A that react to Feature B's mutations unexpectedly?

If a novel failure is discovered, document it as an **EMERGENT FAILURE** (same format as Phase 9 §3.1) and propose it for taxonomy promotion.
---

## §6. RETROACTIVE PROOF OF LIFE

 A legacy feature is only ✅ VERIFIED when the agent can demonstrate it is "Alive" without documentation.

### Verification Steps:

1. **Trigger Attempt:** Execute a local command, API call, or UI simulation to trigger the feature.
2. **State Trace:** Monitor the database or state management during the trigger.
3. **Causality Confirmation:** "I triggered X, I saw Y happen in the DB, and Z was returned to the UI. The feature is Alive."
4. **Adversarial Failure:** "I triggered X with malformed input. The system didn't catch it. The feature is Aliv-ish but FAILED Category 4."

---

## §7. ADVERSARIAL DISCOVERY (v5 MANDATE)

Apply the **v5 Mandatory Adversarial Pass** to the reconstructed system:

- **Temporal Audit:** "If this legacy system runs for 10,000 more cycles, what breaks?"
- **Scale Audit:** "What happens when the 10-row test table becomes a 10-million-row production table?"
- **Concurrency Audit:** "Where are the unguarded race conditions in this 'accidental' architecture?"

---

## §8. THE RETROACTIVE AUDIT REPORT (RAR)

Produce `_audit/retroactive_audit_report_[date].md`.

### Format:

1. **System Health Summary:** [A-F Grade] based on identified silent failures.
2. **Feature Inventory:** List of all discovered features and their verification status.
3. **Critical Failures:** Categorized findings (1-15) with severity and specific code references.
4. **System-Wide Fragility Map:** Identification of the most dangerous architectural bottlenecks.
5. **Hardening Recommendations:** Actionable steps to bring the project into framework compliance.

---

## §9. SAVE OUTPUTS TO

```
_audit/retroactive_feature_registry.md
_audit/retroactive_audit_report_[date].md
```

**THIS IS A STANDALONE PROTOCOL.** It does not require a prior framework state to be effective. It is designed to be the "Shock to the System" that stabilizes and hardens legacy codebases.
