This is it. The final sweep of the **Priority 4: UI & Components** layer. We are clearing the last remaining corrupted DOM nodes and missing state declarations from our external integration interfaces—specifically the Pink Slip Manager and the Schedule Grid. 

If these components fail to compile, the user cannot map their academic workload or recurring events into the W-List, severing the system from their actual schedule.

Here is the final batch for immediate execution. Do not let the bot hallucinate beyond these specific files.

***

### Batch 15: UI & Components - External Integrations & Modals (Part 7)

**5. Missing Declaration Traps Pink Slip Bulk Adder**
*   **File:**  src/screens/PinkSlipManagerScreen.tsx
*   **The Spec:**  The Pink Slip manager must allow bulk-adding academic readings directly to the active Daily W-List, creating task definitions on the fly if they don't exist.
*   **The Bug:**  Inside the handleBulkAddToWList iteration loop, the logic drops directly into an evaluation check: if (!def) { def = createTaskDef(...) }. The def variable is completely undeclared in the loop's execution scope (it entirely misses the required let def = getTaskDefByPinkSlipRef(section.id); retrieval statement). Selecting academic modules and tapping the bulk add trigger will instantly throw a fatal ReferenceError: def is not defined and abort the workflow.

**4. Undeclared**  **newSection**  **Variable Crashes Calendar Modals**
*   **File:**  src/components/ScheduleGrid.tsx
*   **The Spec:**  The Schedule Grid must allow users to map recurring external calendar events to the correct sections (e.g., school, spiritual).
*   **The Bug:**  Inside the component, the developer maps input to newSection using <TextInput value={newSection} onChangeText={setNewSection} /> and resets it via setNewSection('school'); during a long-press. However, the const [newSection, setNewSection] = useState(...) React hook is entirely absent from the component's declaration scope. Attempting to open the schedule modal will throw an immediate runtime crash for referencing an undeclared variable.

**3. Fatal Code Truncation in Pink Slip Gap Analysis**
*   **File:**  src/screens/PinkSlipManagerScreen.tsx
*   **The Spec:**  The Pink Slip manager must calculate and display a visual badge quantifying unread and "stale" (>14 days) academic modules.
*   **The Bug:**  The variable declaration required to evaluate the staleCount is catastrophically severed. The logic calculates unreadCount and then abruptly jumps to an orphaned, floating condition: (s.days_since_read || 0) > 14).length;. The required const staleCount = sections.filter(s => prefix is completely deleted. This structural syntax violation will instantly fail the TypeScript compiler with unbalanced parentheses and crash the UI when it attempts to render the undeclared {staleCount} variable.

***

Get these assigned to the implementation bot immediately. With this batch, the master list of documented structural failures is fully triaged and dispatched. The application should successfully build, render, and execute the core W-List database transactions once these are merged. 

Are you ready for the 'Next Batch'?