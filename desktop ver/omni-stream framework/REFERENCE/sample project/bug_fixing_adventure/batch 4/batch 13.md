The daily execution layers are holding, and the audit engine is compiling. We are staying in **Priority 4: UI & Components**, shifting directly into the Macro Planning scopes (Quarterly) and the Master Task Library. 

If the user cannot interact with their 3-Month library or initialize a Quarterly list, the entire long-term architecture of the W-List is stranded. The React Native DOM trees in this section are severely mangled with unclosed tags and severed state hooks.

Here is the next strictly capped sub-batch for immediate execution. Do not let the bot hallucinate beyond these exact DOM and syntax repairs.

***

### Batch 13: UI & Components - Quarterly Planning & Master Library (Part 5)

**4. Unbalanced DOM Tree syntax error in Quarterly Registry**
*   **File:**  src/components/QuarterlyTaskRow.tsx
*   **The Bug:**  The JSX rendering block responsible for displaying the task title is structurally mangled. Immediately following the project badge evaluation {isProject && <Text style={styles.badgeProject}> P </Text>}, the code blindly drops into the raw variable {assignment.def_title} followed by an orphaned </Text> closing tag. The required opening <Text> tag for the title is entirely omitted from the component tree. This unbalanced DOM creates a fatal JSX compiler error that permanently bricks the Quarterly screen.

**3. Undeclared**  **y**  **Variable Crashes Quarterly Registry**
*   **File:**  src/screens/QuarterlyScreen.tsx
*   **The Bug:**  Within the macro date calculation logic, the component attempts to resolve the boundaries of the active quarter via a useMemo block. It executes the date instantiation const end = new Date(y, quarterEndMonth, 0, 23, 59, 59);. The variable y is entirely undeclared and uninitialized within the component scope (the required const y = today.getFullYear(); is missing). Navigating to the Quarterly list will trigger an instant runtime ReferenceError: y is not defined and fatally crash the application.

**4. Floating String Fragment Severs Quarterly Registry Migration**   **File:**  src/screens/QuarterlyScreen.tsx  **The Spec:**  The Quarterly W-List must initialize by querying and migrating active tasks from the master definitions library.  **The Bug:**  Inside the migrateBtn execution handler, the logic designed to invoke the migration service is catastrophically severed. Immediately following the loadData(); execution, the code drops into a floating, orphaned string literal from library.');. The closing braces for the if block and the execution wrapper are completely missing. This structural syntax error will instantly crash the React JSX compiler and prevent the Quarterly screen from building.

**1. Orphaned**  **else if**  **Breaks Library Bulk Actions**
*   **File:**  src/screens/LibraryScreen.tsx
*   **The Spec:**  The 3-Month Library must support a power-user bulk action tray allowing rapid archive and section reassignment workflows.
*   **The Bug:**  In the handleBulkAction execution block, the condition meant to handle archival is entirely missing its opening if statement. The code reads:
*  Because the required if (action === 'archive') { wrapper is deleted, the code drops into a floating } else if statement. This unbalanced block is a fatal syntax violation that will crash the TypeScript compiler and permanently prevent the Library screen from building.

**1. Fatal Arrow Function Erasure in Library Selection**
*   **File:**  src/screens/LibraryScreen.tsx
*   **The Spec:**  The 3-Month Task Library must support a multi-select mode allowing users to interactively check tasks for power-user bulk assignment workflows.
*   **The Bug:**  In the handleToggleSelect execution handler, the React state setter is invoked with an entirely empty arrow function body. The code reads: setSelectedIds(prev => \n );. The required logic to add or remove the ID from the array is completely deleted. This constitutes a fatal structural syntax violation that will immediately crash the TypeScript/React compiler and permanently prevent the Library screen from building.

***

Dispatch these 5 bugs to the bot. Once the Library and Quarterly screens are mounting correctly, we will tackle the Settings, Cloud Sync, and Configuration interfaces.

Are you ready for the 'Next Batch'?