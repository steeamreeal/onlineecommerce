# Update Config Skill

Modify Claude Code configuration by updating settings.json files.

## When Hooks Are Required (Not Memory)

If the user wants something to happen automatically in response to an EVENT, they need a **hook** configured in settings.json. Memory/preferences cannot trigger automated actions.

**These require hooks:**
- "Before compacting, ask me what to preserve" → PreCompact hook
- "After writing files, run prettier" → PostToolUse hook with Write|Edit matcher
- "When I run bash commands, log them" → PreToolUse hook with Bash matcher
- "Always run tests after code changes" → PostToolUse hook

**Hook events:** PreToolUse, PostToolUse, PreCompact, PostCompact, Stop, Notification, SessionStart

## CRITICAL: Read Before Write

**Always read the existing settings file before making changes.** Merge new settings with existing ones - never replace the entire file.

## CRITICAL: Use AskUserQuestion for Ambiguity

When the user's request is ambiguous, use AskUserQuestion to clarify:
- Which settings file to modify (user/project/local)
- Whether to add to existing arrays or replace them
- Specific values when multiple options exist

## Decision: /config command vs Direct Edit

**Suggest the `/config` slash command** for these simple settings:
- `theme`, `editorMode`, `verbose`, `model`
- `language`, `alwaysThinkingEnabled`
- `permissions.defaultMode`

**Edit settings.json directly** for:
- Hooks (PreToolUse, PostToolUse, etc.)
- Complex permission rules (allow/deny arrays)
- Environment variables
- MCP server configuration
- Plugin configuration

## Workflow

1. **Clarify intent** - Ask if the request is ambiguous
2. **Read existing file** - Use Read tool on the target settings file
3. **Merge carefully** - Preserve existing settings, especially arrays
4. **Edit file** - Use Edit tool (if file doesn't exist, ask user to create it first)
5. **Confirm** - Tell user what was changed

## Merging Arrays (Important!)

When adding to permission arrays or hook arrays, **merge with existing**, don't replace.

## Settings File Locations

| File | Scope | Git | Use For |
|------|-------|-----|---------|
| `~/.claude/settings.json` | Global | N/A | Personal preferences for all projects |
| `.claude/settings.json` | Project | Commit | Team-wide hooks, permissions, plugins |
| `.claude/settings.local.json` | Project | Gitignore | Personal overrides for this project |

Settings load in order: user → project → local (later overrides earlier).

## Settings Schema Reference (abridged)

### Permissions
```json
{
  "permissions": {
    "allow": ["Bash(npm *)", "Edit(.claude)", "Read"],
    "deny": ["Bash(rm -rf *)"],
    "ask": ["Edit(//etc/*)"],
    "defaultMode": "default",
    "additionalDirectories": ["/extra/dir"]
  }
}
```

Permission rule syntax: exact match (`"Bash(npm run test)"`), prefix wildcard (`"Bash(git *)"`), tool only (`"Read"`).

### Environment Variables
```json
{ "env": { "DEBUG": "true", "MY_API_KEY": "value" } }
```

### Model & Agent
```json
{ "model": "sonnet", "agent": "agent-name", "alwaysThinkingEnabled": true }
```

### Hooks

Hooks run commands at specific points in Claude Code's lifecycle.

```json
{
  "hooks": {
    "EVENT_NAME": [
      {
        "matcher": "ToolName|OtherTool",
        "hooks": [
          { "type": "command", "command": "your-command-here", "timeout": 60 }
        ]
      }
    ]
  }
}
```

Events: PreToolUse, PostToolUse, PostToolUseFailure, Notification, Stop, PreCompact, PostCompact, UserPromptSubmit, SessionStart. Common matchers: Bash, Write, Edit, Read, Glob, Grep.

Hook types: `command` (shell command), `prompt` (LLM-evaluated condition, tool events only), `agent` (runs an agent with tools, tool events only).

Hook input arrives as JSON on stdin (`session_id`, `tool_name`, `tool_input`, `tool_response` on PostToolUse).

Hook JSON output can include `systemMessage`, `continue`, `stopReason`, `suppressOutput`, `decision`, `reason`, `hookSpecificOutput` (with `additionalContext`, `permissionDecision`, `permissionDecisionReason`, `updatedInput`).

## Constructing a Hook (with verification)

1. **Dedup check** — read the target file for an existing hook on the same event+matcher.
2. **Construct the command for THIS project** — don't assume package manager or invocation style; extract stdin payload safely with `jq -r`; skip inputs the tool doesn't handle; stay raw (no `|| true`) until tested.
3. **Pipe-test the raw command** with a synthesized stdin payload matching the event shape; check exit code and side effect; wrap with `2>/dev/null || true` once it works (unless a blocking check is wanted).
4. **Write the JSON**, merging into the target file; gitignore `.claude/settings.local.json` if newly created.
5. **Validate syntax + schema**: `jq -e '.hooks.<event>[] | select(.matcher == "<matcher>") | .hooks[] | select(.type == "command") | .command' <target-file>`.
6. **Prove the hook fires** for `Pre|PostToolUse` on a triggerable matcher — temporarily prefix the command with a sentinel write, trigger the matching tool, confirm, then clean up.
7. **Handoff** — tell the user the hook is live (or needs `/hooks`/restart if the settings watcher isn't watching `.claude/` yet).

## Common Mistakes to Avoid

1. Replacing instead of merging - always preserve existing settings
2. Wrong file - ask user if scope is unclear
3. Invalid JSON - validate syntax after changes
4. Forgetting to read first - always read before write

## Troubleshooting Hooks

1. Check the settings file exists and is being read
2. Verify JSON syntax (invalid JSON silently fails)
3. Check the matcher matches the tool name
4. Check hook type is "command", "prompt", or "agent"
5. Test the command manually
6. Use `claude --debug` to see hook execution logs
