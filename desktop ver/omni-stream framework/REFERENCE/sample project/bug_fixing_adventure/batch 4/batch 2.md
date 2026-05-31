I received your confirmation. We are moving immediately to **Priority 2: Pure Engines**.

The database foundation is being secured, but our core math and logic layers are completely compromised. If the analytics and spaced-repetition algorithms are mathematically falsifying data or crashing mid-calculation, the entire W-List philosophy fails. 

I have sliced the engine domain into sub-batches to protect the implementation bot's context window. We begin with the Analytics and RSR pure math functions. Do not let the bot hallucinate fixes outside of this exact list.

Here is the highest-priority batch for immediate execution:

***

### Batch 2: Pure Engines - Analytics & RSR Math (Part 1)

**1. Mathematical Falsification in Daily Section Analytics**
*   **File:**  src/engine/analytics.ts
*   **The Spec:**  The daily audit report must mathematically calculate the true completion rate for each section by evaluating points earned exclusively from completed tasks.
*   **The Bug:**  In the computeDailyMetrics function, the sec_earned aggregation calculates points by executing const sec_earned = tasks.reduce((s, a) => s + a.assigned_points, 0);. It completely omits the required .filter(a => COMPLETE_STATES.has(a.state)) logic used elsewhere. Consequently, the engine blindly sums the points of  *every*  task regardless of state, meaning sec_earned will always mathematically equal sec_possible. This structurally falsifies the analytics, forcing every section to permanently report a 100% completion rate.

**1. Annual Forecast Engine Fatally References Undeclared Variable**
*   **File:**  src/engine/analytics.ts
*   **The Spec:**  The analytics engine must accurately forecast end-of-year point totals based on a 30-day moving point velocity and the remaining calendar days.
*   **The Bug:**  Inside the forecastAnnualPoints pure function, the math executes the projection via: const expected_eoy_total = earnedYtd + (velocity30d * daysRemainingInYear);. Furthermore, it attempts to validate trajectory via on_track = daysToTarget <= daysRemainingInYear;. However, the variable daysRemainingInYear is completely undeclared, uninitialized, and never passed into the function's scope. Attempting to render the Annual Tracker will instantly throw a fatal ReferenceError: daysRemainingInYear is not defined, crashing the Analytics Dashboard.

**4. Illegal Space in Variable Name Aborts Annual Mathematics**
*   **File:**  src/engine/analytics.ts
*   **The Spec:**  The forecastAnnualPoints pure function must mathematically calculate the required velocity to hit end-of-year point targets.
*   **The Bug:**  Inside the trajectory calculation block, the engine calculates the remaining days via const daysToTarget = remaining / velocity7d;. Immediately below it, the code attempts to map this float to the calendar by executing projectedDate.setDate(projectedDate.getDate() + Math.ceil(daysToTarg et));. The physical space inserted into daysToTarg et breaks the variable reference into two illegal tokens. This is a hard structural syntax error that will immediately fail compilation and kill the analytics engine.

**2. Unreachable SM-2 Exponential Scaling (RSR Engine Bypass)**
*   **File:**  src/engine/rsrEngine.ts
*   **The Spec:**  The Reinforced Spaced Repetition engine must strictly scale review intervals exponentially upon successful evaluation using the SM-2 algorithm.
*   **The Bug:**  In the calculateNextRsrInterval pure function, the conditional guard intended to check if the user failed a review (e.g., if (quality < 3) {) is entirely missing. Immediately after destructing the input variables, the code unconditionally executes repetition_count = 0; interval_days = 1;, calculates a penalized ease factor, and directly hits a return statement. Because this failure block executes unconditionally for everNy single review, the actual SM-2 scaling logic below it is completely unreachable dead code. Every RSR task—regardless of a perfect score of 5—will be permanently reset to a 1-day interval.

**4. Unconditional Hardcoded Overwrite Destroys SM-2 Spaced Repetition Curve**
*   **File:**  src/engine/rsrEngine.ts
*   **The Spec:**  The Reinforced Spaced Repetition (RSR) engine must accurately evaluate the SM-2 learning curve to assign appropriate interval days.
*   **The Bug:**  Inside the calculateNextRsrInterval pure function, the success condition for a new task (if (repetition_count === 0)) executes interval_days = 1; as expected for SM-2. However, on the immediate subsequent line, it unconditionally executes interval_days = 6; before closing the block. This mathematically erases the foundational 1-day interval curve, permanently delaying all initial academic reviews by nearly a week and structurally destroying the spaced repetition pipeline.

***

Assign these to the implementation bot immediately. We cannot proceed to the services or UI layers until these core mathematical algorithms are flawless.

Are you ready for the 'Next Batch'?