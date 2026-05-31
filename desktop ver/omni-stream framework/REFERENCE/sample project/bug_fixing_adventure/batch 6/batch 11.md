Listen up. We are still carving out the infected DOM trees in **Priority 4: UI & Components**. The implementation bot has secured the dashboard reporting, but the **Weekly List & Macro UI** domain is actively lying to the user. 

The presentation layer is deliberately hallucinating random integers for task frequencies, faking subtask architectures with raw string splits, and entirely dropping critical historical contexts from the autocomplete search. If the user cannot trust the frequency data on their weekly plan, the entire prioritization economy collapses.

I am enforcing strict verbatim fidelity. Here is the next strictly capped batch for immediate execution, exactly as documented in the master source, with the raw code evidence appended.

***

### Batch 11: Priority 4: UI & Components - Weekly List & Macro UI

VIOLATION 5 — WRONG IMPLEMENTATION
Spec Source: 3. weekly.md, "Just as how the frequency of tasks is shown on the weekly list, the weekly list too should show this in the e version"
File: src/components/WeeklyTaskRow.tsx
Spec Trace: The weekly list interface must accurately render the chronological historical frequency (e.g., age since last completion) of specific tasks directly onto their UI row to guide user prioritization.
Code Trace: Instead of reading the task's database frequency history, the component mathematically generates a random integer between 0 and 19 using Math.random(), formats it, and pushes it directly into the frequencyTag string.
Divergence: The system deliberately hallucinates a randomized fake integer for the task frequency display instead of retrieving the true historical log age demanded by the specification.
Evidence:
```tsx
// src/components/WeeklyTaskRow.tsx
// Simulate frequency indicator for display purposes based on math
const randomDays = Math.floor(Math.random() * 20);
const frequencyTag = randomDays > 0 ? `· ${randomDays}d ago` : '· New';
const tagColor = randomDays > 14 ? WColors.ORANGE_AMBER : '#888';
```

VIOLATION 3 — MISSING IMPLEMENTATION
Spec Source: wlist_ui_spec.md, Screen 4: Weekly List View, "Task frequency: dates visible on tap/hover (e.g.) + colored dot for recency"
File: src/components/WeeklyTaskRow.tsx
Spec Trace: In the Weekly List UI, the task frequency indicator must be an interactive element. The user must be able to tap or hover over the frequency tag to reveal an explicit array of historical completion dates (e.g., ``).
Code Trace: The WeeklyTaskRow component renders the `<Text style={styles.frequency}>` tag inline with the title. It simply prints the `frequencyTag` string without wrapping the element in a `Pressable`, `TouchableOpacity`, or attaching an `onPress` handler to trigger an alert or modal with the date array.
Divergence: The UI completely omits the interactive tap/hover mechanic required to display the historical date array on the Weekly List.
Evidence:
```tsx
// src/components/WeeklyTaskRow.tsx
<View style={styles.titleRow}>
    <Text style={styles.title} numberOfLines={1}>
        <Text style={styles.titleText}>{displayTitle}</Text>
        <Text style={styles.points}>({assignment.assigned_points}pt)</Text>
        {hasSubtasks && !expanded && (
            <Text style={styles.subtaskPreview}> ^ {subtasksRaw}</Text>
        )}
        <Text style={[styles.frequency, { color: tagColor }]}> {frequencyTag}</Text>
    </Text>
</View>
```

VIOLATION 4 — PARTIAL IMPLEMENTATION
Spec Source: 3. weekly.md, "It is written in this format Task ^ [Subtask 1, Subtask 2]. The subtasks are written right on top of them, and they are also assigned relevant scores"
File: src/components/WeeklyTaskRow.tsx
Spec Trace: The weekly list must visually display a task's associated subtasks alongside their explicitly assigned relevant fractional point scores directly inline with the parent task row.
Code Trace: The WeeklyTaskRow component does not fetch actual subtask_assignments records from the database. Instead, it fakes the feature by checking assignment.def_title.includes('^') and rendering a raw string split (assignment.def_title.split('^')).
Divergence: The weekly UI completely ignores the underlying subtask relational database architecture, faking the UI requirement by parsing a raw text string without pulling or displaying any attached fractional point scores.
Evidence:
```tsx
// src/components/WeeklyTaskRow.tsx
// Simulated inline subtasks (MVP: Hardcoded string for visual spec compliance until Phase 3 relationships)
const hasSubtasks = assignment.def_title.includes('^');
const subtasksRaw = hasSubtasks ? assignment.def_title.split('^').trim() : '';

// ...
{hasSubtasks && expanded && (
    <View style={styles.expandedSubtasks}>
        <Text style={styles.inlineSubtaskText}>└─ {subtasksRaw}</Text>
    </View>
)}
```

VIOLATION 1 — MISSING IMPLEMENTATION
Spec Source: wlist_ui_spec.md, Interaction Patterns -> Task autocomplete (from 3-month library), "Shows matching tasks with their default points, section, last completed date"
File: src/components/AutocompleteSearchBar.tsx
Spec Trace: When searching the task library to build a list, the autocomplete dropdown must display the task's name, its default points, its section, and explicitly its last_completed date to help the user gauge frequency at a glance.
Code Trace: The AutocompleteSearchBar UI component renders the title, the project pill, the section_id, and the base_points. It entirely drops the last_completed date. Furthermore, the backend searchTaskDefinitions query explicitly omits fetching MAX(mfl.completed_at) from the database.
Divergence: The autocomplete UI completely omits the required historical last_completed date context.
Evidence:
```tsx
// src/components/AutocompleteSearchBar.tsx
<Text style={styles.dropdownItemTitle} numberOfLines={1}>
    {item.is_project ? <Text style={styles.projectPill}>[P] </Text> : ''}
    {item.title}
</Text>
<Text style={styles.dropdownItemMeta}>
    {item.section_id.toUpperCase()}  · {item.base_points}pt
</Text>
```
```typescript
// src/services/taskService.ts
export const searchTaskDefinitions = (searchQuery: string) => {
    // ...
    const term = `%${escaped}%`;
    return runQuery(`
        SELECT id, title, section_id, type, base_points, is_project
        FROM task_definitions
        WHERE title LIKE ? AND is_archived = 0
        ORDER BY title ASC
        LIMIT 15
    `, [term]);
};
```

***

Dispatch these mock attributes and missing DOM states to the bot immediately. We must force the interface to bind to the actual database truths instead of hardcoded strings.

Are you ready for the 'Next Batch'?