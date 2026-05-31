Listen up. The core task rendering interfaces have been dispatched to the implementation bot. We remain in **Priority 4: UI & Components**, shifting focus to the **Macro List Building & Library** domain. 

If the user cannot properly filter their 3-Month library, sort by recency, or interact with their Monthly frequency chips, the macro-planning workflow is functionally dead. I am slicing this specific domain out to strictly protect the context window.

Here is the next strictly capped batch for immediate execution. I am enforcing strict verbatim fidelity, exactly as documented in the master backlog.

***

### Batch 8: Priority 4: UI & Components - Macro List Building & Library

VIOLATION 1 — MISSING IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 4: Weekly List View, "Priority groups are collapsible" File: src/screens/WeeklyListScreen.tsx Spec Trace: When viewing the Weekly List, the tasks are sorted into priority groups (Urgent, Mild, Other). The specification demands that the user must be able to interact with these group headers to collapse and expand them to manage UI density. Code Trace: The renderPriorityGroup function creates a static View block enclosing a standard Text title and maps the corresponding tasks immediately below it. There is no local state array to track expanded/collapsed views, nor is the header wrapped in a TouchableOpacity or Pressable to capture user interaction. Divergence: The UI completely omits the interactive mechanics required to collapse the weekly priority groups. Evidence:

VIOLATION 2 — MISSING IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 5: Monthly List View, "Tap date chip → see the task_assignment for that day" File: src/components/MonthlyTaskRow.tsx Spec Trace: In the Monthly List View, task frequency history is displayed as an array of date chips. The system must attach interactive gesture handlers to these specific chips, allowing the user to tap them to pull up the associated historical task assignment. Code Trace: The component iterates over datesArray to build the visual string map. However, it simply returns pure, static <Text> nodes without any wrapper components capable of intercepting touch events. Divergence: The implementation completely omits the required onPress interaction handlers on individual date chips, rendering them inert visual text. Evidence:

VIOLATION 4 — PARTIAL IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 5: Monthly List View, "Days since last completed shown as tag: '8d ago'" File: src/components/MonthlyTaskRow.tsx Spec Trace: In the Monthly List View, every task row must display a tag showing the exact number of days since it was last completed. Separately, tasks that have explicitly crossed a 14-day threshold are to be highlighted amber. Code Trace: The MonthlyTaskRow component evaluates isLowFrequency (defined as > 14 days). In its rendering block, it wraps the 'd ago' <Text> tag in a strict conditional guard: {isLowFrequency && !isUnread && (...)}. Divergence: The UI successfully shows the tag for old tasks, but actively hides the required recency tag for any task completed less than 14 days ago. Evidence:

VIOLATION 3 — PARTIAL IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 6: 3-Month List View (Task Library), "Filter by: active/archived, section, type, has-RSR, has-pink-slip" File: src/screens/LibraryScreen.tsx Spec Trace: The Task Library interface must provide interactive filters allowing the user to narrow down tasks by status, section, type, RSR attachment, and Pink Slip references. Code Trace: The UI renders a controlBar providing a toggle for archived/active states and sorting buttons for frequency, points, and name. Divergence: The UI completely omits the interactive filter controls required for section, type, has-RSR, and has-pink-slip. Evidence:

VIOLATION 2 — MISSING IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 6: 3-Month List View (Task Library), "Sort by: last completed, frequency, points, name" File: src/screens/LibraryScreen.tsx Spec Trace: The Task Library interface must provide the user with explicit sorting controls to organize their master definitions by "last completed" (recency), frequency, points, and name. Code Trace: Inside the controlBar rendering block, the UI maps <TouchableOpacity> controls to manipulate the sortBy state variable explicitly for 'frequency', 'points', and 'name'. Divergence: The UI completely omits the required sorting control button for the "last completed" recency sort, denying the user the ability to trigger it. Evidence:

***

Dispatch these missing DOM interactions and sorting hooks to the bot immediately. We still have two more UI sub-batches to clear before the system is completely compliant.

Are you ready for the 'Next Batch'?