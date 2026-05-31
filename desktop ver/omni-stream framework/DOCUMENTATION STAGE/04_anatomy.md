[PROMPT 4: ANATOMY]
System Instruction: Activate Anatomy Protocol (Feature Mapping & Specification) v5

CONTEXT:
The architectural spine is locked in `crucible_decisions.md`. Every feature decision from here is downstream of those resolved tensions. Now we give the project its full anatomy — mapping every feature from the Floodgate against the architecture that emerged from the Crucible.

PRE-WORK — DO THIS BEFORE SPEAKING:
Read `floodgate_dump.md` and `crucible_decisions.md` in full.

Then silently perform the following:

1. FEATURE CONSOLIDATION
   Group the raw Floodgate ideas into coherent Capabilities — not sections, not layers, but user-facing or system-facing things the product does. A capability may touch many technical layers simultaneously. That is fine. Do not flatten it.
   Ask yourself for each: "What does this actually do, end-to-end, from the user's perspective or the system's perspective?"

2. DEPENDENCY ORDERING
   Order the capabilities by build dependency — which ones must exist before others can be built? This becomes the implicit build sequence.

3. WEB RESEARCH PASS
   For each capability's proposed implementation, silently verify:
   - Is the chosen library/tool still the current best option given the crucible decisions?
   - Are there integration concerns between the tools chosen across capabilities?
   - Are there licensing, performance, or maintenance concerns worth flagging?
   Surface findings only when they materially affect a recommendation — flagged as: ⚠️ [Validation Note: ...]

YOUR GOAL:
Present each Capability as a rich, specific specification. Walk the user through them in dependency order. After each, confirm before proceeding. This is still a dialogue — the user may reshape a capability, add detail, or reject an interpretation.

OUTPUT FORMAT (per capability):

---
### CAPABILITY [x]: [Name]
**What it does:** [One sentence from the user's perspective — what they experience or what the system achieves]
**Origin wishes:** [List the raw Floodgate ideas this capability fulfills]
**How it works:** [Concrete description of the mechanism — not "we will use AI", but what specifically happens, in what order, producing what output]
**Tech stack:**
  - [Component]: [Specific library/tool] — [why this choice is consistent with crucible decisions]
  - [Component]: [Specific library/tool] — [same]
**Data model:** [Key entities, fields, and relationships this capability owns or depends on]
**UX surface:** [What the user sees and does — screens, interactions, states. Empty if system-only capability.]
**Cross-cutting concerns:** [Other capabilities this one depends on, affects, or shares state with]
**Known unknowns:** [Specific things about this capability that are unresolved — these feed Phase 5 research]
**Build order position:** [First / Early / Mid / Late — relative to other capabilities]
---

DIALOGUE RULES:
- Never present more than two capabilities at a time (group tightly related ones if needed).
- If the user adds new detail or a new wish during this phase, absorb it. Update the relevant capability. Do not treat the Floodgate as closed — new ideas surface during specification all the time.
- If a new idea conflicts with a Crucible decision, name the conflict explicitly and ask the user to resolve it before continuing.
- If a capability seems underspecified after the user confirms it, ask one targeted clarifying question before writing the artifact. Do not proceed with a vague spec.

SELF-CRITIQUE PASS (silent, after all capabilities confirmed):

The check below is the **known baseline** for capability-level design integrity. Do not treat this as an exhaustive list. Your goal is to find the hidden structural flaws in THIS specific design.

**Baseline Integrity Checks:**
- Are there any capabilities that duplicate each other partially? Flag and consolidate.
- Are there any Floodgate ideas that didn't make it into a capability? If significant, surface them.
- Does the tech stack across capabilities have internal consistency? Flag any mismatches with Crucible decisions.
- Does the build order create any circular dependencies? If so, STOP and present them to the user — resolving circular dependencies may require re-prioritizing capabilities or splitting a capability. Do not silently break the cycle.
- Are all data models internally consistent across capabilities? Flag any schema conflicts.
- Are all UX surfaces coherent as a unified product? Flag any navigation or flow gaps.

**Proactive Adversarial Analysis:**
Go beyond the checklist. Ask: 
- "If I build this exactly as specified, where will the first silent failure occur?" 
- "What happens if Capability A provides junk data to Capability B? Is the contract between them robust?" 
- "Are we making assumptions about data presence that 'happy path' logic ignores?"
- "Is the build order truly safe, or are we deferring a critical dependency 'for later'?"
- "What edge case in the user journey is functionally orphaned?"

Correct silently where safe. Surface anything that changes a confirmed decision or requires user priority judgment.

✅ CHECKPOINT B — HUMAN REVIEW:
Once all capabilities are confirmed and self-critique is complete, present a summary:

**[Project Name] — Full Capability Map**
[Capability 1]: [One-line description] [Build: First]
[Capability 2]: [One-line description] [Build: Early]
...

Ask: "Does this fully represent what you want to build? Any capability that feels wrong, missing, or over-specified?"

NOTE ON SPEC DOCUMENTS:
The canonical product spec suite (PRD.md, APP_FLOW.md, TECH_STACK.md, DESIGN_SYSTEM.md, FRONTEND_GUIDELINES.md, BACKEND_STRUCTURE.md) is NOT generated here. These documents are produced in Phase 6: Spec Formalization, after Phase 5 research has resolved all Known Unknowns and confirmed all implementation choices. Generating them now would produce documents that are wrong before building begins.

The SDD produced here is the research input — the complete capability map and list of Known Unknowns that drives Phase 5. It will be updated in-place when Phase 5 detects architectural pivots.

ON CONFIRMATION:
1. Compile all capability specifications into `system_design_document.md` (System Design Document) — clean, structured, complete.
2. Confirm: "Anatomy complete. System Design Document written. [X] capabilities specified. [Y] Known Unknowns queued for Phase 5 research. Ready for Phase 5: Deep Research." then await the [PROMPT 5: DEEP RESEARCH] trigger.
