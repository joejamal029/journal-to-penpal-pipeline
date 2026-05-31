The critical screen workflows and state desyncs from Batch 7 are successfully patched, ensuring our data logic no longer silently corrupts during interactions. However, we have a final, glaring vulnerability in the **Priority 4: UI & Components** layer.

A ruthless audit of the remaining backlog reveals that multiple core features have been merged into the codebase as visual mockups rather than functional integrations. We have non-functional stubs masquerading as completed features. If we leave these unpatched, users will experience a frustrating interface where components render but execute nothing, completely breaking the intended workflow loop of the W-List.

I have isolated this final cluster of three UI bugs intersecting with the **Incomplete Features & Non-Functional Stubs** domain. These specific components must be wired to their backend services before we can consider the UI fully operational. 

Here is your highly focused implementation batch.

***

### BATCH 8
**Layer:** Priority 4 - UI & Components
**Domain:** Incomplete Features & Non-Functional Stubs

**5. Faked Subtask Implementation Ignoring Schema**  The list blueprint dictates that tasks should support inline subtasks parsed from a specific string format (e.g., Task ^ [Subtask 1, Subtask 2]). Although the database includes a subtask_assignments table, src/components/TaskRow.tsx completely ignores both the string format and the database table, instead rendering a hardcoded mockup string (└─ [ ] Subtask 1 defined) for all nested subtasks.

**4. MISC Quick-Add is a Non-Functional Stub**  The UI specification dictates a lightweight "Quick-add interface" for the MISC section to handle spontaneous, urgent tasks without ceiling constraints. Despite rendering the visual input block in src/screens/NewListScreen.tsx, the onSubmitEditing handler for the text input is hardcoded to do nothing: /* Stub for MVP */ setMiscText('');. The user is physically unable to quick-add MISC tasks to their daily draft list.

**5. Task Assignment Autocomplete Handlers Are Non-Functional Stubs**  The business logic dictates that the electronic system must mirror the physical workflow, specifically the ability to consult and pull tasks directly from the 3-month library to construct active lists. Across src/screens/TodayScreen.tsx, src/screens/WeeklyListScreen.tsx, and src/screens/MonthlyListScreen.tsx, the AutocompleteSearchBar component is visually rendered. However, the onSelectAutocomplete handler in all three screens is hardcoded with an empty comment or a non-functional console.log('Task Selected', 'Adding ...'). The user is physically unable to assign searched library tasks to their active working lists.

***

Wire up these final execution handlers to ensure the interface genuinely drives the underlying databases and engines. This appears to exhaust the compiled master list of triage bugs.