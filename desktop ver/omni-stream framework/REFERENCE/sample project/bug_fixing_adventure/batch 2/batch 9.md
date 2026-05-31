The automated pipelines and bulk execution services are finally locked down and respecting our ceilings. The integration layer is secure. We are now officially ascending to the top of the stack: **Priority 4: UI & Components**.

However, I am not letting you touch the workflow logic or state mapping until the foundational mounting is stable. A sweep of the UI layer reveals fatal syntax errors, missing state hooks, and floating code blocks that are actively breaking the TypeScript compiler and crashing screens on load. 

I have isolated a batch of 4 critical UI rendering crashes. Fix these baseline visual mounts so the application can actually compile and render before we attempt to route any user actions.

***

### BATCH 9
**Layer:** Priority 4 - UI & Components
**Domain:** Syntax Errors & Hard Crashes

**1. Unclosed Function Syntax Error in Library Creation**  In src/screens/LibraryScreen.tsx, the handleCreateDefinition function contains a severe structural syntax error that will break the compiler. The createTaskDef invocation is completely missing its closing curly brace and parenthesis. The object payload abruptly stops at is_project: false and bleeds directly into the setNewDefTitle(''); state mutation, preventing the application from building.

**3. Floating Component Code and Reference Error**  In src/screens/PinkSlipManagerScreen.tsx, the logic intended to handle the marking of read sections is floating openly in the root component scope. An Alert.alert block referencing section.title appears immediately after the toggleCourse function, completely lacking the required const handleMarkRead = (section: PinkSlipSectionAnalytics) => { wrapper. Because the section variable is undefined in this outer scope, evaluating this file will trigger an immediate runtime ReferenceError.

**1. Fatal Null Reference Crash in Quarterly Registry**  In src/screens/QuarterlyScreen.tsx, the groupedTasks memoized calculation unconditionally invokes quarterlyData.assignments.forEach(...) to render the UI. However, if the user does not have an active quarterly list, the loadData function defaults quarterlyData to null. Navigating to this screen before explicitly initializing a 3-month list will immediately throw a TypeError: Cannot read properties of null and fatally crash the application.

**2. Undeclared State Hook Crashes Calendar Grid**
*   **File:**  src/components/ScheduleGrid.tsx
*   **The Spec:**  The Schedule Grid must allow users to long-press a day column to create and map recurring daily events.
*   **The Bug:**  Inside handleColumnLongPress, the function invokes setAutoAdd(true);. Furthermore, the modal render block attempts to bind this state: <Switch value={autoAdd} onValueChange={setAutoAdd} />. However, the React state hook for autoAdd (e.g., const [autoAdd, setAutoAdd] = useState(true);) is completely undeclared in the component's scope. Long-pressing any column on the schedule grid will instantly trigger a fatal ReferenceError: setAutoAdd is not defined and crash the application.

***

Patch these syntax and reference errors immediately so the UI can safely compile. Are you ready for the Next Batch?