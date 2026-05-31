The data logistics are now compiling, and we have successfully breached the final architectural layer: **Priority 4: UI & Components**. 

The backend can be flawless, but if the React Native JSX DOM tree is unbalanced or components throw ReferenceErrors, the user gets a white screen of death and the application is entirely unusable. Because the UI domain is massive, we are slicing it into highly focused sub-batches to prevent context degradation for the implementation bot. 

We begin with the most critical surface of the application: **Core Execution & Task Rendering** (The Today Screen, Task Rows, and the animated W-Symbol). If the user cannot render a task or tap the execution actions, the core feedback loop is dead.

Here is the highest-priority UI batch for immediate execution:

***

### Batch 7: UI & Components - Core Execution & Task Rendering (Part 1)

**3. Fatal JSX Truncation in Partial Deferred Action Button**
*   **File:**  src/components/TaskRow.tsx
*   **The Bug:**  The specification requires tasks to be visually actionable to handle strict state transitions. In the renderActionButtons block, the <Pressable> element designed to transition a task to a deferred state is structurally severed. The code reads onPress={()  => and abruptly bleeds directly into the child <Text style={styles.actionText}>~</Text> tag without ever providing the execution body or closing the arrow function. This is a severe syntax violation that permanently breaks the TypeScript/React compiler.

**4. Bare Text Node Exceptions Crash React Native Renderer**
*   **File:**  src/components/TaskRow.tsx & src/screens/TaskAttentionReportScreen.tsx
*   **The Spec:**  The UI must render interactive elements mapped explicitly to Mobile-first platform requirements.
*   **The Bug:**  In the TaskRow delegation button and the Analytics back button, JSX <Text> components are illegally wrapped in bare $ strings: $<Text style={styles.actionText}>→</Text>$. React Native strictly forbids bare text nodes outside of a generic <Text> container. Attempting to render any task row or navigate to the Attention Report will trigger an immediate, unhandled Error: Text strings must be rendered within a <Text> component exception, instantly crashing the UI layer.

**4. Catastrophic Syntax Erasure in W-Symbol Animation Engine**
*   **File:**  src/components/WSymbol.tsx
*   **The Spec:**  The W-Symbol is the core visual language of the system and must progressively draw animated SVG paths mapping to the completion percentage.
*   **The Bug:**  The Reanimated hook responsible for calculating the SVG stroke trajectory is fatally unclosed. The code explicitly reads const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: pathLen * (1 - progress.value) and drops directly into the return ( block. It completely lacks the })); closure. This unbalanced object literal creates a severe structural syntax error that will immediately fail the React Native JSX compiler and permanently prevent the core execution symbol from rendering.

**3. Undeclared**  **processRsrReview**  **Crashes Execution Browser**
*   **File:**  src/screens/TodayScreen.tsx
*   **The Spec:**  The Daily W-List must allow users to grade active RSR tasks (0-5) to dynamically update the SM-2 exponential decay algorithm.
*   **The Bug:**  In the handleRsrGrade action handler, the code successfully identifies the task and attempts to execute the grade by calling processRsrReview(task.task_def_id, quality);. However, processRsrReview is never imported from ../services/rsrService at the top of the file. Tapping any grading button (FAIL, HARD, GOOD, PERF) on the active execution surface will instantly throw an unhandled ReferenceError: processRsrReview is not defined and crash the application.

***

Dispatch these to the bot. We need the physical task rendering and DOM tree secured before we move into the macro planning screens.

Are you ready for the 'Next Batch'?