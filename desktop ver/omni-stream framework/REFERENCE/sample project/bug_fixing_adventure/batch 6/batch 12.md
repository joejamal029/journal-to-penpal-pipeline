Listen up. We are still inside the **Priority 4: UI & Components** layer. The implementation bot has secured the macro list building and weekly planning surfaces, but the **Action Menus & Integrations** are actively dropping user agency and blinding the execution layer to scheduled calendar events. 

If the user cannot backdate their pomodoro sessions, reassign sections in bulk, or see calendar items that failed the ceiling check, the interface is choking the productivity it was designed to multiply.

I am enforcing strict verbatim fidelity, extracting the bugs exactly as documented in the master source, and appending the direct React Native JSX evidence from the codebase to ensure the bot can trace the broken DOM trees.

Here is the next strictly capped batch for immediate execution:

***

### Batch 12: Priority 4: UI & Components - Action Menus & Integrations

VIOLATION 4 — MISSING IMPLEMENTATION 
Spec Source: wlist_ui_spec.md, Interaction Patterns -> Delegation (→), "User can assign which list receives the delegation" 
File: src/screens/TodayScreen.tsx 
Spec Trace: When the user engages the delegation action on a task, the interface must provide them the agency to select which specific future list should receive the delegated item. 
Code Trace: The handleDelegate function intercepts the tap and immediately executes delegateTask(assignmentId) without passing the secondary target list parameter or displaying a selection modal. 
Divergence: The UI entirely bypasses the user list selection requirement, blindly executing the delegation to tomorrow's default list. Evidence:
```tsx
// src/screens/TodayScreen.tsx
const handleDelegate = (assignmentId: string) => {
    delegateTask(assignmentId);
    loadData();
};
```

VIOLATION 2 — PARTIAL IMPLEMENTATION 
Spec Source: wlist_integrations.md, 4. Calendar / Schedule Integration, "these tasks are automatically integrated into your schedule on their designated days while still enforcing your point ceiling constraints" 
File: src/screens/NewListScreen.tsx 
Spec Trace: The system must merge scheduled calendar events into the daily drafting interface. If an event is set to auto-add but mathematically exceeds the strict section ceiling, it cannot be forced onto the list—but it must still be surfaced as a manual suggestion so the user remains aware of their schedule. 
Code Trace: When iterating todaysEvents, the drafting engine checks if (evt.auto_add_to_daily && canAddTask(...).allowed). If true, it pushes the event to draftQueue. It handles manual events with else if (!evt.auto_add_to_daily) by pushing them to scheduledSuggestions. 
Divergence: If a calendar event is flagged auto_add_to_daily but fails the canAddTask ceiling check, it falls through both logic branches and is silently dropped from the UI entirely, blinding the user to their schedule. Evidence:
```tsx
// src/screens/NewListScreen.tsx
if (evt.auto_add_to_daily && canAddTask(totalPts, currentDraftPts, Math.max(0, limit - trail)).allowed) {
    draftQueue.push({
        id: `draft-cal-${evt.id}`,
        // ...
    });
    draftCurrentCount[sec] = (draftCurrentCount[sec] || 0) + totalPts;
} else if (!evt.auto_add_to_daily) {
    scheduledSuggestions.push({
        id: evt.task_def_id || `cal-${evt.id}`,
        // ...
    } as SuggestionContext);
}
// Events that are auto_add_to_daily but fail the ceiling check fall into the void.
```

VIOLATION 5 — PARTIAL IMPLEMENTATION 
Spec Source: wlist_ui_spec.md, Screen 8: Pomodoro Counter, "Useful for backdating: 'I did 2 pomodoros yesterday' → log 2, backdate" 
File: src/screens/TodayScreen.tsx 
Spec Trace: The system explicitly supports backdating historical pomodoro sessions. When a user backdates a task completion, the UI must provide a way to capture the integer count of pomodoros they actually performed on that past date. 
Code Trace: The backend backdateTaskCompletion service function successfully accepts a pomodorosLogged: number parameter. However, in TodayScreen.tsx, the onDateChange UI handler intercepts the DateTimePicker response and blindly executes the backend call using only the date, entirely omitting a prompt or input field to capture the user's pomodoro count. 
Divergence: The UI completely drops the user input required to backdate pomodoro counts, permanently forcing the backend to default to 0 sessions for all historical records. Evidence:
```tsx
// src/screens/TodayScreen.tsx
const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && taskForBackdate) {
        try {
            backdateTaskCompletion(taskForBackdate.task_def_id, selectedDate);
            loadData();
        } catch (e) {
            console.warn("Failed to backdate task", e);
        }
    }
    setTaskForBackdate(null);
};
```

VIOLATION 1 — MISSING IMPLEMENTATION 
Spec Source: wlist_ui_spec.md, Interaction Patterns -> Bulk operations, "Bulk: assign points, change section, add tags, delete, toggle RSR" 
File: src/components/BulkActionBar.tsx 
Spec Trace: The multi-select bulk operations tray must expose UI controls allowing the user to perform rapid batch modifications across lists—specifically including the ability to change the section taxonomy and append tags to the selected tasks. 
Code Trace: The <BulkActionBar /> component renders a horizontal ScrollView of interactive action buttons. It successfully maps buttons for Complete, Points, RSR, Missed, Fill Ceiling, and Archive. It completely omits any buttons or visual handlers for "change section", "add tags", or "delete". 
Divergence: The UI entirely fails to implement the required batch interaction controls for reassigning sections and appending tags. Evidence:
```tsx
// src/components/BulkActionBar.tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
    <TouchableOpacity style={styles.actionBtn} onPress={() => handleBulkState(TaskState.COMPLETE)}>
        <Text style={styles.btnIcon}>W</Text>
        <Text style={styles.btnLabel}>Complete</Text>
    </TouchableOpacity>
    {/* ... (Points, RSR, Missed, Fill Ceiling, Archive renders) ... */}
    {/* Missing: Change Section, Add Tags, Delete UI nodes */}
</ScrollView>
```

***

Dispatch these missing user prompts, handlers, and action buttons to the implementation bot immediately. 

Are you ready for the 'Next Batch'?