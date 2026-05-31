Listen up. Your previous patches successfully resolved the catastrophic `ReferenceErrors` and React hook crashes in the UI layer. However, we are not done. A further sweep of the **Priority 4: UI & Components** layer reveals remaining floating syntax errors actively crashing the Analytics dashboard, a hardcoded routing typo instantly killing the Today screen, and logic bypasses actively falsifying our point economy. 

We cannot finalize the visual layer when components are erasing their own data and illegally bypassing mathematical constraints. 

Here is your next highly focused implementation batch.

***

### BATCH 10
**Layer:** Priority 4 - UI & Components (Part 3)
**Domain:** Logic Bypasses, Visual Erasure & Remaining Hard Crashes

**5. Undeclared**  **barWidth**  **and Floating Syntax Error in Velocity Chart**
*   **File:**  src/screens/AnalyticsDashboardScreen.tsx
*   **The Bug:**  Inside the SevenDayChart component, the code contains an illegal floating snippet 1); directly preceding the chartPadding constant. Furthermore, in the SVG bar rendering loop, it attempts to calculate the horizontal X-axis placement via const x = chartPadding.left + BAR_GAP + i * (barWidth + BAR_GAP);. The variable barWidth is entirely undeclared within the component. Evaluating this chart will instantly throw a ReferenceError and crash the Analytics Dashboard.

**5. Fatal Routing Crash in Today Screen Action Bar**
*   **File:**  src/screens/TodayScreen.tsx
*   **The Spec:**  The Today Screen must provide a rapid macro action button to instantly route the user into the Audit workflow.
*   **The Bug:**  In the Floating Action Bar, the "Audit Now" button contains a hardcoded typo in its navigation payload. It executes onPress={() => navigation.navigate('Audit ')}>. The illegal physical space inside the string 'Audit ' fails to map to the strict Audit screen name defined in AppNavigator.tsx. Tapping this button will instantly trigger an unhandled route exception and fatally crash the application.

**3. Visual Erasure of Task Multipliers in UI Economy**
*   **File:**  src/components/TaskRow.tsx
*   **The Spec:**  The system specification strictly dictates that task multipliers must be visually rendered in green (e.g., "x2", "x3") alongside the base points to accurately communicate the task's weight.
*   **The Bug:**  Inside the renderPoints block, the engine successfully evaluates the mathematical condition {(assignment.multiplier_override || assignment.multiplier) > 1.0 && ...}. However, the resulting JSX block explicitly renders an empty text component: <Text style={styles.multiplierText}> </Text>. The actual numerical multiplier variable is entirely omitted from the string, making the multiplier physically invisible to the user and breaking the visual feedback loop of the point economy.

**1. Calendar Auto-Add Ceiling Bypass via Multiplier Omission**
*   **File:**  src/screens/NewListScreen.tsx
*   **The Bug:**  During the calendar auto-drafting loop, the engine calculates cost (base points) and totalPts (cost * multiplier). When validating capacity, it invokes the ceiling engine using canAddTask(cost, currentDraftPts, ...). It strictly passes the unmultiplied cost to the engine for approval, but immediately assigns the totalPts to the list economy (assigned_points: totalPts). If a drafted event is linked to a 1.0 point task with a 3.0x project multiplier, it will pass the ceiling check as 1 point but legally inject 3 points into the active daily list, silently destroying the mathematical point ceiling constraint.

***

Patch these remaining crashes, logic bypasses, and visual erasures immediately. Are you ready for the 'Next Batch'?