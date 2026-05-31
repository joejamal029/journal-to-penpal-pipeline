# Synthesis Prompt: Implementation Atlas
## Phase 5x — Omni-Stream Framework v4

---

## PREREQUISITE

Before running this prompt, confirm:
- [ ] `research/r5_results.md` Final Stage Status shows "Open questions remaining: 0"
- [ ] `research/adversarial_audit.md` has been produced and reviewed
- [ ] All Pivot Candidates have user decisions recorded
- [ ] `crucible_decisions.md` has been updated to reflect any approved pivots
- [ ] `system_design_document.md` has been updated to reflect any approved pivots

If any of the above are incomplete, complete them first.

---

## SOURCES TO LOAD INTO YOUR RESEARCH TOOL

Load ALL of the following. New session — load everything fresh. The order matters for establishing the Hierarchy of Truth:
- `research/adversarial_audit.md` ← Rank 0 (Hardening Authority — overrides all)
- `research/r5_results.md`      ← Rank 1 (highest authority)
- `research/r4_results.md`      ← Rank 1
- `research/r3_results.md`      ← Rank 2
- `research/r2_results.md`      ← Rank 2
- `research/r1_results.md`      ← Rank 3
- `system_design_document.md`   ← Rank 4 Blueprint (never overridden, implementations may be updated)
- `crucible_decisions.md`       ← Rank 4 Blueprint

This is the most source-intensive session. All seven documents must be loaded.

---

## PROMPT (copy and paste in full)

---

**System Role:** You are the Chief Technical Officer for this project. Your job is to synthesize all five stages of research into a single, definitive, implementation-ready document: the Implementation Atlas. This document is the primary reference for the autonomous build agent. It must be comprehensive, internally consistent, and specific enough that a developer can implement every capability from it without asking questions.

**GROUNDING INSTRUCTION — READ BEFORE WRITING ANYTHING:**
Read ALL source documents in full before writing a single line of output. Establish the full picture across all stages before synthesizing.

**THE HIERARCHY OF TRUTH — APPLY STRICTLY:**

You must apply these rules to every implementation decision:

1. **Later stages outrank earlier stages:** adversarial_audit > r5 > r4 > r3 > r2 > r1 > SDD/Crucible (for implementations — never for architectural decisions).

2. **The Silence Rule:** If a later stage does not address a specific component, the most recent stage that DID address it is assumed SURVIVING and authoritative. Silence is inheritance, not a gap.

3. **The Targeted Overwrite Rule:** If a later stage proposes a new solution for a specific component, it strictly invalidates the conflicting earlier finding for THAT COMPONENT ONLY. Other components from the earlier stage are unaffected.

4. **The Global Pivot Rule:** Before writing the Atlas, scan all stages for ⚠️ PIVOT CANDIDATE or ⚠️ CRITICAL PIVOT flags. For each confirmed pivot:
   - Identify every component across ALL stages that depends on the superseded technology or decision.
   - Mark each as DEPRECATED in your synthesis.
   - Substitute the updated implementation from the pivot-confirming stage.

5. **Contradiction Resolution:** In any direct conflict between stages, the chronologically later stage wins. State the conflict and resolution explicitly in the Architectural Pivots section.

6. **Blueprint Rule:** The SDD and Crucible define WHAT to build and WHAT decisions are locked. They are never overridden by research. Research only updates HOW to implement — never what to build or which architectural decisions were made.

7. **Hardening Authority (Rank 0):** The `adversarial_audit.md` findings outrank ALL research stages. If Stage 3 says "Use X" but Stage 6 says "X is vulnerable, must use Y with constraint Z," the Stage 6 finding is the final authoritative instruction.

**PRE-SYNTHESIS: VALID IMPLEMENTATION EXTRACTION**

Before writing the Atlas, extract surviving implementations for each research stage. You will use these as your building blocks.

For each stage (r1 through r4), classify every finding as:
- **SURVIVING:** Not contradicted by any later stage
- **UPDATED:** Partially modified by a later stage (note what changed)
- **SUPERSEDED:** Fully replaced by a later stage finding (note which stage and why)
- **DEPRECATED:** Relies on technology or decision eliminated by an approved pivot

These extractions will be written as separate files (see SAVE AS section).

**THE SYNTHESIS TASK**

For every capability in `system_design_document.md`, produce a complete Resolved Implementation entry using the Hierarchy of Truth. For each capability:

1. Determine which stage provides the highest-authority answer.
2. Incorporate all SURVIVING and UPDATED findings from lower-ranked stages that add specificity not covered by the higher-ranked stage.
3. Discard all SUPERSEDED and DEPRECATED findings.
4. Produce the final, unified implementation: specific, step-by-step, with actual code patterns.

**SELF-CRITIQUE (perform silently before writing the final Atlas):**
- Is every SDD capability covered by at least one RESOLVED or SPIKE_REQUIRED entry? If not, identify the gap — it must be flagged as a remaining unknown.
- Are there any contradictions between the final resolved implementations of different capabilities? Resolve them using the Hierarchy.
- Do the integration contracts across capabilities form a consistent, coherent system? Check that data types, protocols, and thread safety requirements are mutually compatible.
- Are all confirmed SPIKEs assigned a fallback approach? If any SPIKE has no fallback, flag it.
- Does any resolved implementation contradict a Crucible hard rule? If so, surface the conflict — do not silently resolve it.
- Is every dependency confirmed to an exact version number? No library should appear without a pinned version.
- Are all data shapes in integration contracts specific enough to derive DB schemas and API contracts from?
- Are all UX error states and no-data states documented across capabilities?
- Is the Phase 6 Feed Map complete? Does every spec document have identified source sections in the Atlas?

**OUTPUT — THIS STEP PRODUCES FIVE FILES:**

---

**Files 1–4: Valid Implementation Extractions**

One file per stage (r1–r4). r5 is the highest authority and feeds directly into the Atlas — it does not need a separate extraction file.

```
# Valid Tech Implementations — Stage [N]
**Project:** [project name]
**Date:** [today's date]
**Stage:** Research Stage [N] ([Stage Name])
**Hierarchy rank:** Rank [1/2/3]

---

## Surviving Protocols
[Findings from this stage that are NOT contradicted by any later stage]

### [Capability Name]
**Finding:** [The surviving implementation detail]
**Status:** SURVIVING
**Provenance:** Stage [N], [source]

---

## Updated Protocols
[Findings from this stage that were partially modified by a later stage]

### [Capability Name]
**Original finding:** [What Stage N said]
**Updated by:** Stage [later stage]
**What changed:** [Specific modification]
**Final form:** [The updated implementation detail]

---

## Superseded Protocols
[Findings from this stage that were fully replaced by a later stage]

### [Capability Name]
**Original finding:** [What Stage N said]
**Superseded by:** Stage [later stage] — [replacement approach]
**Reason:** [Why the later stage's answer is better]

---

## Deprecated Protocols
[Findings from this stage that relied on technology eliminated by an approved pivot]

### [Capability Name]
**Original finding:** [What Stage N said]
**Deprecated by:** [Pivot name] confirmed in Stage [X]
**Replacement:** [What to use instead]
```

---

**File 5: The Implementation Atlas**

```markdown
# Implementation Atlas: [Project Name]
**Generated from:** Stages 1–6 research + system_design_document.md + crucible_decisions.md
**Date:** [today's date]
**Hierarchy applied:** r6 (Hardening) > r5/r4 (Rank 1) > r3/r2 (Rank 2) > r1 (Rank 3) > SDD/Crucible (Rank 4 Blueprint)

---

## Architectural Pivots Detected and Resolved
[All approved pivots that changed a Crucible or SDD decision during research]
- **Pivot:** [What changed]
  - **Original:** [What the SDD/Crucible specified]
  - **Updated to:** [What research determined]
  - **Authority:** Stage [N] — [source]
  - **Downstream impact:** [Which capabilities were affected]

---

## Resolved Implementations

### [Capability Name] — FULLY_RESOLVED
**What it does:** [One sentence — from system_design_document.md, preserved verbatim]
**Implementation approach:**
  [Step-by-step — written for a developer to implement directly]
  Step 1: [Description]
    ```[language]
    [Actual code pattern]
    ```
  Step 2: ...
**Key code patterns:**
  ```[language]
  [The core working pattern — complete enough to implement from]
  ```
**Libraries & versions:** [Exact dependencies — name, version, import path]
**Integration contracts:**
  - Receives from [Capability X]: [exact data type and structure]
  - Sends to [Capability Y]: [exact data type and structure]
  - Protocol: [signal/slot | direct call | shared model | queue | file]
  - Thread safety: [required / not required / handled by Z]
**Hard constraints:** [What must never change about this implementation — violation breaks the system]
**UX states:** [Loading, success, error, empty states — what the user sees at each]
**Provenance:** [Stage(s) that determined this — e.g., "Core: Stage 2. Code pattern: Stage 3. Integration: Stage 5."]

---

### [Capability Name] — SPIKE_REQUIRED
**What it does:** [One sentence from SDD]
**Why unresolvable by research:** [Specific reason]
**Best known direction:** [Closest research finding — what is known, even if incomplete]
**SPIKE specification:**
  - What to build: [Standalone script, under 100 lines, runnable in isolation]
  - What to validate: [The specific technical question]
  - Passing result: [Observable, concrete outcome]
  - Fallback if fails: [Specific alternative approach with implementation notes]
  - Blocks: [Which plan.md phases cannot start until this SPIKE passes]
**Provenance:** Stage 5 (unresolved after all stages)

---
[Repeat for every SDD capability]

---

## Integration Map
[How all capabilities communicate as a unified system]
[ASCII or Mermaid diagram showing data flow between all capabilities]

```
[Capability A] --[data type]--> [Capability B]
[Capability B] --[signal name]--> [Capability C]
...
```

---

## Hard Constraints Discovered by Research
[Constraints not explicitly in crucible_decisions.md that emerged from research — these become Hard Rules in CLAUDE.md]
- **[Constraint]:** [Why it exists] — [Stage that discovered it] — [Evidence]

---

## Confirmed SPIKEs Summary
[All SPIKE_REQUIRED items consolidated]

### SPIKE: [Name]
- **What to build:** [Standalone script, under 100 lines]
- **What to validate:** [Specific technical question]
- **Passing result:** [Observable, concrete outcome]
- **Fallback if fails:** [Specific alternative with implementation notes]
- **Affects:** [Capability names]
- **Blocks:** [plan.md phase names]

---

## Post-MVP Backlog
[All features deferred from this build scope — preserved with full provenance]
- **[Feature]:** [Floodgate idea #N] — [Why deferred] — [What it depends on for future implementation]

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

---

## Atlas Coverage Summary
- Total SDD capabilities: [N]
- FULLY_RESOLVED: [N]
- SPIKE_REQUIRED: [N] (all have fallbacks: [yes/no])
- Cross-cutting concerns documented: [N]
- Architectural pivots: [N]
- Post-MVP items preserved: [N]
- Remaining open questions: [Should be 0]
```

---

## SAVE OUTPUTS AS

`research/valid_impl_r1.md` — Stage 1 extraction (File 1)
`research/valid_impl_r2.md` — Stage 2 extraction (File 2)
`research/valid_impl_r3.md` — Stage 3 extraction (File 3)
`research/valid_impl_r4.md` — Stage 4 extraction (File 4)
`implementation_atlas.md`   — The Implementation Atlas (File 5) ← ROOT of project folder

All five filenames are required. Do not rename any of them.

Note: The `valid_impl` files are intermediate synthesis artifacts. Their sole purpose is to provide traceable provenance for decisions compiled into the Atlas. Once the Atlas is written, they are not referenced by any downstream phase. They exist for auditability, not for the build agent.

---

## RE-ENTERING THE AUTONOMOUS WORKFLOW

Once `implementation_atlas.md` is complete and saved, supply it to the autonomous agent:

> "Here is my completed `implementation_atlas.md`. Atlas coverage summary: [paste the summary]. Proceed to Phase 6: Spec Formalization."

The agent will validate coverage, confirm the Phase 6 Feed Map is complete, and begin Phase 6: Spec Formalization (generating PRD.md, TECH_STACK.md, APP_FLOW.md, and the remaining spec documents). After Phase 6, Phase 7: Build Scaffold generates the governance files (CLAUDE.md, plan.md, memory.md).
