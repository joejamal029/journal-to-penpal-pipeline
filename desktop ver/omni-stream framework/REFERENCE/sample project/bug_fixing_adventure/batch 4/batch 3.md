The implementation bot has its instructions, but we are not done with the **Priority 2: Pure Engines** layer. 

The analytical math has been triaged, but the state machine, the ceiling bounds, and the core W-Symbol rendering algorithms still contain fatal validation failures. If the rules engine rejects valid state regressions or swallows its own logic, the entire execution pipeline is bricked.

Here is the final sub-batch for the Engine layer. Do not let the bot drift outside of these 4 specific structural constraints.

***

### Batch 3: Pure Engines - State, Ceilings, and W-Symbol Math (Part 2)

**5. State Machine Lockout Prevents Pomodoro Regression**
*   **File:**  src/engine/stateEngine.ts & src/services/taskService.ts
*   **The Bug:**  The specification mandates that Pomodoro counts dynamically map to point values, and removing a mistakenly logged unit must mathematically revert the task's completion state. In src/services/taskService.ts, the removePomodoro function correctly calculates when a task's points drop below the required threshold and attempts to revert its state from COMPLETE to PARTIAL. However, the isValidTransition engine explicitly defines TaskState.COMPLETE as a final state, returning false for any outbound transitions. Consequently, the updateTaskState validator will block the regression and throw a fatal Invalid state transition from complete to partial error, permanently locking accidental completions into the database.

**4. Parameter Omission Permanently Breaks Daily Task Drafting**
*   **File:**  src/screens/NewListScreen.tsx & src/engine/ceilingEngine.ts
*   **The Bug:**  During the attemptDraftAssignment constraint evaluation, the system invokes the ceiling engine via calculateSectionUsedPoints(draftTasks.filter(t => t.section_id === taskDef.section_id) as any);. The target pure function explicitly requires two arguments: (sectionId: SectionId, assignments: TaskAssignment[]). By passing the filtered array as the  *first*  argument, the assignments array becomes physically undefined. When the engine attempts to execute .filter() on an undefined variable, it throws a fatal TypeError and permanently crashes the Daily List Builder.

**5. Missing Fallback Return Breaks TypeScript Compilation for W-Symbol**
*   **File:**  src/engine/wSymbol.ts
*   **The Spec:**  The application must dynamically render the W-Symbol by calculating and mapping independent SVG strokes based on percentage completion.
*   **The Bug:**  The getWAnimationPath pure function is strictly typed to return a string. It evaluates the geometry using a switch (strokeIndex) block covering cases 1, 2, 3, and 4. However, it completely omits a default: case or a fallback return statement at the conclusion of the function body. The strict TypeScript compiler will detect a code execution path that implicitly returns undefined, triggering a fatal Function lacks ending return statement violation and permanently failing the application build.

**4. Unclosed JSDoc Swallows the W-Symbol Animation Engine**
*   **File:**  src/engine/wSymbol.ts
*   **The Spec:**  The W-Symbol is the core visual language of the system and must progressively draw animated SVG paths.
*   **The Bug:**  The multi-line JSDoc comment preceding the getWAnimationPath function (beginning with /** * Generates the SVG structural path...) completely lacks its terminating */ closure. Consequently, the entire TypeScript function signature export const getWAnimationPath = (strokeIndex... is physically swallowed by the comment block and ignored by the compiler. When the React Native UI attempts to import and invoke this missing function, the application will instantly throw a fatal runtime TypeError and crash the core execution symbol globally.

***

Send this to the bot immediately. Once these engine rules and rendering loops are physically unblocked and compiling, we will finally bridge into the data logistics of **Priority 3: Services & Integrations**. 

Are you ready for the 'Next Batch'?