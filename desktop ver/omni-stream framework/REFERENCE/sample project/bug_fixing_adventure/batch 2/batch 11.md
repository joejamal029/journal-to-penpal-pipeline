Listen up. Your previous patches successfully resolved the syntax errors and hard crashes in the UI layer. However, our triage is not complete. A deeper sweep of the new bug log compilation reveals several remaining visual rendering logic failures and data falsifications directly inside the React Native components.

We are staying in **Priority 4: UI & Components**, specifically targeting the **Visual Rules, Analytics Render & Section Constraints** domain.

Right now, the UI is actively lying to the user. It is falsely rendering missed tasks as pending, completely omitting mandatory semantic strikethroughs, rendering empty days as failures in the heatmap, and applying hard point ceilings to the uncapped MISC section due to a trivial case-sensitivity error.

Here is your next highly focused batch.

***

### BATCH 11
**Layer:** Priority 4 - UI & Components
**Domain:** Visual Rules, Analytics Render & Section Constraints

**5.**  **DEFERRED_MISSED**  **State Bypasses Visual Restriction Enforcement**   **File:**  src/components/TaskRow.tsx
*   **The Bug:**  The system specification mandates that a deferred task that times out and fails must be marked and treated as a penalty miss. In the component, the switch (assignment.state) styling block completely omits TaskState.DEFERRED_MISSED, dropping its styles. Furthermore, the renderIndicator function only checks if (assignment.state === TaskState.MISSED) to render the red 'X' icon. Consequently, timed-out deferred tasks fall entirely through to the default renderer, where they display an empty WSymbol circle, falsely appearing as normal pending tasks rather than restricted failures.

**1. Visual Specification Violation for Deferred Tasks**   **File:**  src/components/TaskRow.tsx
*   **The Spec:**  The blueprint strictly dictates semantic formatting for deferred task resolution: "Next-day completion: strikethrough underline, BLUE color."
*   **The Bug:**  In the state evaluation block, the switch statement for TaskState.DEFERRED_COMPLETE_NEXT_DAY and TaskState.DEFERRED_COMPLETE_LATER correctly sets titleColor = WColors.BLUE; but entirely omits updating the textDecorationLine variable. Because it leaves the decoration at its initialized 'none' default, the UI renders these tasks as standard text. This breaks the non-negotiable physical-to-digital visual mapping, making it impossible to distinguish between a pending blue task and a completed deferred task.

**2. Streak Calendar Heatmap Falsifies Empty Days**
*   **File:**  src/components/StreakCalendar.tsx
*   **The Spec:**  The analytics engine requires a GitHub-style heatmap to track daily completion streaks. Empty days without a valid list should map to the none color profile.
*   **The Bug:**  When parsing a cell with no valid data, the loop extracts const rate = cell.entry?.completion_rate ?? null; and passes it to the getFillColor function. However, getFillColor only checks if (rate > 0.80) and if (rate >= 0.50), defaulting to FILL_COLORS.low for everything else. Because null > 0.80 evaluates to false, the function returns FILL_COLORS.low (#D3D3D3) instead of FILL_COLORS.none. The heatmap will falsely render completely inactive days as "Low Completion" failures, destroying the visual integrity of the chart.

**4. Case Sensitivity Mismatch Breaks MISC Constraints**   **File:**  src/components/SectionGroup.tsx
*   **The Spec:**  The MISC section must explicitly have "No ceiling constraint — MISC is uncapped". The ceiling bar must not render for it.
*   **The Bug:**  The component attempts to detect the MISC section to hide the ceiling bar using strict equality: const isMisc = section === 'MISC';. However, the global system strictly defines section IDs in lowercase (e.g., export const SECTION_IDS: SectionId[] = ['school', ... 'misc'];). Because 'misc' === 'MISC' evaluates to false, the isMisc flag never triggers. The system inappropriately renders the ceiling bar and dangerously enforces strict mathematical point constraints against the uncapped MISC tasks.

**5. Quarterly Registry Falsifies Macro Time Remaining**   **File:**  src/screens/QuarterlyScreen.tsx
*   **The Spec:**  The Quarterly Registry UI is required to track the "ACTIVE QUARTER" and accurately display the "TIME REMAINING" for that specific 3-month span.
*   **The Bug:**  The useMemo block responsible for calculating the quarter's remaining days hardcodes the end date to December 31st: const end = new Date(y, 11, 31);. Consequently, the math (end.getTime() - today.getTime()) calculates the days remaining in the  *entire year* , not the active quarter. If a user opens the Quarterly list in January (Q1), the UI will falsely declare "~300d" remaining for the quarter, breaking the macro-level urgency tracking.

***

Patch these visual rules and state enforcement failures immediately so the UI presents the true state of the application. Are you ready for the 'Next Batch'?