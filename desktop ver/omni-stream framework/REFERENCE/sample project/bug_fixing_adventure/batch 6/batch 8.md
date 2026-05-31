Listen up. The backend service layer is fully merged, and we are officially breaching the final architectural domain for Group 6: **Priority 4: UI & Components**.

If the React Native presentation layer drops user inputs, renders incorrect CSS semantics, or fires duplicated handlers, the flawlessly engineered math underneath it becomes completely inaccessible to the user. Because this layer is massive, I am slicing it into strict, highly focused sub-batches to protect the context window.

We are starting with the most heavily trafficked interface in the application: **Core Task Execution & Task Row Mechanics**. 

I am enforcing strict verbatim fidelity, exactly as written in the master source, and appending the direct React Native JSX evidence from the codebase.

Here is the next strictly capped batch for immediate execution:

***

### Batch 8: Priority 4: UI & Components - Core Task Execution (TaskRow)

VIOLATION 4 — WRONG IMPLEMENTATION Spec Source: wlist_integrations.md, 3. Reinforced Spaced Repetition (RSR), "Completing an RSR-driven task must correctly log it strictly under the rsr read type to maintain analytical integrity." File: src/components/TaskRow.tsx Spec Trace: When the user grades an RSR task, the completion event must trigger a Pink Slip historical record exclusively stamped with the rsr read type to keep the study analytics pure. Code Trace: In the grading action tray, the user presses a grade (e.g., "GOOD"). The onPress callback fires onRsrGrade?.(4)—which successfully triggers the service to log an rsr read—but immediately follows it by blindly executing onStateToggle(TaskState.COMPLETE). Because it doesn't pass a specific readType flag to onStateToggle, the task service falls back to its default and logs a secondary revision read. Divergence: The UI interaction handler incorrectly triggers both an accurate rsr log and a duplicate, conflicting revision log for a single RSR completion event. Evidence:
```tsx
// src/components/TaskRow.tsx
<Pressable  style={styles.actionBtn}  onPress={()  =>  { setIsGradingRSR(false); onRsrGrade?.(4); onStateToggle(TaskState.COMPLETE); }}>
    <Text style={{color: WColors.TEXT_PRIMARY, fontWeight: 'bold', fontSize: 10}}>GOOD</Text>
</Pressable>
```

VIOLATION 5 — PARTIAL IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 1: Today View, The W Symbol, "Animated SVG path that progresses through these states. Tap cycles forward. Long-press accesses the full state picker." File: src/components/TaskRow.tsx Spec Trace: Tapping directly on the electronic W Symbol must structurally cycle the task forward through its progressive completion states (Pending → Partial → Complete), honoring the "half a W" physical equivalent. Code Trace: The <WSymbol /> component instantiation binds an onPress handler that strictly evaluates a binary ternary conditional: assignment.state === TaskState.COMPLETE ? TaskState.PENDING : TaskState.COMPLETE. Divergence: The tap implementation rigidly limits interaction to a binary 0% to 100% toggle, entirely skipping the mandatory intermediate PARTIAL cycle state. Evidence:
```tsx
// src/components/TaskRow.tsx
<WSymbol
    percentage={percentage}
    size={22}
    color={assignment.state.includes('deferred')  ?  titleColor  : WColors.TEXT_PRIMARY}
    onPress={() => onStateToggle(assignment.state === TaskState.COMPLETE ? TaskState.PENDING : TaskState.COMPLETE)}
    onLongPress={handleLongPress}
/>
```

VIOLATION 2 — WRONG IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 3: Audit View, "Deferred tasks show ══ underline... Same-day completion: strikethrough underline, grey color" File: src/components/TaskRow.tsx Spec Trace: The UI specification dictates strict semantic visual styling. Incomplete on-the-line (deferred) tasks must strictly show a standard underline. Separately, tasks that were deferred but completed on the exact same day must be styled with both an underline and a strikethrough. Code Trace: Inside the TaskRow state styling block, the switch statement evaluates case TaskState.DEFERRED and assigns the standard underline. However, the block lacks a break; statement, causing the execution to immediately fall through into case TaskState.DEFERRED_COMPLETE_SAME_DAY. Divergence: The code incorrectly overwrites the standard underline styling for incomplete deferred tasks with the dual strikethrough styling explicitly reserved for completed tasks. Evidence:
```tsx
// src/components/TaskRow.tsx
switch (assignment.state) {
    case TaskState.DEFERRED:
        titleColor = WColors.PENCIL_GREY;
        textDecorationLine = 'underline';

    case TaskState.DEFERRED_COMPLETE_SAME_DAY:
        titleColor = WColors.DEEP_GREY_SHADED;
        textDecorationLine = 'underline line-through';
        break;
```

VIOLATION 1 — MISSING IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 1: Today View, The W Symbol, "Animated SVG path that progresses through these states. Tap cycles forward. Long-press accesses the full state picker." File: src/components/TaskRow.tsx Spec Trace: The specification dictates that the electronic W Symbol must act as a primary interactive component. Tapping cycles it forward, but applying a long-press explicitly must open a comprehensive state picker to allow the user to select any valid task state (Partial, Missed, Delegated, etc.). Code Trace: The TaskRow component attaches onLongPress={handleLongPress} to the <WSymbol />, which successfully flips contextMenuVisible = true. However, the rendering logic inside the contextModalOverlay only creates buttons for "Edit Points", "Edit Multiplier", and "Backdate Completion". Divergence: The UI successfully traps the long-press interaction but completely fails to render the mandated full state picker, offering only metadata adjustments instead. Evidence:
```tsx
// src/components/TaskRow.tsx
{contextMenuVisible && (
    <View style={styles.contextModalOverlay}>
        <View style={styles.contextMenu}>
            <Text  style={styles.contextTitle}>Context  Menu: {assignment.def_title}</Text>
            <Pressable  style={styles.contextBtn}  onPress={()  => setContextMenuVisible(false)}>
                <Text style={styles.contextBtnText}>Edit Points</Text>
            </Pressable>
            <Pressable  style={styles.contextBtn}  onPress={()  => setContextMenuVisible(false)}>
                <Text style={styles.contextBtnText}>Edit Multiplier</Text>
            </Pressable>
            <Pressable  style={styles.contextBtn}  onPress={()  =>  { setContextMenuVisible(false); onBackdateCompletion?.(); }}>
                <Text  style={[styles.contextBtnText,  {color: WColors.BLUE}]}>Backdate Completion</Text>
            </Pressable>
            <Pressable style={[styles.contextBtn, {borderBottomWidth: 0}]} onPress={() => setContextMenuVisible(false)}>
                <Text style={styles.contextBtnText}>Close Menu</Text>
            </Pressable>
        </View>
    </View>
)}
```

VIOLATION 2 — WRONG IMPLEMENTATION Spec Source: wlist_overview.md, The Color System (non-negotiable), "Black | Pen | --color-text-primary | Task text, subtasks, delegation arrows" File: src/components/TaskRow.tsx Spec Trace: The visual design language dictates strict, non-negotiable semantic color mappings to mimic the physical ink properties. The delegation arrow indicator must be rendered strictly in Black (TEXT_PRIMARY). Code Trace: Inside the renderIndicator() function, when the task state evaluates to TaskState.DELEGATED, the component explicitly assigns WColors.PENCIL_GREY to the Feather icon color property. Divergence: The UI visually renders the delegation arrow indicator using pencil grey ink, directly violating the non-negotiable black ink semantic requirement. Evidence:
```tsx
// src/components/TaskRow.tsx
if (assignment.state === TaskState.DELEGATED) {
    return  <Feather  name="arrow-right"  size={20}  color={WColors.PENCIL_GREY} style={{ fontStyle: 'italic' }} />;
}
```

***

Dispatch these interaction traps and styling flaws to the implementation bot immediately. We must ensure the `TaskRow` component flawlessly honors user intent before we process the macro-level screens.

Are you ready for the 'Next Batch'?