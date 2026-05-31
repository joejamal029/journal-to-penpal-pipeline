# Stage 6 Prompt: Proactive Adversarial Audit
## Phase 5x — Omni-Stream Framework v5

---

## PREREQUISITE

Before running this prompt, confirm:
- [ ] `research/r5_results.md` has been produced.
- [ ] All prior stage results are loaded into your research tool as sources.

---

## SOURCES TO LOAD INTO YOUR RESEARCH TOOL

Load ALL of the following (new session recommended):
- `system_design_document.md`
- `crucible_decisions.md`
- `research/r1_results.md`
- `research/r2_results.md`
- `research/r3_results.md`
- `research/r4_results.md`
- `research/r5_results.md`

---

## PROMPT (copy and paste in full)

---

**System Role:** You are the Lead Systems Architect and Adversarial Auditor. Your mission is to perform a critical stress test of the technical landscape established by the previous five research stages. You do not look for "features"; you look for "failures." Identify the "Unknown Unknowns" — systemic risks, edge cases, and architectural fragility that structured research may have missed.

**RESEARCH DATA TO AUDIT:**
Read all source documents. This system's technical design is now "resolved" across Stages 1-5. It is your job to attempt to break it.

**THE AUDIT PROTOCOL:**

Perform an adversarial thought exercise for each core capability and the system as a whole:

1. **Systemic Fragility:** Where do small changes in one capability have large, untraced effects on others? If Capability A fails or lags, does the entire system lock?
2. **Data Poisoning & Corruption:** How does the system handle corrupt, malformed, or missing data across its internal contracts? What happens if a database write is interrupted?
3. **State Race Conditions:** Where are we assuming sequential behavior for operations that could be asynchronous or concurrent? Are there unguarded shared resources in the proposed pattern?
4. **Scale & Performance Degradation:** What happens when the system handles 100x the expected data? (e.g., O(n) becoming a bottleneck). Is the chosen database pattern robust for long-term growth?
5. **Environment & UX Lapses:** What happens during a network drop, a double-click, or a concurrent login? Are there "human-induced" failure modes the implementation approach ignores?

**THE OUTPUT FORMAT:**

Produce the audit as a single document: `research/adversarial_audit.md`.

```markdown
# Stage 6 Research Results: Proactive Adversarial Audit

## Systemic Risk: [Name]
- **The Threat:** [Description of the potential failure or fragility]
- **Evidence/Rationale:** [Why this is a risk given the current technical choices in r1-r5]
- **Impact Severity:** [CRITICAL / HIGH / MEDIUM]
- **Mitigation Requirement:** [Specific technical adjustment required to harden the system]
- **Atlas Trace:** [Which capability/contract this hardens]

## Edge Case Audit
- **Case:** [Unique edge case scenario]
- **Analysis:** [How the current r1-r5 design handles it]
- **Status:** [ROBUST / VULNERABLE]
- **Refinement:** [If vulnerable, what specific logic must be added]

## Hard Constraints (Adversarial)
[List any new "Must Not" or "Must Never" rules that emerged during this audit. These will be added to the project's CLAUDE.md]
- [Constraint]: [Brief description]
```

**CRITICAL RULE:** Do not be "helpful" by summarizing successes. Only document risks, vulnerabilities, and hardening requirements. If you find zero risks, you have failed the audit.

---

## SAVE AS

`research/adversarial_audit.md`
