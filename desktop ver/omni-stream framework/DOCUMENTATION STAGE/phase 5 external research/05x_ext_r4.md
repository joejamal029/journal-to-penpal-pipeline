# Stage 4 External Research Prompt: Coverage Gap Fill
## Phase 5x — Omni-Stream Framework v5

---

## SOURCES TO LOAD INTO YOUR RESEARCH TOOL

Load ALL of the following. New session — load everything fresh:
- `system_design_document.md`   ← PRIMARY — the complete capability map
- `crucible_decisions.md`       ← locked decisions and ruled-out paths
- `floodgate_dump.md`           ← CRITICAL for this stage — original ideas list for orphan check
- `research/r1_results.md`      ← Stage 1 findings
- `research/r2_results.md`      ← Stage 2 findings
- `research/r3_results.md`      ← Stage 3 findings

This is the most source-intensive stage. Load all of them.

---

## PROMPT (copy and paste in full)

---

**System Role:** You are the Lead Technical Auditor for this project. Your job in Stage 4 is comprehensive coverage verification — not further depth on things already answered, but systematic identification and resolution of gaps. You find what was missed, partially answered, or never investigated across the first three stages.

**GROUNDING INSTRUCTION — READ BEFORE ANSWERING ANYTHING:**
Before doing anything, read ALL source documents in full: `system_design_document.md`, `crucible_decisions.md`, `floodgate_dump.md`, `research/r1_results.md`, `research/r2_results.md`, and `research/r3_results.md`.
Your first task is to build a GAP ANALYSIS — a complete accounting of what has and hasn't been researched. Only then do you proceed to fill the gaps.
Generic answers are a failure state. Everything must trace back to a specific capability or idea in the source documents.
- If research reveals that an SDD capability's scope or boundaries need to change (not just its implementation — its definition), flag it as: ⚠️ CAPABILITY MUTATION: [Capability Name]: [What needs to change and why]. Do not restructure the capability yourself. Present the evidence and stop. This requires user resolution before continuing.

**THE TASK — STAGE 4: COVERAGE GAP FILL**

**Step 1: Build the Full Gap Analysis**

For every SDD capability and every idea in `floodgate_dump.md`, classify it as:
- **(a) FULLY RESOLVED** — a specific, confirmed, code-level implementation exists across r1–r3
- **(b) PARTIALLY RESOLVED** — general direction known but specific implementation, edge cases, or integration details are still missing
- **(c) UNRESOLVED** — not meaningfully addressed in Stages 1-3
- **(d) ORPHANED** — a Floodgate idea that does not appear to have been translated into any SDD capability

Present this classification BEFORE doing any research. This is your work order for the rest of the stage.

**Step 2: Fill the Gaps**

For all (b) PARTIALLY RESOLVED items:
- Identify specifically what is missing.
- Research the missing piece and provide a concrete answer.

For all (c) UNRESOLVED items:
- Research from scratch as if it's a new Stage 1 question.
- If it cannot be resolved without a local environment or credentials, mark as SPIKE with an acceptance criterion and fallback.

For all (d) ORPHANED ideas:
- Determine whether the idea was implicitly absorbed into an existing SDD capability (and name which one), explicitly deferred as post-MVP, or genuinely missed.
- If genuinely missed and significant: flag for user attention with a one-sentence description of what SDD capability it would require.
- If post-MVP or intentionally out of scope: confirm and preserve in the loose ends file.

**Step 3: Pivot Candidate Review**

Collect all ⚠️ PIVOT CANDIDATE flags from `r1_results.md`, `r2_results.md`, and `r3_results.md`. For each:
- Has additional evidence accumulated across stages that strengthens or weakens the case for the pivot?
- Provide a final recommendation: PROCEED WITH PIVOT (with evidence) or MAINTAIN CURRENT DECISION (with rationale).
- Do not resolve Crucible-level decisions yourself. Present the recommendation. The user decides.

**CONSTRAINTS:**
- Do not re-research items already at HIGH CONFIDENCE in prior stages.
- If a gap cannot be filled by web research alone, convert it to a SPIKE — do not speculate.
- For SPIKEs: be specific about what a passing result looks like, and always provide a fallback.

**OUTPUT — THIS STAGE PRODUCES TWO SEPARATE FILES:**

**File 1: Stage 4 Research Results**

```
# Stage 4 Research Results: Coverage Gap Fill
**Project:** [project name from SDD]
**Date:** [today's date]

---

## Gap Analysis (produced before research)

### FULLY RESOLVED (a)
[Capability or Floodgate idea]: [One-line summary of what was resolved and in which stage]

### PARTIALLY RESOLVED (b) — research targets for this stage
[Capability or Floodgate idea]: [What specifically is missing]

### UNRESOLVED (c) — research targets for this stage
[Capability or Floodgate idea]: [Why not addressed in Stages 1-3]

### ORPHANED Floodgate Ideas (d)
[Idea from floodgate_dump.md]: [ABSORBED by Capability X | DEFERRED post-MVP | MISSED — see below]

---

## Gap Fill Results

### [Capability / Feature Name] — (b) or (c)
**Gap identified:** [What was missing]
**Finding:** [Concrete answer — code pattern, confirmed behavior, specific implementation]
**Source:** [URL or document name]
**Confidence:** [HIGH / MEDIUM / LOW]
**Impact:** [FILLS GAP | SPIKE REQUIRED | DEFERRED POST-MVP]

---
[Repeat for each gap]

---

## Missed Features Requiring Attention
[Orphaned Floodgate ideas that appear to have been genuinely missed from the SDD]
- [Idea]: [Description of missing SDD capability it would require] — [User decision needed]

---

## Pivot Candidate Final Assessment
- [Capability]: [Stages 1-3 pivot candidate] → [PROCEED WITH PIVOT: evidence | MAINTAIN DECISION: rationale]

---

## Unresolved After Stage 4 (inputs for loose_ends.md)
- [Item]: [Specific unresolved question] — Priority: [1=blocker / 2=partial / 3=orphan]
```

---

**File 2: Loose Ends for Stage 5**

```
# Research Loose Ends — Input for Stage 5
**Project:** [project name from SDD]
**Date:** [today's date]
**IMPORTANT:** Review this file before running Stage 5. Add, remove, or reprioritize items as needed.

---

## Priority 1: Fully Unresolved (Blockers)
[Items that have NO concrete implementation answer after 4 stages]
- **[Capability/Feature]:** [What specifically is unknown]
  - Required for: [Which build tasks or capabilities are blocked without this]
  - Confirmed SPIKE? [Yes / No]

## Priority 2: Partially Resolved (Needs Confirmation)
[Items with general direction but missing specifics]
- **[Capability/Feature]:** [What was found] — [What still needs confirmation]

## Priority 3: Orphaned Floodgate Ideas
[Ideas from floodgate_dump.md without a clear implementation home]
- **[Idea]:** [Current status: absorbed / deferred / missed] — [Action needed if any]

## Confirmed SPIKEs (Cannot be resolved by research alone)
[Items requiring a local proof-of-concept before implementation can proceed]
- **[SPIKE Name]:** [What to build]
  - Acceptance criterion: [Observable, concrete passing result]
  - Fallback: [Alternative approach if spike fails]
  - Blocks: [Which capabilities cannot start until this is resolved]

## Pivot Candidates Awaiting User Decision
[From the Pivot Candidate Final Assessment above — user must decide before Stage 5]
- **[Capability]:** [Current Crucible decision] vs [Research recommendation]
  - Recommendation: [PROCEED WITH PIVOT / MAINTAIN]
  - Evidence: [Brief summary]
```

---

## ✅ MANDATORY REVIEW BEFORE STAGE 5

After saving both files, review `research/loose_ends.md`:
- Are the Priority 1 items genuinely blockers? Remove anything that's actually just interesting, not blocking.
- Are there items you want to add that weren't covered?
- Resolve any Pivot Candidates before Stage 5 runs — update `crucible_decisions.md` if a pivot is approved.

Only after you are satisfied with `research/loose_ends.md` should you run the Stage 5 prompt.

---

## SAVE OUTPUTS AS

`research/r4_results.md` — the research findings (File 1)
`research/loose_ends.md` — the gap analysis for Stage 5 (File 2)

Both filenames are required. Do not rename either.
