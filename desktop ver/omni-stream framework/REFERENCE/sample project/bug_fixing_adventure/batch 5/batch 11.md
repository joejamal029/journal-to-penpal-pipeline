Listen closely. We have reached the final layer of the Group 5 triage backlog. We are completing **Priority 4: UI & Components**, targeting the **External Integrations & Bulk Operations** domain. If the user cannot properly ingest their academic load or execute mass ceiling assignments, the interface is choking the productivity it was designed to multiply.

I am enforcing strict verbatim fidelity. Here are the final 2 bugs, exactly as written in the master source, with the direct code evidence appended from the repository.

***

### Batch 11: Priority 4: UI & Components - External Integrations & Bulk Operations

VIOLATION 1 — PARTIAL IMPLEMENTATION Spec Source: wlist_integrations.md, 2. Pink Slip Integration, "Unread and stale sections are prioritized automatically." File: src/screens/PinkSlipManagerScreen.tsx Spec Trace: The Pink Slip system must automatically prioritize both unread and stale (>14 days) academic sections, enabling the user to seamlessly batch them into the working W-List. Code Trace: The UI provides a SELECT UNREAD button for batch ingestion. The underlying selection mapping filters the sections explicitly by checking s.last_read_date === null to grab the unread ones. Divergence: The batching logic successfully captures unread sections but completely abandons "stale" sections, leaving them out of the automated priority selection entirely. Evidence:
```tsx
// src/screens/PinkSlipManagerScreen.tsx
<TouchableOpacity
    onPress={() => {
        const unreadIds = sections.filter(s => s.last_read_date === null).map(s => s.id);
        const newSet = new Set(selectedSections);
        unreadIds.forEach(id => newSet.add(id));
        setSelectedSections(newSet);
    }}
    style={styles.selectAllBtn}
>
    <Text style={styles.selectAllText}>SELECT UNREAD</Text>
</TouchableOpacity>
```

VIOLATION 4 — PARTIAL IMPLEMENTATION Spec Source: wlist_ui_spec.md, Interaction Patterns -> Bulk operations, "'Assign ceiling remaining' → auto-fills selected tasks to use available ceiling" File: src/components/BulkActionBar.tsx Spec Trace: The system's multi-select interaction flow must feature a bulk operation button in the action tray that invokes an engine command to automatically exhaust the available monthly ceiling points by distributing them to the selected tasks. Code Trace: The backend execution layer (src/services/bulkService.ts) accurately provides the fillSectionRemaining method. However, inside the BulkActionBar.tsx overlay component, only buttons for Complete, Points, RSR, Missed, and Archive are rendered onto the scrolling interface. Divergence: While the core business logic is implemented in the service layer, the UI entirely omits the corresponding interaction button, rendering the feature completely inaccessible to the user. Evidence:
```tsx
// src/components/BulkActionBar.tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
    <TouchableOpacity style={styles.actionBtn} onPress={() => handleBulkState(TaskState.COMPLETE)}>
        <Text style={styles.btnIcon}>W</Text>
        <Text style={styles.btnLabel}>Complete</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.actionBtn} onPress={handleBulkPoints}>
        <Feather name="edit-2" size={18} color={WColors.RED} />
        <Text style={[styles.btnLabel, {color: WColors.RED}]}>Points</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.actionBtn} onPress={handleBulkRsr}>
        <Feather name="refresh-cw" size={18} color={WColors.GREEN} />
        <Text style={[styles.btnLabel, {color: WColors.GREEN}]}>RSR</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.actionBtn} onPress={() => handleBulkState(TaskState.MISSED)}>
        <Text style={[styles.btnIcon, {color: WColors.RED}]}>X</Text>
        <Text style={[styles.btnLabel, {color: WColors.RED}]}>Missed</Text>
    </TouchableOpacity>
```

***

Dispatch these to the bot immediately so it can restore these missing control triggers to the DOM.

Are you ready for the 'Next Batch'?