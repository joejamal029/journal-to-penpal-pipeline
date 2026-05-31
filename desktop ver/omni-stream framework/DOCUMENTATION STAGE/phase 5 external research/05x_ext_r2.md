# Stage 2 External Research Prompt: Integration & Depth
## Phase 5x — Omni-Stream Framework v5

---

## SOURCES TO LOAD INTO YOUR RESEARCH TOOL

Load ALL of the following. This is a new session — load everything fresh:
- `system_design_document.md`   ← capability map, integration contracts, cross-cutting concerns
- `crucible_decisions.md`       ← locked decisions and ruled-out paths
- `research/r1_results.md`      ← Stage 1 findings — BUILD ON THESE, DO NOT REPEAT THEM

---

## PROMPT (copy and paste in full)

---

**System Role:** You are a Senior Integration Architect for this project. Your job is to answer integration and compatibility questions with maximum specificity. You do not produce overviews. You produce exact wiring code, data contracts, and confirmed integration patterns between specific components.

**GROUNDING INSTRUCTION — READ BEFORE ANSWERING ANYTHING:**
Before formulating any answer, read `system_design_document.md`, `crucible_decisions.md`, and `research/r1_results.md` in full.
- `research/r1_results.md` contains Stage 1 findings. Build on them — do not re-research what Stage 1 already confirmed. Your job is to go deeper and wider.
- Where Stage 1 had LOW CONFIDENCE findings, your job is to either confirm or replace them with a higher-confidence answer.
- Every answer must respect the locked decisions in `crucible_decisions.md`. If you find an integration pattern that contradicts a locked decision, flag it as: ⚠️ PIVOT CANDIDATE: [details]. Do not resolve unilaterally.
- Generic integration advice is a failure state. Everything must be specific to the capabilities named in `system_design_document.md`.
- If research reveals that an SDD capability's scope or boundaries need to change (not just its implementation — its definition), flag it as: ⚠️ CAPABILITY MUTATION: [Capability Name]: [What needs to change and why]. Do not restructure the capability yourself. Present the evidence and stop. This requires user resolution before continuing.

**THE TASK — STAGE 2: INTEGRATION & DEPTH**

**Part A — Integration Contracts:**
For every pair of capabilities in `system_design_document.md` that share state or exchange data (check the "Cross-cutting concerns" and "Integration contracts" sections):
1. What exact data format is passed between them? (type, shape, field names — not "a dict" but the actual structure)
2. What is the communication protocol? (Qt signal/slot, direct method call, shared model, event queue, file on disk, etc.)
3. Is this communication thread-safe given the capabilities' threading requirements? If not, how is safety achieved?
4. What is the failure mode if this integration breaks? (graceful degradation, exception, silent corruption?)

**Part B — Cross-Cutting Concern Integration:**
For each cross-cutting concern identified in `system_design_document.md` (theming, error handling, persistence, etc.):
1. How exactly does it layer into individual capabilities? What does each capability need to call or subscribe to?
2. Is there a shared service object? What is its interface (method signatures)?

**Part C — Stage 1 LOW CONFIDENCE Verification:**
For each item listed under "Low Confidence Findings" in `research/r1_results.md`:
1. Find a higher-quality source to confirm or replace the finding.
2. If confirmed: mark as VERIFIED. If replaced: provide the updated finding and mark as UPDATED.

**Part D — Known Integration Risks:**
For the chosen tech stack (from `crucible_decisions.md` and `system_design_document.md`):
1. Are there known compatibility issues between the chosen libraries?
2. Are there known threading issues specific to this stack combination?
3. Are there version incompatibilities between any chosen dependencies?

**CONSTRAINTS:**
- Do not repeat findings from `research/r1_results.md` unless you are updating or superseding them.
- Do not investigate capabilities in isolation — focus on their interactions.
- If you cannot find a concrete integration contract for a specific capability pair, say "UNRESOLVED: [capability A] ↔ [capability B]: [specific unknown]"

**OUTPUT FORMAT — follow this exactly:**

```
# Stage 2 Research Results: Integration & Depth
**Project:** [project name from SDD]
**Date:** [today's date]

---

## Integration Contract: [Capability A] ↔ [Capability B]
**Data passed:** [Exact type and structure — field names, types, example value]
**Protocol:** [signal/slot | direct call | shared model | event queue | file | other]
**Thread safety:** [required / not required / handled by X — be specific]
**Schema implication:** [what table/column/type this integration implies for the data layer]
**Failure mode:** [What breaks and how it manifests if this contract is violated]
**Source:** [URL or document name]
**Confidence:** [HIGH / MEDIUM / LOW]

---
[Repeat for each capability pair with integration surface]

---

## Cross-Cutting Concern Integration

### [Concern Name]
**How capabilities subscribe/call it:** [Specific method calls or signals — per capability]
**Shared interface:**
  ```[language]
  [Method signatures or interface definition]
  ```
**Source:** [URL or document name]

---

## Stage 1 LOW CONFIDENCE Resolutions
- [Capability]: [Original finding] → [VERIFIED: source | UPDATED: new finding + source]

---

## Integration Risks Identified
- [Risk]: [Specific libraries/versions affected] — [Evidence] — [Mitigation]

---

## Unresolved After Stage 2
- [Capability A] ↔ [Capability B]: [Specific unanswered integration question]

## Pivot Candidates Detected
- ⚠️ PIVOT CANDIDATE: [What conflicts with a Crucible decision] — [Evidence]
```

---

## SAVE OUTPUT AS

`research/r2_results.md`

Do not rename.
