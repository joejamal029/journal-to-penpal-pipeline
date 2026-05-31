# Stage 5 External Research Prompt: Loose Ends Resolution
## Phase 5x — Omni-Stream Framework v5

---

## PREREQUISITE

You must have reviewed and finalized `research/loose_ends.md` before running this prompt. Any Pivot Candidates in that file must have a user decision. Any `crucible_decisions.md` updates from approved pivots must be made before loading sources.

If `research/loose_ends.md` still contains unresolved Pivot Candidates, resolve them first.

---

## SOURCES TO LOAD INTO YOUR RESEARCH TOOL

Load ALL of the following. New session — load everything fresh:
- `system_design_document.md`   ← the full capability map (updated if any pivots were approved)
- `crucible_decisions.md`       ← locked decisions (updated if any pivots were approved)
- `research/loose_ends.md`      ← YOUR EXPLICIT TASK LIST — read this first
- `research/r1_results.md`      ← Stage 1 findings
- `research/r2_results.md`      ← Stage 2 findings
- `research/r3_results.md`      ← Stage 3 findings
- `research/r4_results.md`      ← Stage 4 findings

This is the most intensive stage. All prior results are sources. Build on everything.

---

## PROMPT (copy and paste in full)

---

**System Role:** You are the Chief Technical Resolver for this project. This is the final research stage. Your job is to produce definitive, code-level answers for every item in `research/loose_ends.md`. No more "direction is clear but specifics are missing." By the end of this stage, every item in the loose ends file is either RESOLVED with a concrete implementation or assigned a SPIKE with a specific acceptance criterion and fallback. Nothing carries forward as an open question.

**GROUNDING INSTRUCTION — READ BEFORE ANSWERING ANYTHING:**
Before formulating any answer, read ALL source documents in full — especially `research/loose_ends.md` (your task list) and all prior stage results.
- Your task list is `research/loose_ends.md` — work through it in priority order: Priority 1 first, then 2, then 3.
- Build on prior stage findings. If Stage 1 found 60% of an answer, your job is the remaining 40% — not a repeat of Stage 1.
- If Stage 5 finds a better approach than what an earlier stage found, the Stage 5 answer takes full precedence. State explicitly what it supersedes and why.
- If research in this stage reveals a new Architectural Pivot not previously flagged — stop. Flag it as ⚠️ CRITICAL PIVOT: [details]. This requires immediate user attention before synthesis can begin.
- Maximum practicality. Code-level. Working examples. No theory.
- If research reveals that an SDD capability's scope or boundaries need to change (not just its implementation — its definition), flag it as: ⚠️ CAPABILITY MUTATION: [Capability Name]: [What needs to change and why]. Do not restructure the capability yourself. Present the evidence and stop. This requires user resolution before continuing.

**THE TASK — STAGE 5: LOOSE ENDS RESOLUTION**

Work through `research/loose_ends.md` in priority order.

**For each Priority 1 (Fully Unresolved / Blocker) item:**
1. Research from multiple sources. Do not stop at the first result.
2. Provide the definitive implementation — step-by-step with actual code.
3. If this truly cannot be resolved without a local environment (after exhausting research): formalize it as a SPIKE:
   - What to build: a standalone script under 100 lines
   - What to validate: the specific technical question
   - Passing result: an observable, concrete outcome
   - Fallback: the alternative approach if the SPIKE fails
   - What it blocks: which capabilities cannot proceed without this answer

**For each Priority 2 (Partially Resolved) item:**
1. Identify the specific missing piece.
2. Provide the concrete answer for that specific piece.
3. Reference what the prior stage found and state explicitly whether this confirms, updates, or supersedes it.

**For each Priority 3 (Orphaned Floodgate Idea) item:**
Make a final decision:
- **FOLD IN:** The idea belongs in the MVP. Name which SDD capability it joins and what implementation it requires (brief — a full spec is not needed here, that's for the SDD update).
- **DEFER POST-MVP:** The idea is valid but out of scope. Confirm this explicitly with a one-sentence reason and note what it would depend on for future implementation.
- **DROP:** The idea is superseded, irrelevant, or subsumed by another capability. State why.

**For any Pivot Candidates not yet resolved:**
If any ⚠️ PIVOT CANDIDATES remain from Stages 1-4 and were not resolved in the loose ends review, address them here with a final recommendation (evidence-based). The user must confirm before synthesis.

**CONSTRAINTS:**
- No open questions at the end of this stage. Every item is RESOLVED, SPIKE, DEFERRED, or DROPPED.
- Do not repeat what prior stages already answered at HIGH CONFIDENCE.
- Prefer source code over documentation. Prefer verified examples over theory.
- For SPIKEs: the script specification must be concrete enough that a developer can write it in under 2 hours.

**OUTPUT FORMAT — follow this exactly:**

```
# Stage 5 Research Results: Loose Ends Resolution
**Project:** [project name from SDD]
**Date:** [today's date]

---

## Priority 1 Resolutions

### [Item from loose_ends.md]
**Prior research context:** [What Stages 1-4 found — one sentence, don't repeat in full]
**Final answer:**
  [Step-by-step implementation with actual code patterns]
  ```[language]
  [Working code]
  ```
**Supersedes:** [If this updates a prior stage's finding: "Supersedes Stage [N] finding on [topic] — [why this is better]" | "No prior finding — new answer"]
**Source:** [URL or document name]
**Confidence:** HIGH
**Status:** RESOLVED

---
[If SPIKE required instead:]

### [Item from loose_ends.md]
**Prior research context:** [What Stages 1-4 found]
**Why research cannot resolve this:** [Specific reason — requires local environment / credentials / hardware / etc.]
**SPIKE specification:**
  - What to build: [Standalone script description, under 100 lines]
  - What to validate: [The specific technical question]
  - Passing result: [Observable, concrete outcome — "renders X", "returns Y in under Z ms"]
  - Fallback if fails: [Specific alternative approach]
  - Blocks: [Which capabilities / plan.md phases cannot start without this]
**Status:** SPIKE_REQUIRED

---

## Priority 2 Resolutions

### [Item]
**Missing piece:** [What specifically was still unknown after prior stages]
**Confirmation / Update:**
  [Concrete answer]
**Relation to prior finding:** [CONFIRMS Stage N finding | UPDATES Stage N finding — [what changed] | SUPERSEDES Stage N finding — [what changed and why]]
**Source:** [URL or document name]
**Confidence:** [HIGH / MEDIUM]
**Status:** RESOLVED / PARTIALLY_RESOLVED

---

## Priority 3 Decisions

### [Floodgate Idea]
**Decision:** [FOLD_IN / DEFER_POST_MVP / DROP]
**Rationale:** [One sentence]
[If FOLD_IN: **Joins capability:** [Capability name] — **Implementation note:** [Brief — what it adds]]
[If DEFER_POST_MVP: **Depends on:** [Which MVP capability or phase]]
[If DROP: **Reason:** [Superseded by X / Subsumed by Y / No longer valid because Z]]

---

## Remaining Pivot Candidates (if any)
[Final recommendations on any unresolved ⚠️ PIVOT CANDIDATES]
- [Capability]: [Current decision] vs [Stage 5 finding]
  - Final recommendation: PROCEED WITH PIVOT / MAINTAIN CURRENT DECISION
  - Evidence: [Brief summary]
  - ⚠️ USER DECISION REQUIRED BEFORE SYNTHESIS

---

## Final Stage Status
- Priority 1 items: [X resolved / Y as SPIKE / Z other]
- Priority 2 items: [X resolved / Y partially resolved]
- Priority 3 items: [X folded in / Y deferred / Z dropped]
- Unresolved Pivot Candidates: [X — list them if any]
- Open questions remaining: [Should be 0. If not 0, list them and explain why they cannot be resolved.]
```

---

## SAVE OUTPUT AS

`research/r5_results.md`

Do not rename.

---

## BEFORE RUNNING SYNTHESIS

Review the Final Stage Status at the bottom of your output. If "Open questions remaining" is not 0, resolve them before proceeding to the synthesis prompt. If Pivot Candidates require user decisions, get those decisions and update `crucible_decisions.md` before synthesis.

Only when "Open questions remaining: 0" and all Pivot Candidates are resolved should you run `05x_ext_synthesis.md`.
