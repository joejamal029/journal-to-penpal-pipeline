Listen up. We are nearing the end of the **Priority 3: Services & Integrations** layer, but two critical structural failures remain. We cannot advance to the UI DOM trees when the backend services are incorrectly mapping UUIDs instead of titles into the export reports, and actively breaking the mathematical weighting of subtasks.

I am enforcing strict verbatim fidelity, extracting the bugs exactly as documented in the master source, and appending the direct code evidence from the codebase.

Here is the final Priority 3 sub-batch for immediate execution:

***

### Batch 7: Priority 3: Services & Integrations - Subtasks & Reporting (Part 3)

VIOLATION 3 — WRONG IMPLEMENTATION Spec Source: wlist_analytics.md, 5. Export & Accountability, "Day Audit Report Format (Markdown export)" File: src/services/reportService.ts Spec Trace: The Day Audit Report must generate a formatted Markdown summary of daily execution, cleanly mapping tasks, their state, and earned points into a readable table for personal accountability and record-keeping. Code Trace: Inside formatDailyMarkdown, the code maps through sectionAssignments and builds the markdown table strings. It blindly injects ${a.task_def_id} directly into the "Task" column because the AssignmentRow payload retrieved from the DB completely skips fetching the task title during ingestion. Divergence: The report exporter prints raw 36-character UUID strings in the "Task" column instead of human-readable task titles, rendering the exported report completely illegible. Evidence:
```typescript
// src/services/reportService.ts
// Group by section
    for (const section of metrics.section_breakdown) {
        md += `## ${section.section_name.toUpperCase()} (${section.points_earned.toFixed(1)} / ${section.points_possible.toFixed(1)} pt)\n`;
        md += `| Task | State | Points |\n`;
        md += `| :--- | :---: | :---: |\n`;

        const sectionAssignments = assignments.filter(a => a.section_id === section.section_id);
        for (const a of sectionAssignments) {
            const stateMarker = getStateMarker(a.state as TaskState);
            const pointsStr = a.state === TaskState.MISSED ? `0/${a.assigned_points}` : `${a.assigned_points}`;
            md += `| ${a.task_def_id} | ${stateMarker} | ${pointsStr} |\n`;
        }
        md += `\n`;
    }
```

VIOLATION 4 — WRONG IMPLEMENTATION Spec Source: 4. daily.md, "To show the subtasks, the subtasks are written right on top of them... and they are also assigned relevant scores written on top of them." File: src/services/taskService.ts Spec Trace: Tasks with multiple fractional subtasks must map their parent's completion percentage mathematically based on the discrete points (relevant scores) actually achieved, not just a raw quantity count. Code Trace: When toggleSubtaskState executes, the engine calculates the parent's completion_percentage by dividing the integer count of completed subtasks (completed) by the total integer count of subtasks (total). It entirely ignores the points integer uniquely mapped to each SubtaskAssignment database row. Divergence: The engine incorrectly weights all subtasks equally using a flat array count, structurally destroying the point-based fractional mathematics explicitly designed into the system. Evidence:
```typescript
// src/services/taskService.ts
export const toggleSubtaskState = (subtaskId: string, state: SubtaskState): void => {
    const now = new Date().toISOString();
    execute('UPDATE subtask_assignments SET state = ?, completed_at = ? WHERE id = ?', [
        state,
        state === SubtaskState.COMPLETE ? now : null,
        subtaskId
    ]);

    // Recalculate parent completion percentage
    const subtask = runQueryFirst<SubtaskAssignment>('SELECT parent_assignment_id FROM subtask_assignments WHERE id = ?', [subtaskId]);
    if (subtask) {
        const allSubtasks = getSubtasksForAssignment(subtask.parent_assignment_id);
        const completed = allSubtasks.filter(s => s.state === SubtaskState.COMPLETE).length;
        const total = allSubtasks.length;
        const percent = total > 0 ? completed / total : 0;

        execute('UPDATE task_assignments SET completion_percentage = ?, updated_at = ? WHERE id = ?', [
            percent, now, subtask.parent_assignment_id
        ]);
```

***

Dispatch these to the implementation bot immediately. With this batch merged, the backend service layer is fully compliant. We will then breach the massive React Native presentation layer (Priority 4).

Are you ready for the 'Next Batch'?