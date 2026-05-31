Listen closely. As I warned, we still have two more UI sub-batches to clear before the system is completely compliant. We are moving directly into the New List Builder and Section Groups.

If the user cannot rapidly reorganize their daily plan or execute bulk operations via the section headers, the system fails to act as the high-density power tool demanded by the master specification.

Here is the next strictly capped batch for immediate execution. I am enforcing strict verbatim fidelity, exactly as documented in the master backlog, and appending the direct code evidence.

***

### Batch 10: Priority 4: UI & Components - New List Builder & Section Groups

VIOLATION 3 — MISSING IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 2: New List Creation, "Drag between sections to reassign section" File: src/screens/NewListScreen.tsx Spec Trace: The draft pane of the New List Creation screen must allow the user to drag and drop tasks physically between different section groupings to rapidly reorganize their taxonomy before committing the list. Code Trace: The implementation renders a static ScrollView traversing the SECTION_IDS array, passing the hardcoded subset of tasks down to generic SectionGroup components. There are no drag-and-drop gesture handlers, layout animators, or interactive list re-ordering libraries active in this hierarchy. Divergence: The implementation rigidly locks tasks into their assigned sections, completely lacking the required drag-to-reassign spatial interaction model. Evidence:
```tsx
// src/screens/NewListScreen.tsx
<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.draftScroll}>
    {SECTION_IDS.map(sectionId => {
        const tasksInSection = draftTasks.filter(t => t.section_id === sectionId);
        // ...
        return (
            <SectionGroup
                key={sectionId}
                section={sectionId}
                tasks={tasksInSection}
                monthlyCeiling={sectionCeilings[sectionId] || 14}
                auditedPoints={calculateSectionUsedPoints(sectionId as SectionId, auditedAssignments.filter(a => a.section_id === sectionId) as any)}
                // Empty callbacks for pure visual rendering in builder
                onStateToggle={() => {}}
                onPomodoroAdd={() => {}}
                onPomodoroRemove={() => {}}
                onDelegate={() => {}}
                onLongPressRow={() => {}}
            />
        );
    })}
</ScrollView>
```


VIOLATION 5 — WRONG IMPLEMENTATION Spec Source: 4. daily.md, "The points for each section is calculated based on the task load and it is indicated righ below each section with a red pen." File: src/components/SectionGroup.tsx Spec Trace: The physical visual language requires that the total calculated points for each specific section be rendered directly beneath the section header strictly using red ink. Code Trace: The SectionGroup component calculates currentAssignedPoints and renders it via the styles.trailingText stylesheet block, which explicitly hardcodes the color property to #888 (grey). Divergence: The UI displays the section's total point load in grey text, overriding the strict requirement to use the semantic red ink. Evidence:
```tsx
// src/components/SectionGroup.tsx
{!isMisc && (
    <>
        <Text style={styles.trailingText}>
            {currentAssignedPoints.toFixed(1)}pt ({auditedPoints.toFixed(1)} trailing)
        </Text>
        <CeilingBar
            monthlyCeiling={monthlyCeiling}
            auditedPoints={auditedPoints}
            currentAssignedPoints={currentAssignedPoints}
        />
    </>
)}
// ...
trailingText: {
    fontSize: 10,
    color: '#888',
    marginHorizontal: 4,
},
```


VIOLATION 2 — MISSING IMPLEMENTATION Spec Source: wlist_ui_spec.md, Screen 2: New List Creation, "Tap section header → bulk assign section ceiling remaining" File: src/components/SectionGroup.tsx Spec Trace: In the New List Creation planning surface, the user must be able to physically tap a section header to trigger a bulk engine command that automatically assigns any remaining ceiling points to the tasks within that section. Code Trace: The SectionGroup component dictates header interactions via a Pressable wrapper. It routes onLongPress to a selection toggle, but strictly binds onPress to toggleExpand, which simply rotates the chevron and hides the child tasks. Divergence: The implementation rigidly hijacks the header tap to trigger UI collapsing, entirely omitting the mandated bulk ceiling assignment command. Evidence:
```tsx
// src/components/SectionGroup.tsx
<View style={styles.container}>
    {/* SECTION HEADER */}
    <Pressable
        onPress={toggleExpand}
        onLongPress={() => {
            const taskIds = sectionTasks.map(t => t.id);
            selectSection(taskIds);
            if (onLongPressHeader) onLongPressHeader(section);
        }}
        style={[
            styles.headerRow,
            isSelectionMode && { backgroundColor: '#E1E9F0' }
        ]}
    >
```


VIOLATION 3 — MISSING IMPLEMENTATION Spec Source: wlist_ui_spec.md, Interaction Patterns -> Bulk operations, "Long press a section header in list builder → select mode... Bulk: assign points, change section, add tags, delete, toggle RSR" File: src/screens/NewListScreen.tsx Spec Trace: The New List builder interface is required to support bulk operations. When a user long-presses a section header, the system must trigger a multi-select mode and surface a bulk action tray for rapid task manipulation. Code Trace: The NewListScreen successfully captures onLongPressHeader and invokes selectSection(taskIds) to trigger isSelectionMode in the global store. However, the component never imports or conditionally renders the <BulkActionBar /> overlay required to process or clear these selections. Divergence: The UI initiates the bulk selection mode but traps the user by entirely omitting the visual bulk action tray component needed to execute commands or exit the mode. Evidence:
```tsx
// src/screens/NewListScreen.tsx
import { SectionGroup } from '../components/SectionGroup';
import { SECTION_IDS, SectionId } from '../models/Constants';
// ... (No import for BulkActionBar)

// Bottom of the render tree:
        </View>

        {/* OVERRIDE MODAL */}
        <Modal visible={overrideModalVisible} transparent animationType="fade">
            <View style={styles.modalBg}>
                <View style={styles.modalContent}>
// ...
        </Modal>
    </SafeAreaView>
);
```


***

Dispatch these to the bot immediately. The user must be able to visually reorder and execute mass operations on their plan. 

Are you ready for the 'Next Batch'?