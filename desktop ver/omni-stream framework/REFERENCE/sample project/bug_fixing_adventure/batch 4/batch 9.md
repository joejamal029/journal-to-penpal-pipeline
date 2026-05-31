The macro planning layer is stabilizing, but our data visualization and dashboards are throwing hard exceptions. If the user cannot see their progress or understand the RSR decay curves, the core feedback loop of the W-List philosophy dies.

We are continuing through **Priority 4: UI & Components**, carving out the next specific domain: **Analytics, Dashboards, & Visualizations**. 

Here is the next strictly capped batch for immediate execution. Do not let the bot drift outside of these DOM trees and state setters.

***

### Batch 9: UI & Components - Analytics, Dashboards, & Visualizations (Part 3)

**5. Array Map Erasure Destroys Streak Calendar Heatmap**
*   **File:**  src/components/StreakCalendar.tsx
*   **The Bug:**  The Analytics Dashboard requires a GitHub-style heatmap to accurately render consecutive day completions. When generating the Y-axis labels for the SVG grid, the iteration wrapper for the days array is entirely deleted. The JSX structure abruptly begins with <SvgText key={'day-${d}'} and illegally terminates with a floating ))}  closure. Because the d index variable is undeclared in this scope, evaluating the Streak Calendar will throw an immediate runtime crash and permanently brick the UI.

**3. Mismatched DOM Tags Brick the Streak Calendar Modal**
*   **File:**  src/components/StreakCalendar.tsx
*   **The Spec:**  The Analytics Dashboard must render a visual GitHub-style streak heatmap, providing a modal that displays completion percentage details when a specific day is tapped.
*   **The Bug:**  Inside the Day Summary Modal rendering block, the JSX element tree is structurally corrupted. The completion rate metric is wrapped in a container tag declared as <View style={styles.modalMetric}>, but immediately following the {Math.round(selectedDay.completion_rate * 100)}% data node, it explicitly closes with an orphaned </Text> tag. This mismatched View/Text node violates strict React Native DOM rules and will instantly trigger a fatal JSX parsing exception, permanently crashing the bundler.

**2. State Setter Corruption in Annual Forecast Engine**
*   **File:**  src/screens/AnalyticsDashboardScreen.tsx
*   **The Spec:**  The analytics engine must correctly calculate and project the user's progress toward the 6,000 W-Point annual target and map it to the UI.
*   **The Bug:**  The component declares annualForecast as a React state variable via useState<AnnualForecast | null>(null). However, inside the loadData function, instead of invoking the forecastAnnualPoints engine function and saving the result, it blindly passes five raw mathematical arguments directly into the state setter: setAnnualForecast(annual.points_earned_ytd, annual.day_of_year, v7, v30, 6000);. React state setters only accept a single argument. This physically forces annualForecast to become a raw integer instead of an object, which will crash the dashboard the moment the UI attempts to render {forecast.on_track}.

**5. Illegal Physical Space in Object Key Breaks Dashboard Compilation**
*   **File:**  src/screens/AnalyticsDashboardScreen.tsx
*   **The Spec:**  The analytics dashboard must render dense informational containers, conforming to the strict UI/UX Mobile-first specifications.
*   **The Bug:**  Inside the StyleSheet.create definition for the header container, the CSS-in-JS property contains an illegal typographical error. It explicitly reads pa ddingHorizontal: 16,. The physical whitespace inserted into the JavaScript object key violently breaks the ES6 parsing rules. The TypeScript/JavaScript bundler will instantly throw a syntax compiler exception, entirely preventing the application from building.

**5. Undeclared `nextMs` Crashes RSR Decay Visualization**
*   **File:**  src/screens/RSRScheduleScreen.tsx
*   **The Spec:**  The RSR (Reinforced Spaced Repetition) module must render visual decay bars mapped to the remaining days before a task's next review date.
*   **The Bug:**  Inside the renderVisBar calculation block, the UI attempts to calculate the remaining time via: const daysRemaining = Math.ceil((nextMs - nowMs) / (1000 * 60 * 60 * 24));. However, the nextMs variable is completely omitted from the component's scope (it completely lacks the necessary const nextMs = new Date(schedule.next_review_date).getTime(); initialization). Navigating to the RSR Schedule Screen will trigger an immediate runtime ReferenceError: nextMs is not defined and fatally crash the application.

***

Keep the implementation bot tightly focused on these presentation layers. Once these are balanced, we will move to the configuration screens and the master library registries.

Are you ready for the 'Next Batch'?