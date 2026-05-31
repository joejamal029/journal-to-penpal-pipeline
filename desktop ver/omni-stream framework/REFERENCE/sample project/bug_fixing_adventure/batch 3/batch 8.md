Listen up. Your patches have successfully closed the data bounds and state mutations in the backend. The core Services layer is finally secured and mathematically sound. We are officially ascending to the top of the stack: **Priority 4: UI & Components**.

However, you are not touching the visual logic or workflow routing yet. The UI layer is fundamentally compromised by severe TypeScript and JSX syntax violations. We have severed imports, unbalanced DOM trees, and illegal property accessors that are actively crashing the compiler. The application physically cannot build to render these screens.

I have isolated these five fatal syntax errors into a maximum-density sub-batch. Fix these baseline structural failures immediately so the React Native environment can actually compile.

***

### BATCH 8
**Layer:** Priority 4 - UI & Components (Part 1)
**Domain:** Fatal JSX Syntax & Compiler Crashes

**1. Fatal Missing Import Target in Settings (Compiler Crash)**
*   **File:**  src/screens/SettingsScreen.tsx
*   **The Bug:**  At the top of the file, the import statement for the notification handlers (import { syncRsrMorningAlerts, scheduleDailyListPrompt, scheduleWeeklyAuditReminder }) abruptly terminates. It completely lacks the necessary from '../services/notificationService'; resolution clause and bleeds directly into the next import. This is a hard syntax error that will immediately fail the TypeScript compiler and prevent the Settings screen from building.

**3. Unbalanced DOM Tree Syntax Error in Restriction Modal**
*   **File:**  src/screens/NewListScreen.tsx
*   **The Spec:**  The system must render a restriction override modal requiring users to provide a reason when adding a task that suffered zero-completion on a prior list.
*   **The Bug:**  At the bottom of the component, the structure rendering the override modal completely lacks its opening <Modal> tag. The JSX abruptly starts with an orphaned <View style={styles.modalBg}> but explicitly terminates with a </Modal> closing tag on line 336. This unbalanced DOM tree is a severe syntax violation that will immediately crash the TypeScript/React compiler and prevent the entire New List Builder from rendering.

**3. Illegal Space in JSX Property Accessor Crashes**  **TaskRow**
*   **File:**  src/components/TaskRow.tsx
*   **The Bug:**  Inside the inline Pomodoro counter UI, the code attempts to render the removal button using a malformed style reference: <Text style={styles.pom oBtnText}>[-]</Text>. The physical space inserted into pom oBtnText violates strict JavaScript object accessor syntax. Parsing this file will result in an immediate runtime SyntaxError or TypeError, fundamentally breaking the rendering pipeline for every single task row in the application.

**4. Catastrophic JSX Syntax Error in Task Attention Report**
*   **File:**  src/screens/TaskAttentionReportScreen.tsx
*   **The Spec:**  The analytics screen must render a "Never Appeared" section to surface neglected tasks from the 3-Month Library.
*   **The Bug:**  Within the empty-state rendering block for the neverAppeared array, the JSX structure is fatally malformed. It reads: {neverAppeared.length === 0 ? ( once</Text> ) : ( ... )}. The literal string once</Text> completely lacks an opening <Text> tag or parent container. This unbalanced DOM tree is a hard syntax violation that will immediately crash the TypeScript/React compiler and prevent the Analytics Dashboard from building.

**1. Catastrophic JSX Syntax Error in Task Attention Report**
*   **File:**  src/screens/TaskAttentionReportScreen.tsx
*   **The Spec:**  The Task Attention Report must render analytical insights to highlight neglected tasks, specifically identifying a task's "Half-Life."
*   **The Bug:**  Within the "Task Half-Life" rendering block, the component attempts to display task metadata using a fatally malformed React element tag: <Te xt style={styles.taskMeta}> which abruptly closes with </Te xt>. The illegal physical space inside the <Te xt> tag violates strict JSX compiler rules. Attempting to build or render the Analytics Dashboard will instantly crash the TypeScript compiler and permanently fail the application build.

***

Clear these catastrophic syntax errors immediately so our frontend can survive compilation. Are you ready for the 'Next Batch'?