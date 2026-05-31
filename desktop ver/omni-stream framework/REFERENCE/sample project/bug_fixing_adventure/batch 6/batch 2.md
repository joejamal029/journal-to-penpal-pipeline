The TypeScript boundaries for the analytics models have been merged. We are now officially starting **Priority 2: Pure Engines** for the Group 6 triage backlog.

I have carved out a sub-batch focusing exclusively on the Core State Machine, W-Symbol Animation, and RSR Algorithm logic. If these baseline engines fail their mathematical constraints, the entire W-List philosophy degrades.

I am enforcing strict verbatim fidelity, extracting the bugs exactly as documented in the master source, and appending the direct code evidence to guide the bot.

Here is the next strictly capped batch for immediate execution:

***

### Batch 2: Priority 2: Pure Engines - Core State Machine & Algorithms

VIOLATION 4 — INVERTED RULE Spec Source: wlist_overview.md, Failure & Backlog Philosophy, "Manual corrections: States can be manually overridden (e.g., marking a missed task as complete with a reason)." File: src/engine/stateEngine.ts Spec Trace: The system operates with a forgiving backlog philosophy, explicitly mandating that users have the systemic power to manually override task states to correct errors (e.g., misclicking a delegation or a deferral action). Code Trace: The isValidTransition function acts as the absolute mathematical gatekeeper for state changes. It groups TaskState.DELEGATED into a rigid terminal block that unconditionally returns false for any subsequent outbound transition. Divergence: The state machine structurally locks tasks into the DELEGATED state forever, actively blocking the user's ability to manually override and correct accidental delegations. Evidence:
```typescript
// src/engine/stateEngine.ts
        case TaskState.DELEGATED:
        case TaskState.DEFERRED_COMPLETE_SAME_DAY:
        case TaskState.DEFERRED_COMPLETE_NEXT_DAY:
        case TaskState.DEFERRED_COMPLETE_LATER:
        case TaskState.DEFERRED_MISSED:
            return false; // Final states
```

VIOLATION 3 — MISSING IMPLEMENTATION Spec Source: wlist_overview.md, The Completion Symbol: The W, "The physical act of drawing it progressively was described as 'dynamically rendering the checkmark in realtime.'... the W renders as an animated SVG path that progresses through these states." File: src/engine/wSymbol.ts Spec Trace: The electronic W Symbol must accurately mimic the progressive physical handwritten strokes (0 to 4). Stroke 1 is the left descender, 2 is the left ascender, 3 is the right descender, and 4 completes the mark. Code Trace: Inside getWAnimationPath, the switch (strokeIndex) execution block maps case 1: and case 2:. It then drops an un-cased return statement intended for the third stroke exactly between case 2 and case 4, completely omitting the case 3: statement. Divergence: The animation engine structurally breaks the 75% completion progression state because the missing case 3: statement renders the right descender line as unreachable code. Evidence:
```typescript
// src/engine/wSymbol.ts
    switch (strokeIndex) {
        case 1:
            // Left descender
            return `M ${p0x} ${p0y} L ${p1x} ${p1y}`;
        case 2:
            // Left ascender
            return `M ${p1x} ${p1y} L ${p2x} ${p2y}`;
        // Right descender  (approx 60 deg mirroring physical hand angle)
            return `M ${p2x} ${p2y} L ${p3x} ${p3y}`;
        case 4:
            // Right ascender
            return `M ${p3x} ${p3y} L ${p4x} ${p4y}`;
    }
```

VIOLATION 1 — WRONG IMPLEMENTATION Spec Source: wlist_integrations.md, 3. Reinforced Spaced Repetition (RSR), "The SM-2 algorithm, adapted for W-List task integration." File: src/engine/rsrEngine.ts Spec Trace: The adapted SM-2 algorithm dictates that the ease factor must be mathematically adjusted even upon a failure (quality < 3), recalculating the decay curve before bounding it to the minimum floor. Code Trace: Inside calculateNextRsrInterval, the conditional block evaluating quality < 3 attempts to calculate the ease factor adjustment. However, the calculation logic is broken, leaving only an orphaned literal and parenthesis (0.02));) on a single line. It then blindly assigns Math.max(MIN_EASE, ease_factor) without ever actually modifying the original ease_factor variable. Divergence: The implementation completely drops the mathematical adjustment to the ease factor during a failed RSR review due to a corrupted/incomplete code statement. Evidence:
```typescript
// src/engine/rsrEngine.ts
    if (quality < 3) {
        // Fail or Hard: Reset interval and repetitions, but DO NOT drop ease factor dramatically.
        //  Actually,  SM-2  allows  slight  ease  factor  adjustment  even  on  fail,  but interval resets.
        repetition_count = 0;
        interval_days = 1;
        // Adjust ease factor based on formulation, but bounded by min ease
    0.02));
        ease_factor = Math.max(MIN_EASE, ease_factor);
```

***

Dispatch these to the implementation bot immediately so it can restore the core logic flows.

Are you ready for the 'Next Batch'?