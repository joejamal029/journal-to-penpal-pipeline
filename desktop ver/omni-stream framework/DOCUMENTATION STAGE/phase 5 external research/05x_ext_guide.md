# External Research Pathway Guide
## Phase 5x — Omni-Stream Framework v5

---

## What this pathway is

This is the manual alternative to the autonomous Phase 5: DEEP RESEARCH. Instead of the agent running web research, you conduct the 5-stage research yourself using an external tool (e.g., NotebookLM, Perplexity, a custom GPT, or any source-grounded research environment). You then supply the results back to the autonomous agent, which synthesizes them into the Implementation Atlas and proceeds directly to Phase 6.

**Use this pathway when:**
- You want richer, more nuanced research than a single-session agent can produce
- You have domain-specific sources to load (papers, docs, prior projects)
- You prefer to review and annotate research results yourself before synthesis
- You're working across multiple sessions and want research to happen offline

---

## The pathway at a glance

```
[project directory]/
├── system_design_document.md    ← upload as source to every stage
├── crucible_decisions.md        ← upload as source to every stage
├── floodgate_dump.md            ← upload as source to Stage 4

External tool (NotebookLM etc.)
├── Stage 1: Implementation Scan     → save as research/r1_results.md
├── Stage 2: Integration & Depth     → save as research/r2_results.md
├── Stage 3: Practical Specifics     → save as research/r3_results.md
├── Stage 4: Coverage Gap Fill       → save as research/r4_results.md
│                                    → save as research/loose_ends.md  ← REVIEW THIS
├── Stage 5: Loose Ends Resolution   → save as research/r5_results.md
├── Stage 6: Adversarial Audit       → save as research/adversarial_audit.md
└── Synthesis                        → save as implementation_atlas.md

Then: supply implementation_atlas.md to autonomous agent → Phase 6 begins
```

---

## Critical rules

**File naming is non-negotiable.** The autonomous agent's Mode A and Mode B bypass paths expect exact filenames. Do not rename.

**Every stage must be its own session.** Load the correct source documents for each stage (listed in each prompt file). Mixing stages in one session pollutes the grounding.

**Add prior stage results as sources for each new stage.** This is the compounding mechanism — each stage builds on the last. The prompt files tell you exactly which to load.

**Preserve the output format exactly.** Each prompt specifies the output structure. The synthesis step depends on consistent formatting across all five stage files.

**Review `research/loose_ends.md` before starting Stage 5.** This is the only mandatory human review in the external pathway. Add items, reprioritize, or remove noise before Stage 5 executes.

---

## Re-entering the autonomous workflow

After you have produced `implementation_atlas.md`:

**Option 1 — Supply the Atlas directly (fastest):**
> "Here is my `implementation_atlas.md`. Proceed to Phase 6: Spec Formalization."
> The agent validates coverage, confirms the Phase 6 Feed Map is complete, and begins Phase 6 immediately.

**Option 2 — Supply all stage results (agent synthesizes):**
> "Here are my external research results: [attach r1–r5_results.md]. Please run the synthesis pass and produce the Implementation Atlas."
> The agent applies the Hierarchy of Truth, produces `implementation_atlas.md`, and proceeds to Phase 6.

**Option 3 — Supply partial results:**
> "I have completed Stages 1–3 externally. Please continue from Stage 4."
> The agent reads your r1–r3 files, continues from Stage 4 autonomously.

---

## Files in this pathway

| File | Purpose |
|------|---------|
| `05x_ext_guide.md` | This file |
| `05x_ext_r1.md` | Stage 1 prompt: Implementation Scan |
| `05x_ext_r2.md` | Stage 2 prompt: Integration & Depth |
| `05x_ext_r3.md` | Stage 3 prompt: Practical Specifics |
| `05x_ext_r4.md` | Stage 4 prompt: Coverage Gap Fill + Loose Ends |
| `05x_ext_r5.md` | Stage 5 prompt: Loose Ends Resolution |
| `05x_ext_r6.md` | Stage 6 prompt: Proactive Adversarial Audit |
| `05x_ext_synthesis.md` | Synthesis prompt: Implementation Atlas generation |
