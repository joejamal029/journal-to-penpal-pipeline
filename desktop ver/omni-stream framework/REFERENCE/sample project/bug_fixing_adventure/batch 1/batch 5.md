Stop. Halt execution. I have caught a critical deviation in our triage pipeline. While we began addressing Priority 4 UI component mounts in the previous batch, a secondary audit of the backlog revealed four severe, unpatched faults still lingering in the **Priority 3: Services & Integrations** layer. 

As your Technical Project Manager, I enforce strict architectural precedence. We absolutely cannot proceed with wiring up the UI workflows while our cloud sync busses, export pipelines, and core analytics queries in the services layer are actively throwing `ReferenceErrors` or returning falsified metrics. 

We are stepping back down the stack to lock down the remainder of Priority 3 before we touch another React component.

***

### BATCH 6
**Layer:** Priority 3 - Services & Integrations
**Domain:** Data Sync, Exports & Analytics Logic

**2. Universal Data Bus (OneDrive) Pull Crash**  The blueprint specifies an offline-first event-sourcing sync layer resolved by last-write-wins. In src/services/syncService.ts, the applyRemoteEvent function processes incoming remote payloads and attempts to construct a SQLite UPSERT statement. To do this, it maps over a variable named columns (const placeholders = columns.map(...)). However, columns is never declared or extracted (e.g., via Object.keys(payload)) anywhere in the function. This will throw a ReferenceError and permanently break incoming cloud syncs.

**3. Day Audit Export Reference Error**  The specification requires generating Day Audit Reports in Markdown format. In src/services/reportService.ts, the formatDailyMarkdown function builds the markdown header string using # W-List Day ${title}:. The variable title is not declared anywhere in the function's scope (it should be list.title). Attempting to share or export an audited daily list will throw a ReferenceError and crash.

**5. Point Velocity Trend Fails on Non-Continuous Dates**
*   **The Spec:**  The analytics engine requires a "Point velocity trend | 30-day moving average | Line chart", with point velocity explicitly defined as pts/day.
*   **The Bug:**  In src/services/analyticsService.ts, the getPointVelocity query attempts to calculate the 30-day moving average using a SQL window function: ROWS BETWEEN 29 PRECEDING AND CURRENT ROW. Because this query is executed against the lists table rather than a continuous calendar abstraction, it counts  *rows* , not  *days*. If a user takes a 2-week break from the app, the "30-day" window will actually pull data from 44 days ago, completely falsifying the pts/day velocity metric.

**5. Calendar Event Deletion is an Empty Stub**
*   **The Spec:**  The system must fully integrate and manage "External Forced Schedules / Calendar" to auto-populate tasks.
*   **The Bug:**  Despite rendering a schedule grid and offering full creation mechanics, the ability to delete a calendar event is completely missing from the execution layer. In src/services/calendarService.ts, the deleteCalendarEvent function is defined as a completely empty block: export const deleteCalendarEvent = (id: string): void => { }. Users are physically unable to delete scheduled calendar events from the database once they are created.

***

Implement these service layer patches immediately so we can cleanly secure the data pipeline before returning to the UI logic. Are you ready for the Next Batch?