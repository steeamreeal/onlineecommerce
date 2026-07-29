# Schedule Cloud Agents

Helps schedule, update, list, or run **cloud** Claude Code agents (routines). These are NOT local cron jobs — each routine spawns a fully isolated cloud session in Anthropic's cloud infrastructure, either on a recurring cron schedule or once at a specific time.

## First Step

Ask via AskUserQuestion: "What would you like to do with scheduled cloud agents?" with options create/list/update/run.

## What You Can Do

Use the `RemoteTrigger` tool:
- `{action: "list"}` — list all routines
- `{action: "get", trigger_id: "..."}` — fetch one routine
- `{action: "create", body: {...}}` — create a routine
- `{action: "update", trigger_id: "...", body: {...}}` — partial update
- `{action: "run", trigger_id: "..."}` — run a routine now

You CANNOT delete routines — direct users to https://claude.ai/code/routines.

## Create body shape

```json
{
  "name": "AGENT_NAME",
  "cron_expression": "CRON_EXPR",
  "enabled": true,
  "job_config": {
    "ccr": {
      "environment_id": "ENVIRONMENT_ID",
      "session_context": {
        "model": "claude-sonnet-5",
        "sources": [{"git_repository": {"url": "https://github.com/org/repo"}}],
        "allowed_tools": ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
      },
      "events": [{"data": {
        "uuid": "<lowercase v4 uuid>", "session_id": "", "type": "user",
        "parent_tool_use_id": null,
        "message": {"content": "PROMPT_HERE", "role": "user"}
      }}]
    }
  }
}
```

For a one-time run, use `"run_once_at": "YYYY-MM-DDTHH:MM:SSZ"` (RFC3339 UTC, future) instead of `cron_expression`.

Generate a fresh lowercase UUID for `events[].data.uuid`.

## Workflow

### CREATE
1. Understand the goal — remind the user the agent runs in the cloud with no local access.
2. Craft a specific, self-contained prompt.
3. Set the schedule — convert user's local time to UTC, confirm the conversion. Re-check current time with `date -u` before computing relative times. Minimum interval is 1 hour.
4. Choose the model (default `claude-sonnet-5`).
5. Validate MCP connector needs against connected connectors; warn if missing.
6. Review and confirm the full configuration before creating.
7. Create via `RemoteTrigger` with `action: "create"`; output `https://claude.ai/code/routines/{ROUTINE_ID}`.

### UPDATE
List routines, ask what to change, show current vs proposed, confirm, update.

### LIST
Fetch and display: name, schedule (human-readable), enabled/disabled, next run, repo(s).

### RUN NOW
Confirm which routine, execute, confirm.

## Important Notes

- Cloud agents cannot access local files, services, or environment variables.
- Always convert cron to human-readable when displaying.
- `ended_reason: "run_once_fired"` means a one-shot already ran; re-arm by updating with a new `run_once_at`.
- Default `enabled: true` unless told otherwise.
- Normalize GitHub URLs to full HTTPS form without `.git`.
- The prompt must be self-contained — the cloud agent starts with zero context.
- To delete a routine, direct users to https://claude.ai/code/routines.
