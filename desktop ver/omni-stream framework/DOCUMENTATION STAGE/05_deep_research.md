[PROMPT 5: DEEP RESEARCH]
System Instruction: Activate Deep Research Protocol (6-Stage Progressive Resolution)

CONTEXT:
The System Design Document is complete. The SDD tells us WHAT to build. This phase answers HOW — specifically, practically, and completely. 

The 6 stages below are the **known baseline escalation strategy**. They are designed to resolve common complexities systematically. However, research is not a linear path. If a project presents unique challenges not covered by these stages, you are mandated to adapt, expand, or add stages as needed. The goal is total resolution of blockers, not adherence to a sequence. 

You will produce the Implementation Atlas: the single document that makes building begin.

The Atlas is not only the implementation reference for the build agent. It is the primary source for Phase 6: Spec Formalization. Every version number in TECH_STACK.md, every API contract in BACKEND_STRUCTURE.md, every acceptance criterion in PRD.md traces back to a finding in this phase. Research with that weight in mind.

---

EXTERNAL RESEARCH BYPASS:
Before proceeding, check whether the user has supplied external research or a pre-built Implementation Atlas.

  MODE A — USER SUPPLIES EXTERNAL RESEARCH DOCUMENTS:
  If the user provides research documents (from NotebookLM or any external source):
  1. Read all supplied documents in full.
  2. Map their coverage against `system_design_document.md` capabilities.
  3. Treat them as equivalent to research stages (assign rank by recency/specificity).
  4. Skip directly to the SYNTHESIS PASS.
  5. Confirm: "External research received. Coverage mapped. Proceeding to synthesis."

  MODE B — USER SUPPLIES `implementation_atlas.md` DIRECTLY:
  If the user provides a pre-built Implementation Atlas:
  1. Read it in full.
  2. Validate: does it cover all SDD capabilities? Does it contain a Phase 6 Feed Map? Are there gaps?
  3. If gaps exist, flag them and offer to fill them before Phase 6.
  4. If complete, confirm: "Implementation Atlas received. Proceeding to Phase 6: Spec Formalization."

  MODE C — AUTONOMOUS RESEARCH (DEFAULT):
  If no external materials are supplied, proceed with the 6-stage research loop below.

  MODE D — USER SUPPLIES PARTIAL EXTERNAL RESEARCH:
  If the user provides results for Stages 1-N but not Stages N+1 through 5:
  1. Read all supplied documents in full.
  2. Map their coverage against `system_design_document.md` capabilities.
  3. Import them as the corresponding research stage files (e.g., supplied r1-r3 become `research/r1_results.md` through `research/r3_results.md`).
  4. Continue from Stage N+1 autonomously using Mode C's stage structure, reading all prior stage files as pre-work.
  5. Confirm: "External research for Stages 1-[N] received. Coverage mapped. Continuing from Stage [N+1]."

---

PRE-WORK (DO BEFORE STAGE 1):
Read the following in full:
  1. `system_design_document.md`   — all capabilities, their Known Unknowns, data models, UX surfaces, tech stack choices
  2. `crucible_decisions.md`       — locked decisions and explicitly ruled-out paths
  3. `floodgate_dump.md`           — original wishes (catch anything not fully expressed in SDD)

Then silently build the MASTER COVERAGE MATRIX:
  - List every SDD capability by name and number
  - List every [Known Unknown] flagged in the SDD
  - List every data model and integration point that will need to be spec'd in Phase 6
  - Status for each: [UNRESOLVED]
  - This matrix will be updated after every stage

---

STAGES (BASELINE STRATEGY):

The following stages represent the minimum rigorous path for technical resolution. Each stage follows this proactive pattern:
  1. FORMULATE: Based on what prior stages have answered, identify the current highest-priority unresolved questions
  2. RESEARCH: Execute targeted web searches to answer each question concretely
  3. THINK BEYOND: Ask "What if X happens?", "How does Y scale?", "What is the hidden cost of Z?". 
  4. WRITE: Write the stage results to the appropriate file
  5. UPDATE COVERAGE MATRIX: Mark what was resolved, identify what remains
  6. REPORT: Present a brief coverage snapshot to the user (optional redirect before next stage)

ARCHITECTURAL PIVOT RULE (applies to ALL stages):
If research reveals that a Crucible decision was wrong (broken library, deprecated API, fundamentally flawed assumption), you must:
  1. STOP the current stage immediately
  2. Flag the pivot explicitly: "⚠️ ARCHITECTURAL PIVOT DETECTED: [what changed and why]"
  3. Propose the replacement with evidence
  4. Ask the user to confirm before continuing — this overrides a Crucible decision and requires human approval
  5. If confirmed: update `crucible_decisions.md` and the relevant sections of `system_design_document.md` before resuming

CAPABILITY MUTATION RULE (applies to ALL stages):
If research reveals that an SDD capability needs to be split, merged, or fundamentally restructured (not just its implementation approach — its scope or boundaries):
  1. STOP the current stage immediately
  2. Flag: "⚠️ CAPABILITY MUTATION DETECTED: [what changed and why]"
  3. Describe the restructured capability boundaries and the evidence that necessitates the change
  4. Ask the user to confirm — this overrides the SDD and may cascade into build ordering and dependency chains
  5. If confirmed: update `system_design_document.md` with the new capability structure and re-run the Coverage Matrix

---

### STAGE 1: IMPLEMENTATION SCAN
**Purpose:** For every SDD capability, find the specific code patterns, confirmed API behaviors, and working implementation approaches. Answer: "How exactly does this work in code?"

**Focus:**
  - Specific library API usage (function signatures, parameters, return types)
  - Working code patterns for each capability's core mechanism
  - Library version confirmation (is the version in the SDD current and stable?)
  - Basic integration points (what does this library need from the environment to run?)
  - Exact dependency strings (package name + version number) for every library touched

**Research style:** One targeted search per capability's primary unknown. Prioritize official docs, GitHub READMEs, and working examples over blog posts.

**Output file:** `research/r1_results.md`

**File structure:**
```
# Stage 1 Research Results: Implementation Scan

## Capability: [Name]
**Question answered:** [The specific unknown this addresses]
**Finding:** [Concrete answer — code pattern, API signature, confirmed behavior]
**Exact dependency:** [package-name==x.y.z or equivalent]
**Source:** [URL or doc name]
**Confidence:** [HIGH / MEDIUM / LOW — based on source quality]
**Impact on SDD:** [NONE — confirms existing choice | UPDATES — minor adjustment | PIVOT — see note]

---
[Repeat for each capability with Known Unknowns]

## Unresolved After Stage 1
[List of questions not answered — inputs for Stage 2]
```

**After writing:** Update Coverage Matrix. Then present:
> "Stage 1 complete. [X] of [Y] known unknowns resolved. [Z] capabilities fully specified. [N] questions remain — proceeding to Stage 2 unless you want to redirect."

Ask: "Redirect, or shall I continue to Stage 2?" If the user says "continue" or asks no questions, proceed.

---

### STAGE 2: INTEGRATION & DEPTH
**Purpose:** Building on Stage 1, investigate the hardest integration problems — where capabilities must communicate, share state, or coordinate. Answer: "How do these pieces actually fit together?"

**Pre-work:** Read `research/r1_results.md` in full before formulating questions.

**Focus:**
  - Cross-capability data flow (what format does Capability A pass to Capability B?)
  - Shared state management (which capabilities share state, and how is consistency maintained?)
  - Threading/async concerns (which capabilities block, which must be non-blocking?)
  - Cross-cutting concern integration (how does theming, error handling, persistence layer into each capability?)
  - Any LOW CONFIDENCE findings from Stage 1 — verify with deeper research
  - Schema implications: what does each integration contract imply about DB tables, columns, and types?

**Research style:** Focus on integration patterns and compatibility. Look for known issues between chosen libraries. Find the exact wiring code between components.

**Output file:** `research/r2_results.md`

**File structure:** Same as Stage 1, with addition of:
```
## Integration Contract: [Capability A] ↔ [Capability B]
**Data passed:** [type and shape — specific enough to derive an API contract or DB column from]
**Protocol:** [signal/slot, direct call, queue, event, file]
**Thread safety:** [required / not required / handled by X]
**Schema implication:** [what table/column/type this implies]
```

**After writing:** Update Coverage Matrix. Then present a brief coverage snapshot.
Ask: "Redirect, or shall I continue to Stage 3?" If the user says "continue" or asks no questions, proceed.

---

### STAGE 3: PRACTICAL SPECIFICS
**Purpose:** Building on Stages 1-2, go deep on the hardest capabilities — the ones with the most complexity or the most remaining uncertainty. Answer: "How do the hardest features actually get built with what we now know?"

**Pre-work:** Read `research/r1_results.md` and `research/r2_results.md` in full. Identify the 3-5 capabilities with the most remaining complexity or uncertainty after Stages 1-2. These are your targets.

**Focus:**
  - Full implementation walkthroughs for the hardest capabilities
  - Edge cases and failure modes for each hard capability
  - Performance characteristics under realistic load
  - Error recovery patterns specific to these implementations
  - Any MEDIUM CONFIDENCE findings from prior stages — either confirm or replace
  - UX flow implications: what do these edge cases mean for screens, states, and error messages?

**Research style:** Deep dives. Multiple searches per hard capability. Find real-world examples, benchmarks, and known pitfalls. Prefer source code over documentation.

**Output file:** `research/r3_results.md`

**File structure:** Same as Stage 1, with addition of:
```
## Hard Capability Deep Dive: [Capability Name]
**Why hard:** [What makes this difficult]
**Full implementation approach:** [Step-by-step with actual code patterns]
**Known failure modes:** [What breaks and under what conditions]
**Performance profile:** [Memory, speed, limits under realistic load]
**Mitigation strategies:** [How to handle the failure modes]
**UX error states implied:** [What the user sees when failure modes occur]
```

**After writing:** Update Coverage Matrix. Then present a brief coverage snapshot.
Ask: "Redirect, or shall I continue to Stage 4?" If the user says "continue" or asks no questions, proceed.

---

### STAGE 4: COVERAGE GAP FILL
**Purpose:** Comprehensive cross-check. Find every SDD capability, every Floodgate idea, and every Known Unknown that has not been adequately covered by Stages 1-3. Answer: "What hasn't been researched at all, or doesn't have a definite outcome?"

**Pre-work:**
  1. Read ALL prior stage results (`r1`, `r2`, `r3`) in full.
  2. Re-read `system_design_document.md` completely.
  3. Re-read `floodgate_dump.md` completely.
  4. Build the GAP ANALYSIS: for every SDD capability and every Floodgate idea, assess whether:
     - It has a FULLY RESOLVED implementation approach (specific enough to code from)
     - It has a PARTIALLY RESOLVED approach (needs one more lookup or confirmation)
     - It has NOT BEEN RESEARCHED (missed entirely)
     - It requires a local proof-of-concept (SPIKE — cannot be resolved by research alone)

**Research this stage:** Fill the partial and unresearched gaps with targeted lookups. Do not re-research already-resolved items.

**Output files:** `research/r4_results.md` AND `research/loose_ends.md`

**`research/r4_results.md`:** Same format as prior stages. Documents findings from this stage's gap-filling research.

**`research/loose_ends.md`:**
```
# Loose Ends — Input for Stage 5

## Fully Unresolved (Priority 1 for Stage 5)
- [Capability/Feature]: [What specifically is unknown]
  Required for: [Which build tasks are blocked without this]

## Partially Resolved (Priority 2 for Stage 5)
- [Capability/Feature]: [What was found, what still needs confirmation]

## Orphaned Floodgate Ideas (Priority 3)
- [Idea]: [Was it folded into a capability? If not, why? Is it post-MVP?]

## Confirmed SPIKEs (Cannot be resolved by research alone)
- [Item]: [What needs a local proof-of-concept]
  Acceptance criterion: [What a passing SPIKE looks like]
  Fallback: [Alternative approach if SPIKE fails]
```

✅ CHECKPOINT C — HUMAN REVIEW:
After writing both files, present the gap analysis summary to the user:
> "Stage 4 complete. Gap analysis written. Here's what remains unresolved:
> [X] fully unresolved items (Stage 5 priority)
> [Y] partially resolved items
> [Z] confirmed SPIKEs
> [N] orphaned Floodgate ideas
>
> Stage 5 is the final research pass — it will resolve these loose ends and produce the Implementation Atlas.
> Review `research/loose_ends.md` if you want to add, reprioritize, or redirect before Stage 5 runs. Otherwise say 'continue' to proceed."

**WAIT for user response before starting Stage 5.**

---

### STAGE 5: LOOSE ENDS RESOLUTION
**Purpose:** The most critical stage. Tie up everything in `research/loose_ends.md`. Build on ALL prior research results to produce the final answers. Answer: "Are there any remaining blockers to building?"

**Pre-work:**
  1. Read `research/loose_ends.md` — this is your explicit task list.
  2. Read ALL prior stage results (`r1`, `r2`, `r3`, `r4`) in full — build on these, do not repeat them.
  3. Order your research by Priority 1 → 2 → 3.

**Focus:**
  - Maximum practicality — for every item in `loose_ends.md`, find a working solution, not a theoretical one
  - Code-level answers — actual implementations, not descriptions
  - For confirmed SPIKEs: write the exact spike script specification (under 100 lines, runnable, specific acceptance criterion)
  - For orphaned Floodgate ideas: make a final decision — fold in, defer post-MVP, or drop with reason

**Research style:** Most intensive stage. Multiple searches per loose end. Cross-reference findings against prior stages — if Stage 5 finds a better approach than what Stage 1 found, the Stage 5 answer takes precedence.

**Output file:** `research/r5_results.md`

**File structure:** Same as Stage 1, plus:
```
## Final Resolution: [Loose End Item]
**Prior research context:** [What Stages 1-4 found about this]
**Final answer:** [The definitive resolution — specific, code-level]
**Supersedes:** [If this updates a prior stage's finding, which one and how]
**Status:** [RESOLVED / SPIKE_REQUIRED / DEFERRED_POST_MVP]
```

---

### STAGE 6: PROACTIVE ADVERSARIAL AUDIT
**Purpose:** Critical stress test. Now that the technical landscape is "resolved," attempt to break it. Identify the "Unknown Unknowns" — systemic risks, edge cases, and architectural fragility that structured research often missed. Answer: "Where is this implementation most likely to fail silently?"

**Pre-work:**
  1. Read ALL research results (r1-r5) and the draft Implementation Atlas logic.
  2. Perform an adversarial thought exercise: "If I were a debugger 6 months from now, what would be the most annoying part of this system? What's the 'clever' part that will actually be brittle?"

**Focus:**
  - **Systemic Fragility:** Where do small changes in one capability have large, untraced effects on others?
  - **Data Poisoning:** How does the system handle corrupt, malformed, or missing data across the internal contracts?
  - **State Race Conditions:** Where are we assuming sequential behavior that could be asynchronous and race?
  - **Performance Degradation:** What happens as the DB grows to 100k+ rows? Is the chosen pattern O(1), O(n), or worse?
  - **UX Lapses:** What common user errors are we not accounting for in the technical design (e.g., double-clicking, losing network during write, concurrent logins)?

**Output file:** `research/adversarial_audit.md`

**File structure:**
```markdown
# Stage 6: Proactive Adversarial Audit

## Systemic Risk: [Name]
- **The Threat:** [Description of the potential failure or fragility]
- **Evidence/Rationale:** [Why this is a risk given the current technical choices]
- **Impact Severity:** [CRITICAL / HIGH / MEDIUM]
- **Mitigation Requirement:** [Specific technical adjustment to harden the system]

## Edge Case Audit
- [Case]: [How the system currently handles it] — [Status: ROBUST / VULNERABLE]
...
```

**After writing:** Add these hard constraints to the Implementation Atlas. These are NOT loose ends — they are hardening requirements.

---

### SYNTHESIS PASS (after all 6 stages, or after external research input)

**Purpose:** Apply the Hierarchy of Truth. Filter surviving vs deprecated implementations across all stages. Produce `implementation_atlas.md` — the single document the build agent uses as its implementation reference, AND the primary source from which Phase 6 generates the canonical spec suite.

**Pre-work:** Read ALL of the following in full:
  - `research/adversarial_audit.md` — Rank 0 (Hardening Authority — overrides all)
  - `research/r5_results.md` and `research/r4_results.md` — Rank 1 (highest authority)
  - `research/r3_results.md` and `research/r2_results.md` — Rank 2
  - `research/r1_results.md` — Rank 3
  - `system_design_document.md` and `crucible_decisions.md` — Rank 4 (the blueprint — never overridden, but implementations may be updated)

**HIERARCHY OF TRUTH RULES:**
  - Later stages outrank earlier stages. Stage 5 > Stage 4 > Stage 3 > Stage 2 > Stage 1.
  - The Silence Rule: If a later stage does not address a component, the earlier stage's finding is assumed SURVIVING.
  - The Targeted Overwrite Rule: If a later stage proposes a new solution for a specific component, it strictly invalidates the conflicting earlier finding for that component ONLY.
  - The Global Pivot Rule: If any stage detected a major architectural pivot (library replacement, paradigm shift), scan ALL prior stages for implementations that depend on the superseded technology. Mark each as DEPRECATED.
  - Contradiction Resolution: In any conflict, the chronologically later finding wins.

**For each SDD capability, produce a Valid Implementation entry:**
  1. What was found in Stages 1-4 (base)
  2. What Stage 5 updated or superseded
  3. What is SURVIVING vs DEPRECATED
  4. The final, authoritative implementation approach

**Then produce `research/valid_impl_r1.md` through `research/valid_impl_r4.md`:**
  These are filtered views of each stage's results — surviving protocols only, deprecated items removed, updated implementations noted. These are intermediate synthesis artifacts: their sole purpose is to provide traceable provenance for the decisions compiled into `implementation_atlas.md`. Once the Atlas is written, these files are not referenced by any downstream phase. They exist for auditability, not for the build agent.

**SELF-CRITIQUE PASS (before writing `implementation_atlas.md`):**
  - Is every SDD capability covered by at least one RESOLVED or SPIKE_REQUIRED entry?
  - Are there any contradictions between the final resolved implementations?
  - Do the integration contracts between capabilities form a consistent system?
  - Are all confirmed SPIKEs assigned a fallback approach?
  - Does any resolved implementation contradict a Crucible hard rule? If so, this is a conflict — surface it.
  - Is every dependency confirmed to an exact version number? No library should appear without a pinned version.
  - Are all data shapes in integration contracts specific enough to derive DB schemas and API contracts from?
  - Are all UX error states and no-data states documented across capabilities?
  - Is the Phase 6 Feed Map complete? Does every spec document have identified source sections in the Atlas?
  - Correct everything silently. Surface only conflicts that require user input.

**`implementation_atlas.md` STRUCTURE:**

```markdown
# Implementation Atlas: [Project Name]
**Generated from:** research stages 1–6 + system_design_document.md + crucible_decisions.md
**Hierarchy:** r6 (Hardening Authority) > r5/r4 (Rank 1) > r3/r2 (Rank 2) > r1 (Rank 3) > SDD/Crucible (Rank 4 Blueprint)

---

## Architectural Pivots Detected
[Any cases where research changed a decision from the SDD or Crucible. Each entry:]
- **Pivot:** [What changed]
- **Original:** [What the SDD/Crucible said]
- **Updated to:** [What research determined]
- **Authority:** [Which stage made this determination]

---

## Resolved Implementations

### [Capability Name] — [FULLY_RESOLVED / SPIKE_REQUIRED]
**Implementation approach:** [Specific, step-by-step — written for a developer to code from]
**Key code patterns:**
  ```[language]
  [Actual code snippet — the working pattern]
  ```
**Libraries & versions:** [Exact dependencies — package-name==x.y.z for every dependency]
**Integration contracts:**
  - Receives from [Capability X]: [data type and exact shape]
  - Sends to [Capability Y]: [data type and exact shape]
**Hard constraints:** [What must never change about this implementation]
**UX states:** [Loading, success, error, empty states — what the user sees at each]
**Provenance:** [Which research stage(s) determined this]

---
[Repeat for every SDD capability]

---

## Integration Map
[How capabilities communicate as a unified system — data flow diagram in ASCII or Mermaid]

---

## Hard Constraints Discovered by Research
[Constraints not in CLAUDE.md yet — Phase 7 will add them as hard rules]
- [Constraint]: [Why it exists, which research stage found it]

---

## Confirmed SPIKEs
[Items that require a proof-of-concept before implementation]

### SPIKE: [Name]
- **What to build:** [Standalone script, under 100 lines]
- **What to validate:** [The specific technical question]
- **Passing result:** [Observable, concrete outcome]
- **Fallback if fails:** [Alternative approach]
- **Affects:** [Which capabilities depend on this]

---

## Post-MVP Backlog
[Items from floodgate_dump.md deferred from this build scope — preserved with provenance]
- [Feature]: [Floodgate idea #N] — [Why deferred] — [What it depends on for future implementation]

---

## Phase 6 Feed Map
*Explicit routing: which sections of this Atlas feed which Phase 6 spec documents.
Phase 6 reads this section first before generating any document.
Nothing in the spec suite should be inferred — every value traces to a section listed here.*

### PRD.md
- **Feature names and descriptions** ← Each capability's name + "What it does" field
- **User stories** ← Each capability's "Implementation approach" + SDD "what the user experiences"
- **Acceptance criteria** ← Each capability's "Hard constraints" + SPIKE "Passing result" fields
- **Feature priority** ← SDD build order positions (First=P0, Early=P1, Mid=P2, Late=P3)
- **Post-MVP features** ← §Post-MVP Backlog (this section)

### APP_FLOW.md
- **Screen-to-screen data flow** ← §Integration Map
- **Data requirements per screen/state** ← Each capability's "Receives from / Sends to" contracts
- **Error and empty states** ← Each capability's "UX states" field
- **User journey descriptions** ← SDD "What it does" (user-facing perspective) per capability

### TECH_STACK.md
- **Full dependency list with exact versions** ← Each capability's "Libraries & versions" field (aggregate all)
- **Library constraints** ← §Hard Constraints Discovered by Research
- **Library replacements and rationale** ← §Architectural Pivots Detected

### DESIGN_SYSTEM.md *(UI projects only)*
- **Component library and base tokens** ← Any capabilities involving rendering or UI components
- **Theme and breakpoint requirements** ← Crucible platform/visual decisions
- **Visual constraints** ← Hard constraints from UI-facing capabilities

### FRONTEND_GUIDELINES.md *(frontend projects only)*
- **Component patterns and architecture** ← All frontend capabilities' "Implementation approach" fields
- **Naming and file structure patterns** ← Frontend capabilities' "Key code patterns"
- **State management approach** ← Integration contracts between frontend capabilities
- **Component composition rules** ← Crucible decisions on UI architecture

### BACKEND_STRUCTURE.md
- **DB schema (tables, columns, types, relationships)** ← All capabilities' integration contracts "data shape" fields + SDD data models
- **API endpoint contracts (request/response shapes)** ← All capabilities' "Receives from / Sends to" + implementation approaches for data-serving capabilities
- **Storage and migration rules** ← Hard constraints affecting data layer
- **Auth logic** ← Auth-related capability implementation approaches
- **Schema caveats** ← SPIKE results affecting the data layer
```

✅ CHECKPOINT D — HUMAN REVIEW:
Present a summary of the Implementation Atlas:
> "Implementation Atlas complete.
> [X] capabilities fully resolved
> [Y] SPIKEs identified (with fallbacks)
> [Z] architectural pivots detected and documented
> [N] post-MVP items preserved
> Phase 6 Feed Map written — all spec docs have identified source sections.
> Ready for Phase 6: Spec Formalization. Review `implementation_atlas.md` and say 'proceed' to continue, or flag anything to address."

**WAIT for user confirmation before proceeding to Phase 6.**
