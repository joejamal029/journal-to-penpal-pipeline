Listen up. The Analytics Dashboards have been dispatched, and the implementation bot is currently forcing the UI to render the correct mathematical telemetry. 

We are continuing our sweep of the **Priority 4: UI & Components** layer, shifting our focus exclusively to the **Macro List Building & Library** domain. If the user cannot physically instantiate their 30-day and 90-day lists, or properly map the configurations of their master task definitions, the cascading ceiling rules of the entire system will completely stall out.

I am enforcing strict verbatim fidelity, extracting the bugs exactly as documented in the master source, and appending the direct React Native JSX evidence from the codebase to ensure the bot can trace the broken DOM trees.

Here is the next strictly capped batch for immediate execution:

***

### Batch 10: Priority 4: UI & Components - Macro List Building & Library

VIOLATION 1 — WRONG IMPLEMENTATION Spec Source: 2. month.md, "For each section we have tasks and then associated projects. Projects weigh more than task..." File: src/screens/MonthlyListScreen.tsx Spec Trace: The Monthly List hierarchy must visually group standard tasks first, immediately followed by their associated project tasks, structurally differentiating the two types based on their point weight logic. Code Trace: Inside the useMemo block that constructs sectionsData, the engine maps through tasks.forEach. It explicitly evaluates if (t.type === 'build') to separate build tasks, but completely drops evaluation for TaskType.PROJECT, funneling them unconditionally into the else map[t.section_id].standard.push(t); catch-all branch. Divergence: The UI physically segregates "build" tasks but erroneously dumps all "project" tasks into the standard task pool, defying the explicit project separation requirement. Evidence:
```tsx
// src/screens/MonthlyListScreen.tsx
// Group tasks explicitly by Section and by Type (task vs build)
    const sectionsData = useMemo(() => {
        const map: Record<string, { standard: any[], build: any[] }> = {};
        SECTION_ORDER.forEach(sec => {
            map[sec.id] = { standard: [], build: [] };
        });

        tasks.forEach(t => {
            if (map[t.section_id]) {
                if (t.type === 'build') map[t.section_id].build.push(t);
                else map[t.section_id].standard.push(t);
            }
        });
```

VIOLATION 4 — MISSING IMPLEMENTATION Spec Source: wlist_overview.md, List Validity Rules, "Monthly | 30 days | 1 | End of month" File: src/screens/MonthlyListScreen.tsx Spec Trace: The system hierarchy requires the instantiation of a 30-day Monthly List to dictate section ceilings, track task frequencies, and provide foundational execution bounds for the subordinate weekly and daily lists. Code Trace: The MonthlyListScreen relies on getActiveMonthlyList() to load data. If no list is active, it renders the autocomplete bar but triggers an Alert.alert('No List', 'Construct a monthly list first.') error trap. There is absolutely no createMonthlyList function in the underlying service layer, nor a button in the UI to trigger it. Divergence: The codebase structurally traps the user by demanding a Monthly List to proceed while completely lacking the implementation capabilities to ever construct one. Evidence:
```tsx
// src/screens/MonthlyListScreen.tsx
    const loadData = () => {
        const activeList = getActiveMonthlyList();
        if (activeList) {
            setActiveListId(activeList.id);
// ...
        } else {
            setTasks([]);
            setCeilings({});
        }
    };
```

VIOLATION 2 — MISSING IMPLEMENTATION Spec Source: wlist_overview.md, List Validity Rules, "3-Month | 90 days | 1 | End of quarter" File: src/screens/QuarterlyScreen.tsx Spec Trace: The system's list hierarchy requires the initialization of a "3-Month" (Quarterly) list to act as a 90-day execution envelope that bridges the Monthly list and the 3-Month master library. Code Trace: The QuarterlyScreen checks getActiveQuarterlyList(). If null, it renders an empty state with an "Initialize" button. That button's onPress executes migrateLibraryToQuarterly(quarterlyData.id, ...). Because the list was never created, quarterlyData.id is inherently undefined, triggering the exact error block they wrote: 'No active quarterly list ID found for migration target.' Divergence: The codebase entirely lacks a createList invocation for the THREE_MONTH list type, permanently breaking the migration feature and making it impossible to generate the required 90-day list. Evidence:
```tsx
// src/screens/QuarterlyScreen.tsx
<TouchableOpacity
    style={styles.migrateBtn}
    onPress={() => {
        // Fetch all active task definitions to populate the initialization window
        const allDefs = runQuery<{id: string}>('SELECT id FROM task_definitions WHERE is_archived = 0', []);
        if (allDefs.length === 0) {
            Alert.alert('No Definitions', 'Master library is empty.');
            return;
        }

        // We need a list ID to migrate into.
        // For now, we'll alert that it requires an active list stub if none exists,
        // but the service already expects a listId.
        if (quarterlyData?.id) {
            migrateLibraryToQuarterly(quarterlyData.id, allDefs.map(d => d.id));
            loadData();
            Alert.alert('Success', 'Quarterly list initialized from library.');
        } else {
            Alert.alert('Error', 'No active quarterly list ID found for migration target.');
        }
    }}
>
```

VIOLATION 3 — PARTIAL IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 6: 3-Month List View (Task Library), "Filter by: active/archived, section, type, has-RSR, has-pink-slip" File: src/screens/LibraryScreen.tsx Spec Trace: The 3-Month Task Library UI must equip the user with multiple interactive filters allowing them to narrow definitions specifically by active/archived status, section, task type, RSR attachment, and pink-slip references. Code Trace: Within the component's render tree, the controlBar successfully hooks the archived state. Immediately below it, the filterRow block correctly maps TouchableOpacity chips for hasRsr and hasPinkSlip. Divergence: The UI implementation entirely omits the required interactive input controls needed to filter the task library by section or by type. Evidence:
```tsx
// src/screens/LibraryScreen.tsx
{/* Violation 3: Functional Filter Row */}
<View style={styles.filterRow}>
    <TouchableOpacity
        style={[styles.filterChip, filterConfig.hasRsr && styles.filterChipActive]}
        onPress={() => setFilterConfig({ ...filterConfig, hasRsr: !filterConfig.hasRsr })}
    >
        <Text style={[styles.filterChipText, filterConfig.hasRsr && styles.filterChipTextActive]}>RSR</Text>
    </TouchableOpacity>
    <TouchableOpacity
        style={[styles.filterChip, filterConfig.hasPinkSlip && styles.filterChipActive]}
        onPress={() => setFilterConfig({ ...filterConfig, hasPinkSlip: !filterConfig.hasPinkSlip })}
    >
        <Text style={[styles.filterChipText, filterConfig.hasPinkSlip && styles.filterChipTextActive]}>PinkSlip</Text>
    </TouchableOpacity>
</View>
```

VIOLATION 5 — MISSING IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 8: Pomodoro Counter, "pomodoro_value is configurable per task definition" File: src/screens/LibraryScreen.tsx Spec Trace: The system must provide the user with the ability to configure a specific pomodoro_value mapping for individual task definitions, allowing them to customize how much W-point weight a single 23-minute session holds per task. Code Trace: The Task Library's inline creation UI (inlineCreateRow) provides a single <TextInput> for the task title, hardcodes base_points: 1.0 in the payload, and completely omits the pomodoro_value property when invoking createTaskDef. Furthermore, the handleEditContext action modal lacks any option to edit the pomodoro value later. Divergence: The user interface completely abandons the required input controls needed to configure a task's specific pomodoro point value mapping. Evidence:
```tsx
// src/screens/LibraryScreen.tsx
{/* Inline Creation Plane */}
{isCreating && (
    <View style={styles.inlineCreateRow}>
        <TextInput
            style={styles.createInput}
            autoFocus
            placeholder="Title (default: 1pt, MISC)"
            value={newDefTitle}
            onChangeText={setNewDefTitle}
            onSubmitEditing={handleCreateDefinition}
            onBlur={() => {
                if (newDefTitle.trim() === '') setIsCreating(false);
            }}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={handleCreateDefinition}>
            <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
    </View>
)}
```

***

Dispatch these missing creation capabilities and interaction components to the bot immediately. We must ensure the user can actually initialize their macro lists and configure their library definitions before we tackle the remaining Weekly and Daily list DOM failures.

Are you ready for the 'Next Batch'?