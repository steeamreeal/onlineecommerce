# Fewer Permission Prompts

Look through my transcripts' MCP and bash tool calls, and based on those, make a prioritized list of patterns that I should add to my permission allowlist to reduce permission prompts. Focus on read-only commands.

The format for permissions is: `Bash(foo*)`, `Bash(foo)`, `Bash(foo bar *)`, `mcp__slack__slack_read_thread`, etc.

Then, add these to the project `.claude/settings.json` under `permissions.allow`.

## Steps

1. **Locate transcripts.** Session transcripts live at `~/.claude/projects/<sanitized-cwd>/*.jsonl`. Each line is a JSON object. Tool calls appear as `assistant` messages with `message.content[]` entries of `type: "tool_use"`. The `name` field identifies the tool; for Bash, `input.command` is the shell string. Scan recent transcripts across the user's projects dir, capped at ~50 most-recently-modified JSONL files.

2. **Extract tool-call frequencies.** For `Bash`: parse the command, take the leading token (handling `sudo`, `timeout`, pipes, `&&`, env-var prefixes), record command + first subcommand pair. For MCP: record the full tool name. Count occurrences.

3. **Filter to read-only.** Keep only non-mutating commands (`ls`, `cat`, `pwd`, `git status`, `git log`, `git diff`, `rg`, `grep`, `find`, `gh pr view`, etc). Drop anything that writes, deletes, renames, pushes, merges, installs, or has side effects.

   **Never allowlist a pattern that grants arbitrary code execution** — no wildcard rule for interpreters (python/node/bun/ruby/etc), shells (bash/sh/eval/ssh), package runners (npx/bunx/uvx), or task-runner wildcards (`npm run *`, `make *` — an exact `bun run typecheck` is fine, `bun run *` is not), `gh api *`, `docker run/exec`, `sudo`.

4. **Drop commands Claude Code already auto-allows** — always-allowed read-only utilities (`cat`, `head`, `tail`, `ls`, `cd`, `diff`, `echo`, etc.), zero-arg forms (`pwd`, `whoami`), exact forms, safe-flag tools (`grep`, `jq`, `find` without destructive flags), all git/gh/docker read-only subcommands. If unsure in this repo, grep `src/tools/BashTool/readOnlyValidation.ts` and `src/utils/shell/readOnlyCommandValidation.ts`.

5. **Pick the pattern form.** Use the narrowest pattern that covers observed usage: `Bash(git log *)` for many variants, `Bash(foo)` exact for a single common invocation, full tool name for MCP.

6. **Prioritize.** Rank by count descending, drop anything under ~3 occurrences, cap at top ~20.

7. **Present the prioritized list** as a markdown table: rank, pattern, count, one-line description.

8. **Merge into `.claude/settings.json`** in the current project (not user or local settings). Create if missing. Preserve existing keys/entries, de-duplicate, don't reorder unrelated fields.

9. **Report back** — what was added, what was already present, what was skipped and why.

Do not add anything to `permissions.deny` or `permissions.ask`. Do not touch any other settings field.
