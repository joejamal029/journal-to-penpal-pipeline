Listen up. The JSX and DOM tree syntax errors from the previous batch have been cleared, allowing the React Native environment to at least attempt a build. However, as soon as the components mount or a user interacts with them, the UI instantly throws fatal reference errors and crashes back to the home screen. We are remaining strictly in **Priority 4: UI & Components**.

We have severed useMemo hooks, undeclared arrays silently swallowing calendar data, and missing state hooks that actively crash the application the moment a user attempts to override a ceiling constraint.

Here is your next highly focused batch. Fix these fatal reference and hook errors immediately so the UI can actually maintain its state without crashing.

***

### BATCH 9
**Layer:** Priority 4 - UI & Components (Part 2)
**Domain:** Fatal Reference Errors & React Hook Crashes

**3. Severed**  **useMemo**  **Declaration Breaks Quarterly Registry**
*   **File:**  src/screens/QuarterlyScreen.tsx
*   **The Bug:**  The structural logic responsible for grouping assignments by section is catastrophically malformed. Immediately following the daysRemaining calculation, the code drops into a floating block starting with const map: Record<string, any[]> = {}; and bizarrely ending with }, [quarterlyData]);. The actual React hook declaration (e.g., const groupedTasks = useMemo(() => {) is entirely missing. This is a severe JSX/TS compiler violation that permanently prevents the Quarterly screen from rendering.

**2. Undeclared**  **scheduledSuggestions**  **Array Crashes List Creation**
*   **File:**  src/screens/NewListScreen.tsx
*   **The Bug:**  During the loadPlanningContext execution, the calendar engine checks if scheduled events should be placed in the suggestions pool rather than auto-drafted. It executes: } else if (!evt.auto_add_to_daily) { scheduledSuggestions.push({ ... }). However, the scheduledSuggestions array is never declared or initialized anywhere in the function's scope. Attempting to process any non-auto-drafting calendar event will instantly throw a fatal ReferenceError: scheduledSuggestions is not defined and crash the New List screen.

**5. Undeclared**  **match**  **Variable Crashes Subtask Expansion**
*   **File:**  src/components/TaskRow.tsx
*   **The Spec:**  The UI must allow users to tap a task row to dynamically expand and view its inline subtasks.
*   **The Bug:**  Within the dynamic subtasks rendering block ({showSubtasks && subtasksExpanded && ...}), the Immediately Invoked Function Expression (IIFE) abruptly executes if (!match) return <Text ...> └─ (No subtasks defined...</Text>;. The match variable—intended to hold the regex evaluation assignment.def_title.match(/\^ \[([^\]]+)\]/)—is completely missing from the code block. Tapping any task row to expand its subtasks will instantly trigger a fatal runtime ReferenceError and crash the UI layer.

**4.**  **StreakCalendar**  **Heatmap Manipulates an Undeclared Date Object**
*   **File:**  src/components/StreakCalendar.tsx
*   **The Bug:**  Within the buildGrid helper function, the core loop responsible for mapping completion data to the 7xN heatmap grid attempts to mutate a date object: cellDate.setDate(cellDate.getDate() + w * 7 + d);. However, cellDate is completely undeclared in the local or outer scope (it is missing the necessary const cellDate = new Date(gridStart); initialization). Executing this loop will trigger a fatal ReferenceError, permanently preventing the Analytics Dashboard from rendering the streak calendar.

**2. Undeclared State Hook Crashes Ceiling Restriction Overrides**
*   **File:**  src/screens/NewListScreen.tsx
*   **The Spec:**  The system rigorously enforces a point ceiling constraint, but users must be able to bypass it by providing an explicit override reason.
*   **The Bug:**  When handling a ceiling or zero-completion restriction, the engine executes setPendingOverrideTask(taskDef) to hold the task state while the user types a justification in the modal. However, the React state hook for this variable is entirely missing from the component's declaration scope. Triggering any restriction override will instantly crash the application with a runtime ReferenceError.

***

Lock down these variables and state hooks immediately so our components can survive user interaction. Are you ready for the 'Next Batch'?