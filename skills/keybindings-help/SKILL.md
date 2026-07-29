# Keybindings Skill

Create or modify `~/.claude/keybindings.json` to customize keyboard shortcuts.

## CRITICAL: Read Before Write

**Always read `~/.claude/keybindings.json` first** (it may not exist yet). Merge changes with existing bindings — never replace the entire file.

- Use **Edit** tool for modifications to existing files
- Use **Write** tool only if the file does not exist yet

## File Format

```json
{
  "$schema": "https://www.schemastore.org/claude-code-keybindings.json",
  "$docs": "https://code.claude.com/docs/en/keybindings",
  "bindings": [
    {
      "context": "Chat",
      "bindings": {
        "ctrl+e": "chat:externalEditor"
      }
    }
  ]
}
```

Always include the `$schema` and `$docs` fields.

## Keystroke Syntax

**Modifiers** (combine with `+`): `ctrl`/`control`, `alt`/`opt`/`option` (identical to `meta` in terminals), `shift`, `meta`/`cmd`/`command`.

**Special keys**: `escape`/`esc`, `enter`/`return`, `tab`, `space`, `backspace`, `delete`, `up`, `down`, `left`, `right`.

**Chords**: space-separated keystrokes, e.g. `ctrl+k ctrl+s` (1-second timeout between keystrokes).

**Examples**: `ctrl+shift+p`, `alt+enter`, `ctrl+k ctrl+n`.

## Unbinding Default Shortcuts

Set a key to `null` to remove its default binding:

```json
{ "context": "Chat", "bindings": { "ctrl+s": null } }
```

## How User Bindings Interact with Defaults

- User bindings are **additive** — appended after the default bindings.
- To **move** a binding: unbind the old key (`null`) AND add the new binding.
- A context only needs to appear in the user's file if they want to change something in that context.

## Common Patterns

### Rebind a key
```json
{ "context": "Chat", "bindings": { "ctrl+g": null, "ctrl+e": "chat:externalEditor" } }
```

### Add a chord binding
```json
{ "context": "Global", "bindings": { "ctrl+k ctrl+t": "app:toggleTodos" } }
```

## Behavioral Rules

1. Only include contexts the user wants to change (minimal overrides)
2. Validate that actions and contexts are from the known lists
3. Warn the user proactively about conflicts with reserved shortcuts or common tools (tmux `ctrl+b`, screen `ctrl+a`)
4. Adding a binding for an existing action is additive unless explicitly unbound
5. To fully replace a default binding, unbind the old key AND add the new one

## Validation

Claude Code validates the file when it loads; warnings go to the debug log.

| Issue | Cause | Fix |
| --- | --- | --- |
| `keybindings.json must have a "bindings" array` | Missing wrapper object | Wrap in `{ "bindings": [...] }` |
| `"bindings" must be an array` | `bindings` not an array | Use an array of `{ context, bindings }` |
| `Unknown context "X"` | Typo | Use exact context names |
| `Duplicate key "X" in Y bindings` | Same key twice in one context | Remove the duplicate |
| `"X" may not work: ...` | Reserved shortcut conflict | Choose a different key |
| `Invalid action for "X"` | Non-string/non-null action | Use a string action or `null` |

## Reserved Shortcuts

**Non-rebindable:** `ctrl+c`, `ctrl+d`, `ctrl+m`, `capslock`.
**Terminal reserved:** `ctrl+z` (SIGTSTP), `ctrl+\` (SIGQUIT).
**macOS reserved:** `cmd+c`, `cmd+v`, `cmd+x`, `cmd+q`, `cmd+w`, `cmd+tab`, `cmd+space`.

## Available Contexts

Global, Chat, Autocomplete, Confirmation, Help, Transcript, HistorySearch, Task, ThemePicker, Settings, Tabs, Attachments, Footer, MessageSelector, DiffDialog, DiffPanel, ModelPicker, Select, Plugin, Scroll.

## Available Actions (selected)

`app:interrupt` (ctrl+c), `app:exit` (ctrl+d), `app:toggleTodos` (ctrl+t), `app:toggleTranscript` (ctrl+o), `history:search` (ctrl+r), `chat:cancel` (escape), `chat:submit` (enter), `chat:newline` (ctrl+j), `chat:externalEditor` (ctrl+x ctrl+e, ctrl+g), `chat:stash` (ctrl+s), `autocomplete:accept` (tab), `confirm:yes` (y, enter), `confirm:no` (escape, n), `transcript:toggleShowAll` (ctrl+e), `transcript:exit` (ctrl+c, escape, q), `task:background` (ctrl+x ctrl+b, ctrl+b), `help:dismiss` (escape), `messageSelector:select` (enter), `diff:dismiss` (escape), `select:accept` (space, enter), `scroll:pageUp`/`scroll:pageDown` (pageup/pagedown), `selection:copy` (ctrl+shift+c, cmd+c).

For the full action table, check the current keybindings documentation — this list is abridged.
