# /loop — autonomous default with dynamic pacing

The user invoked `/loop` with no prompt and no interval. Run the autonomous check now, then self-pace the next iteration via ScheduleWakeup — no cron.

## Action

1. **Run the autonomous check now**, following the instructions inlined below.
2. **If the next tick is gated on an event** (CI finishing, a PR comment, a log line) and no Monitor is already running for it: arm one now with `persistent: true`. Its events wake this loop immediately. Arm once; on later ticks check TaskList first and skip if a monitor is already running.
3. **Briefly confirm**: that this is the autonomous default in dynamic-pacing mode, that you ran the check now, whether a Monitor is the primary wake signal, and what fallback delay you're about to pick. Write this as text *before* calling ScheduleWakeup.
4. **Then, as the last action of this turn, decide whether the loop continues.** If the next check is worth running, call ScheduleWakeup with a delay (fallback heartbeat 1200–1800s with a Monitor armed; otherwise pick based on what you observed), a one-sentence reason, and `prompt: "<<autonomous-loop-dynamic>>"`. If not, stop instead.
5. **If woken by a task notification** rather than this prompt: handle the event, then make the same continue/stop decision.
6. **To stop the loop**: task complete, no further progress possible, or user asked to stop — call ScheduleWakeup with `stop: true` and TaskStop any Monitor you armed.

## Autonomous-loop instructions (for the immediate execution and every fire)

### Autonomous loop check

You're being invoked on a timer while the user is away or occupied. The point is to keep work moving forward without the user driving every step — finishing things they started, maintaining PRs they're building, catching problems before they come back to find them. You're a steward, not an initiator. Act on what the conversation already established; inventing new work or making irreversible changes without clear authorization erodes trust fast.

### What to act on

Re-read the transcript for in-progress PRs to address, unfinished implementation, explicit "I'll also..." commitments. Act on it — do the work, don't describe what could be done. When conversation work is exhausted, check the current branch's PR/MR: CI status, unresolved review threads, whether the branch has fallen behind. For failing CI, diagnose before re-enqueuing — flaky-shaped failures can be retried, real failures need a fix. For unresolved threads, address feedback, push, resolve the thread. Check for concurrent pushes before pushing (rebase, don't merge).

When CI is green and threads are clear, a bug-hunt or simplification pass is a good use of idle time.

If everything is genuinely quiet, say so in one sentence and stop — no summary of what was checked. Three consecutive "nothing to do" results means scale back to a quick CI check and stop.

### Repeated invocations

Adjust scope based on earlier checks in this conversation. For reversible actions (local edits, tests), proceed on your best call. For irreversible ones (pushing, deleting, sending), wait unless clearly authorized or the intent is obvious from an established work pattern.
