Understood. The persistence layer is stabilizing, but we are far from secure. We are moving strictly up the architectural stack to **Priority 2: Pure Engines**. 

I have isolated a highly destructive batch of 4 bugs residing directly in our core math, analytics forecasting, and state constraint engines. If these foundational functions are throwing hard syntax errors, bypassing architectural limits, or returning corrupted calculations, our downstream execution services will be processing pure garbage. 

Here is your highly focused implementation batch. Do not touch the execution services until these core engine formulas are airtight.

***

### BATCH 2
**Layer:** Priority 2 - Pure Engines
**Domain:** Core Math, Analytics Forecasts & State Constraints

**3. Broken SM-2 Spaced Repetition Scaling (Empty Block)**   **File:**  src/engine/rsrEngine.ts
*   **The Spec:**  The Reinforced Spaced Repetition (RSR) engine must use an adapted SM-2 algorithm to exponentially scale interval_days based on the user's ease_factor over multiple repetitions.
*   **The Bug:**  In calculateNextRsrInterval, the conditional block handling repetitions greater than 1 is completely empty: } else { }. Following this empty block, it simply executes interval_days = Math.min(interval_days, MAX_INTERVAL);. Because the mathematical scaling logic (interval_days * ease_factor) was omitted from the else block, any RSR task will permanently plateau at a 6-day interval regardless of how many times it is successfully reviewed.

**4. Undeclared Variable and Typo in Forecast Engine**  In src/engine/analytics.ts, the forecastAnnualPoints function attempts to calculate the expected_eoy_total using a variable named velocity30d. However, velocity30d is entirely missing from the function's parameter signature, which only accepts earnedYtd, dayOfYear, velocity7d, and target. Furthermore, the code contains a hard syntax typo with an illegal space inside a variable reference: Math.ceil(daysToTarg et). Executing this forecast will instantly crash the analytics engine.

**4. Reference Error in W-Symbol SVG Mathematics**   **File:**  src/engine/wSymbol.ts
*   **The Bug:**  The pure math function getWAnimationPath calculates the geometric points for the progressive checkmark drawing. It attempts to define the bounding box using const width = size - (margin * 2); and const height = size - (margin * 2);. The variable margin is never declared, initialized, or passed into the function parameters. Attempting to render any TaskRow will immediately throw a ReferenceError: margin is not defined and crash the UI.

**1. Daily List 3-List Violation (Maximum Count Bypass)**   **File:**  src/engine/listEngine.ts
*   **The Spec:**  The business logic explicitly mandates that there should be "at most two valid lists at a time" (one active, one audited) to strictly govern capacity.
*   **The Bug:**  In the validateActiveListCount function, the check for ListType.DAILY returns activeCount < 3. When the database already contains 2 active/audited lists, 2 < 3 evaluates to true. This causes src/services/listService.ts to authorize the creation of a 3rd daily list, fundamentally breaking the strict 2-list architectural limit.

***

Implement these pure engine fixes immediately to restore our mathematical integrity. Are you ready for the Next Batch?