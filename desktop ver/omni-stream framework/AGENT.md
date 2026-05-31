# Omni-Stream Framework v5 — Agent Guide

This is a **proactive prompt engineering framework** for building complex software projects from zero to production. It transforms rigid, checklist-based protocols into an open-ended verification engine that mandates critical thinking, adversarial analysis, and the systematic discovery of silent failures.

**This file is the entry point.** Read this to understand what the framework is, how it's organized, and which file to open for any given task.

---

## What This Framework Does

The Omni-Stream Framework takes a user from a raw idea to a fully documented, research-backed, implementation-ready project — and then governs the build agent that writes the code. It operates in two stages:

**Documentation Stage (Phases 1-7):** Extracts ideas → resolves architecture → researches implementations → formalizes specs → generates build scaffold.

**Implementation Stage (Phase 8):** Audits the docs → governs the build agent with verification loops → recovers from failures.

Every downstream document traces to an upstream source. However, the documentation is the **baseline**, not the ceiling. The agent is mandated to think beyond the written spec, looking for hidden gaps, systemic risks, and novel failure modes. No code is written without a documented requirement, and no feature is 'done' without proactive forensic verification.

---

## Framework Structure

```
omni-stream framework/
│
│── AGENT.md                          ← YOU ARE HERE (framework guide)
│── CLAUDE.md                         ← User's personal agent constitution (universal — all phases, all projects)
│
│── DOCUMENTATION STAGE ──────────────────────────────────────
│── [01_initialization.md](DOCUMENTATION%20STAGE/01_initialization.md)              ← Phase 1: Persona + workflow overview
│── [02_floodgate.md](DOCUMENTATION%20STAGE/02_floodgate.md)                   ← Phase 2: Maximalist idea extraction
│── [03_crucible.md](DOCUMENTATION%20STAGE/03_crucible.md)                    ← Phase 3: Architectural decisions
│── [04_anatomy.md](DOCUMENTATION%20STAGE/04_anatomy.md)                     ← Phase 4: Feature mapping + data models
│── [05_deep_research.md](DOCUMENTATION%20STAGE/05_deep_research.md)               ← Phase 5: Autonomous research (main)
│── [phase 5 external research/](DOCUMENTATION%20STAGE/phase%205%20external%20research/)        ← Phase 5: External research pathway
│   ├── [05x_ext_guide.md](DOCUMENTATION%20STAGE/phase%205%20external%20research/05x_ext_guide.md)              ← External research routing guide
│   ├── [05x_ext_r1.md](DOCUMENTATION%20STAGE/phase%205%20external%20research/05x_ext_r1.md)                 ← Stage 1: Initial Mapping
│   ├── [05x_ext_r2.md](DOCUMENTATION%20STAGE/phase%205%20external%20research/05x_ext_r2.md)                 ← Stage 2: Deep Technical Validation
│   ├── [05x_ext_r3.md](DOCUMENTATION%20STAGE/phase%205%20external%20research/05x_ext_r3.md)                 ← Stage 3: Integration Analysis
│   ├── [05x_ext_r4.md](DOCUMENTATION%20STAGE/phase%205%20external%20research/05x_ext_r4.md)                 ← Stage 4: Edge Cases
│   ├── [05x_ext_r5.md](DOCUMENTATION%20STAGE/phase%205%20external%20research/05x_ext_r5.md)                 ← Stage 5: Resolution & Closure
│   └── [05x_ext_synthesis.md](DOCUMENTATION%20STAGE/phase%205%20external%20research/05x_ext_synthesis.md)          ← Synthesis into Implementation Atlas
│── [06_spec_formalization.md](DOCUMENTATION%20STAGE/06_spec_formalization.md)          ← Phase 6: Research → spec documents
│── [07_build_scaffold.md](DOCUMENTATION%20STAGE/07_build_scaffold.md)              ← Phase 7: Spec → build governance
│
│── IMPLEMENTATION STAGE ─────────────────────────────────────
│── [08a_pre_build_hardening.md](IMPLEMENTATION%20STAGE/08a_pre_build_hardening.md)        ← Phase 8a: One-time doc audit
│── [08_build_protocol.md](IMPLEMENTATION%20STAGE/08_build_protocol.md)              ← Phase 8: Build-Verify-Fix engine
│── [08b_mid_build_recovery.md](IMPLEMENTATION%20STAGE/08b_mid_build_recovery.md)         ← Phase 8b: Recovery procedures
│── [09_feature_audit_protocol.md](IMPLEMENTATION%20STAGE/09_feature_audit_protocol.md)      ← Phase 9: Feature-level verification engine
│── [09a_retroactive_audit_protocol.md](IMPLEMENTATION%20STAGE/09a_retroactive_audit_protocol.md)  ← Phase 9a: Retroactive audit (legacy/external)
││
│── REFERENCE ────────────────────────────────────────────────
│── [sample project/](REFERENCE/sample%20project/)                   ← W-List sample (blueprint + bug data)
│── [implementation framework 1.md](REFERENCE/implementation%20framework%201.md)     ← Reference: klöss framework
│── [implementation framework 2.md](REFERENCE/implementation%20framework%202.md)     ← Reference: Production-Grade Directives
```

---

## Phase-by-Phase Reference

### Documentation Stage

| Phase | File | What It Does | Trigger |
|-------|------|-------------|---------|
| **1** | [01_initialization.md](DOCUMENTATION%20STAGE/01_initialization.md) | Sets up the Visionary Architect persona, declares the full workflow, lists all artifacts, defines checkpoints | Paste the prompt to start a new project |
| **2** | [02_floodgate.md](DOCUMENTATION%20STAGE/02_floodgate.md) | Maximalist idea extraction — structured dimension probing, no filtering, no feasibility checks | `[PROMPT 2: FLOODGATE]` trigger |
| **3** | [03_crucible.md](DOCUMENTATION%20STAGE/03_crucible.md) | Tension-first architectural decisions: platform, stack, trade-offs, ruled-out paths | `[PROMPT 3: CRUCIBLE]` trigger → **CHECKPOINT A** |
| **4** | [04_anatomy.md](DOCUMENTATION%20STAGE/04_anatomy.md) | Feature anatomy with capability map, data models, file formats, cross-cutting concerns | `[PROMPT 4: ANATOMY]` trigger → **CHECKPOINT B** |
| **5** | [05_deep_research.md](DOCUMENTATION%20STAGE/05_deep_research.md) | 5-stage autonomous research escalation → Implementation Atlas + Phase 6 Feed Map | `[PROMPT 5: DEEP RESEARCH]` trigger → **CHECKPOINTS C, D** |
| **5x** | [phase 5 external research/](DOCUMENTATION%20STAGE/phase%205%20external%20research/) | Alternative pathway when user supplies external research (e.g. from NotebookLM) | See [05x_ext_guide.md](DOCUMENTATION%20STAGE/phase%205%20external%20research/05x_ext_guide.md) |
| **6** | [06_spec_formalization.md](DOCUMENTATION%20STAGE/06_spec_formalization.md) | Translates Atlas → TECH_STACK, BACKEND_STRUCTURE, PRD, APP_FLOW, DESIGN_SYSTEM, FRONTEND_GUIDELINES | `[PROMPT 6: SPEC FORMALIZATION]` trigger |
| **7** | [07_build_scaffold.md](DOCUMENTATION%20STAGE/07_build_scaffold.md) | Translates spec suite → CLAUDE.md, plan.md, memory.md, progress.txt, LESSONS.md | `[PROMPT 7: BUILD SCAFFOLD]` trigger → **CHECKPOINT E** |

### Implementation Stage

| Phase | File | What It Does | When |
|-------|------|-------------|------|
| **8a** | [08a_pre_build_hardening.md](IMPLEMENTATION%20STAGE/08a_pre_build_hardening.md) | One-time schema audit, cross-doc consistency check, anti-pattern injection | Once, after Phase 7, before first build session → **CHECKPOINT F** |
| **8** | [08_build_protocol.md](IMPLEMENTATION%20STAGE/08_build_protocol.md) | Build-Verify-Fix execution engine: verification gates, plan mutation, regression prevention, self-improvement | Every build session → **CHECKPOINT G** at phase boundaries |
| **8b** | [08b_mid_build_recovery.md](IMPLEMENTATION%20STAGE/08b_mid_build_recovery.md) | Recovery procedures: fix loops, false completions, cascading regressions, wrong approaches, unknown state | As-needed when the build goes sideways |
| **9** | [09_feature_audit_protocol.md](IMPLEMENTATION%20STAGE/09_feature_audit_protocol.md) | Feature-level forensic verification: maps FEAT-IDs to code footprints, runs 10-category Silent Failure Taxonomy, requires Proof of Life chains with execution evidence for P0/P1 features | Phase boundaries, mid-build, pre-release |
| **9a** | [09a_retroactive_audit_protocol.md](IMPLEMENTATION%20STAGE/09a_retroactive_audit_protocol.md) | Retroactive forensic verification: reconstructs features from legacy code, full system-wide data forensics, 15-category legacy taxonomy | Audit of legacy or external projects |

---

## Human Checkpoints

The user reviews at these points:

| Checkpoint | When | What the User Reviews |
|-----------|------|----------------------|
| **A** | After Phase 3 | Architectural decisions (Crucible spine) |
| **B** | After Phase 4 | System Design Document |
| **C** | After Phase 5 Stage 4 | Loose ends before final research stage |
| **D** | After Phase 5 | Implementation Atlas before spec generation |
| **E** | After Phases 6+7 | Full spec suite + build plan before handoff |
| **F** | After Phase 8a | Pre-build hardening audit results |
| **G** | Phase 8 boundaries | Phase Completion Report (includes Feature Audit results) — approve next phase |
| **H** | Phase 9 pre-release gate | Feature Audit Report — all P0/P1 features must be VERIFIED |

---

## Artifact Flow

The framework produces artifacts in a strict dependency chain. Each artifact sources from the one before it:

```
User's raw ideas
    ↓
floodgate_dump.md
    ↓
crucible_decisions.md
    ↓
system_design_document.md
    ↓
research/r1–r5_results.md + loose_ends.md
    ↓
implementation_atlas.md  ← THE bridge document
    ↓
┌─────────────────────────────────────────┐
│ SPEC SUITE (Phase 6)                    │
│ PRD.md · APP_FLOW.md · TECH_STACK.md    │
│ DESIGN_SYSTEM.md · FRONTEND_GUIDELINES  │
│ BACKEND_STRUCTURE.md                    │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ BUILD GOVERNANCE (Phase 7)              │
│ CLAUDE.md · plan.md · memory.md         │
│ progress.txt · LESSONS.md               │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ PRE-BUILD AUDIT (Phase 8a)              │
│ _build_prep/schema_audit.md             │
│ _build_prep/consistency_audit.md        │
│ _build_prep/anti_patterns.md            │
└────────────────┬────────────────────────┘
                 ↓
         ┌───────────────┐
         │  BUILT CODE   │
         │  (Phase 8)    │
         └───────────────┘
```

---

## Quick Reference: "I Need To..."

### Start a new project
1. Open [01_initialization.md](DOCUMENTATION%20STAGE/01_initialization.md) and paste it as the system prompt
2. Follow the trigger sequence: `PROMPT 2` → `PROMPT 3` → ... → `PROMPT 7`
3. After Phase 7: run [08a_pre_build_hardening.md](IMPLEMENTATION%20STAGE/08a_pre_build_hardening.md)
4. Hand the full suite to the build agent with [08_build_protocol.md](IMPLEMENTATION%20STAGE/08_build_protocol.md)

### Understand how phases connect
Read [01_initialization.md](DOCUMENTATION%20STAGE/01_initialization.md) — it has the complete workflow overview, artifact manifest, phase outputs, and checkpoint list.

### Understand what the build agent receives
Read [07_build_scaffold.md](DOCUMENTATION%20STAGE/07_build_scaffold.md) — it defines every file the build agent reads at session start (CLAUDE.md, plan.md, progress.txt, LESSONS.md, spec suite).

### Understand how the build agent operates
Read [08_build_protocol.md](IMPLEMENTATION%20STAGE/08_build_protocol.md) — the Build-Verify-Fix loop (§3), verification gates (§4), plan mutation (§5), and anti-pattern rules (§8).

### Fix a stuck build
Read [08b_mid_build_recovery.md](IMPLEMENTATION%20STAGE/08b_mid_build_recovery.md) — 5 structured recovery procedures matching specific failure signals.

### Supply external research instead of running Phase 5
Read [05x_ext_guide.md](DOCUMENTATION%20STAGE/phase%205%20external%20research/05x_ext_guide.md) — it routes external research documents into the framework's synthesis pipeline.

### Audit documentation before building
Read [08a_pre_build_hardening.md](IMPLEMENTATION%20STAGE/08a_pre_build_hardening.md) — one-time schema audit + cross-doc consistency check + anti-pattern injection.

### Verify features actually work (kill silent failures)
Read [09_feature_audit_protocol.md](IMPLEMENTATION%20STAGE/09_feature_audit_protocol.md) — the Feature Audit & Verification engine. Maps every FEAT-ID to its code footprint (tooling-first), runs 10-category Silent Failure Taxonomy with concrete procedural discovery, and requires Proof of Life chains with execution evidence for P0/P1 features. Runs at phase boundaries, mid-build checkpoints, and pre-release.

### Understand the user's operating philosophy
Read [CLAUDE.md](CLAUDE.md) — the user's personal agent constitution. This is the **universal behavioral layer** that applies to ALL agents across ALL phases and ALL projects. It defines:
- **"See Past My Blind Spots" mode** — proactive elevation, premise challenge, system-wide thinking
- **Anti-boxing principle** — current patterns are context, not constraints
- **Token efficiency rules** — surgical edits, diffs over rewrites
- **Priority rules** — augment workable plans, flag suboptimal ones, challenge wrong premises

> **Important:** This file is distinct from the project-specific `CLAUDE.md` generated by Phase 7. The authority stack is:
>
> | Layer | File | Scope | Contains |
> |-------|------|-------|----------|
> | **Behavioral** | `CLAUDE.md` (framework root) | All phases, all projects | How the user wants agents to think and operate |
> | **Technical** | `CLAUDE.md` (project dir, generated by Phase 7) | One project | Stack, hard rules, canonical doc suite, SPIKEs |
> | **Execution** | `08_build_protocol.md` | Implementation stage | Build-Verify-Fix loop, gates, mutation, regression |
>
> The personal CLAUDE.md is always read **first** (step 0 in every startup sequence). It is never overridden by project-level rules.

---

## Key Design Principles (The Open-Ended Mandate)

1. **The Baseline Directive:** Every checklist, audit protocol, and decision gate in this framework is a **known baseline**, not an exhaustive list. You are mandated to apply critical, adversarial thinking to look for failures, gaps, and tensions that aren't yet catalogued.

2. **Silent Failure Obsession:** A feature that "runs" is not "verified." "Implemented" is a preliminary state; "VERIFIED" is a forensic state requiring Proof of Life with execution evidence (for P0/P1) and an audit against the 10-category Silent Failure Taxonomy. Reading code and deciding it works is a proof of plausibility, not a proof of life.

3. **Adversarial Implementation:** You do not just build toward the "happy path." You are an adversary to your own code, hunting for its failure modes at every step.

4. **Uncertainty Escalation:** Confident language masking a lack of data is a failure. "Uncertainty" is a valid project signal. If a path is unclear, escalate it as an unclassified tension.

5. **Traceability & Provenance:** Every spec traces to the Atlas. Every plan task traces to a FEAT-ID. Every line of code traces to a spec. No document is an island.

6. **Adaptive planning:** The build plan is mutable. The agent updates it when reality diverges from the plan. A stale plan is a bug factory.

7. **Feature-level Forensic Audit:** Phase 8 gates catch structural bugs. Phase 9 catches behavioral bugs — features that are present but functionally dead. Every feature must prove it's alive through an observable chain from user action to output. Silent failures are the most dangerous bugs because they pass all structural checks.

---

## Version

**Omni-Stream Framework v5** — Proactive, Open-Ended, Adversarial Verification Engine.

- **Phases 1-7 (Documentation):** Research-backed spec generation with proactive gap detection and adversarial self-critique.
- **Phases 8-9 (Implementation):** Adaptive Build-Verify-Fix engine with Forensic Feature Auditing and Silent Failure Mitigation.
