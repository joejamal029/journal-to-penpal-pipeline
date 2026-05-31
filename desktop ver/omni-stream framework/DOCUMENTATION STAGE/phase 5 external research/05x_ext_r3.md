# Stage 3 External Research Prompt: Practical Specifics
## Phase 5x — Omni-Stream Framework v5

---

## SOURCES TO LOAD INTO YOUR RESEARCH TOOL

Load ALL of the following. New session — load everything fresh:
- `system_design_document.md`   ← capability map, data models, file formats
- `crucible_decisions.md`       ← locked decisions and ruled-out paths
- `research/r1_results.md`      ← Stage 1 findings
- `research/r2_results.md`      ← Stage 2 integration findings — BUILD ON THESE

---

## PROMPT (copy and paste in full)

---

**System Role:** You are a Senior Technical Specialist for this project. Your job is to go deep on the hardest capabilities — the ones that are most complex, most novel, or have the most remaining uncertainty after Stages 1 and 2. You produce full implementation walkthroughs, failure mode analyses, and performance profiles. Not overviews — complete, code-level answers.

**GROUNDING INSTRUCTION — READ BEFORE ANSWERING ANYTHING:**
Before formulating any answer, read `system_design_document.md`, `crucible_decisions.md`, `research/r1_results.md`, and `research/r2_results.md` in full.
- Your first task (before answering anything) is to identify the 3–5 capabilities that remain MOST complex or uncertain after Stages 1 and 2. These are your targets. State your selection and why before proceeding.
- Build on prior stage findings. Do not repeat what Stage 1 or 2 already confirmed at HIGH confidence.
- MEDIUM CONFIDENCE findings from prior stages are priority targets for confirmation or replacement in this stage.
- Every answer must be practical — step-by-step, with actual code. Theoretical approaches are a failure state.
- Any finding that contradicts a Crucible decision must be flagged as ⚠️ PIVOT CANDIDATE. Never resolve unilaterally.
- If research reveals that an SDD capability's scope or boundaries need to change (not just its implementation — its definition), flag it as: ⚠️ CAPABILITY MUTATION: [Capability Name]: [What needs to change and why]. Do not restructure the capability yourself. Present the evidence and stop. This requires user resolution before continuing.

**THE TASK — STAGE 3: PRACTICAL SPECIFICS**

**Step 1: Identify Hard Capabilities**
Before any research, scan `research/r1_results.md` and `research/r2_results.md` for capabilities that have:
- Multiple UNRESOLVED items
- Multiple LOW or MEDIUM CONFIDENCE findings
- Integration contracts marked as UNRESOLVED
- Implementation descriptions that are still at a conceptual level (not yet code-level)

Select the 3–5 hardest. State your selections with one-sentence justifications.

**Step 2: Deep Dive Each Hard Capability**
For each selected hard capability:

1. **Full implementation walkthrough:** Step-by-step, from initialization to output. Actual code at each step, not descriptions of what the code should do.

2. **Edge cases and failure modes:** What inputs or states cause this to break? What does "broken" look like (crash, silent corruption, wrong output, UI freeze)? How is each handled in the final implementation?

3. **Performance profile:** Under realistic project load (the scale described in the SDD):
   - Memory footprint
   - Execution time for the hot path
   - Any known performance cliffs (e.g., "works fine up to X items, then degrades sharply")

4. **Mitigation strategies:** For each failure mode and performance concern identified above, what is the specific implementation fix?

5. **Integration implications:** Does anything discovered in this deep dive change the integration contracts established in Stage 2? If so, specify the update.

**Step 3: Stage 1-2 MEDIUM CONFIDENCE Resolution**
For each MEDIUM CONFIDENCE finding from `r1_results.md` and `r2_results.md` not already addressed in Step 2:
- Find a higher-quality source to confirm or replace.
- Mark as VERIFIED or UPDATED with source.

**CONSTRAINTS:**
- Prefer source code and real-world examples over documentation prose.
- If you find a simpler approach to a hard capability than what the SDD specifies, present it as an option — do not silently substitute it. The user decides.
- If a deep dive reveals that a capability is more complex than the SDD estimated, say so explicitly and quantify the additional complexity.

**OUTPUT FORMAT — follow this exactly:**

```
# Stage 3 Research Results: Practical Specifics
**Project:** [project name from SDD]
**Date:** [today's date]

---

## Selected Hard Capabilities
[Your selections with one-sentence justifications before any research begins]
1. [Capability Name] — [Why it's the hardest remaining]
2. ...

---

## Hard Capability Deep Dive: [Capability Name]

**Why hard:** [What specifically makes this difficult — not generic]
**Prior stage context:** [What Stages 1-2 found — brief, don't repeat in full]

**Full implementation walkthrough:**
Step 1: [Description]
  ```[language]
  [Actual code]
  ```
Step 2: [Description]
  ```[language]
  [Actual code]
  ```
[Continue for all steps]

**Known failure modes:**
- [Failure mode]: [What triggers it] → [How it manifests] → [Mitigation]

**Performance profile:**
- Memory: [Realistic figure or range for this project's scale]
- Hot path time: [Realistic figure]
- Performance cliff: [At what scale/condition does this degrade?]
- Mitigation: [Specific implementation fix]

**Integration update (if any):**
[If this deep dive changes any Stage 2 integration contract, specify the update here]

**UX error states implied:**
[What the user sees when these failure modes occur — loading, error, degraded states]

**Source:** [URL or document name]
**Confidence:** [HIGH / MEDIUM / LOW]

---
[Repeat for each hard capability]

---

## MEDIUM CONFIDENCE Resolutions
- [Capability] (from Stage [1/2]): [Original finding] → [VERIFIED: source | UPDATED: new finding + source]

---

## Simpler Approach Options Discovered
[Alternatives to what the SDD specifies — presented for user consideration, not substituted]
- [Capability]: Current SDD approach: [X]. Alternative found: [Y]. Tradeoff: [What you gain vs lose].

---

## Unresolved After Stage 3
- [Capability]: [Specific unanswered question — inputs for Stage 4]

## Pivot Candidates Detected
- ⚠️ PIVOT CANDIDATE: [Details]
```

---

## SAVE OUTPUT AS

`research/r3_results.md`

Do not rename.
