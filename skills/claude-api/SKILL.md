# Building LLM-Powered Applications with Claude

Choose the right surface based on your needs, detect the project language, then read the relevant language-specific documentation.

## Before You Start

Scan for non-Anthropic provider markers (`import openai`, `langchain_openai`, `gpt-4`, etc). If found, stop and ask whether to switch to Claude or produce a non-Claude implementation — this skill's output is Anthropic SDK code.

## Output Requirement

Use the official Anthropic SDK for the project's language by default. Raw HTTP only when explicitly requested, or the language has no official SDK. Never mix, never fall back to OpenAI-compatible shims. Never guess SDK usage — verify bindings against documentation or the SDK repo before writing code.

## Defaults

Unless the user requests otherwise: use `claude-opus-5` (exact model string), default to adaptive thinking (`thinking: {type: "adaptive"}`) for complex tasks, default to streaming for long input/output or high `max_tokens`.

## API Drift Warning

Several Claude API shapes changed in 2025–2026 — verify against current docs rather than trained-in patterns, especially: `thinking` config (`adaptive` replaces `budget_tokens` on 4.6+), web search/fetch tool versions (`_20260209` on recent models), PHP param naming (camelCase), Managed Agents vault credentials.

## Language Detection

Infer from project files: `.py`/`requirements.txt` → Python; `.ts`/`package.json` → TypeScript; `.js` (no `.ts`) → TypeScript (same SDK); `.java`/`pom.xml` → Java; `.kt`/`.scala` → Java SDK; `.go` → Go; `.rb` → Ruby; `.cs` → C#; `.php` → PHP. Ask if ambiguous or unsupported.

## Which Surface Should I Use?

Start simple — single API calls and workflows handle most use cases. Reach for agents only when the task needs open-ended, model-driven exploration.

| Use Case | Tier | Surface |
|---|---|---|
| Classification, summarization, extraction, Q&A | Single call | Claude API |
| Multi-step pipelines, code-controlled logic | Workflow | Claude API + tool use |
| Custom agent with your own tools | Agent | Claude API + tool use (Tool Runner) |
| Server-managed stateful agent with workspace | Agent | Managed Agents |
| Agent on a schedule (cron) | Agent | Managed Agents — scheduled deployments |

Four approaches to building an agent: (1) manual loop — you own everything; (2) Tool Runner — SDK loop, your tools, you host; (3) Managed Agents — Anthropic hosts loop AND sandbox; (4) Claude Agent SDK — separate product, Claude Code as a library, built-in tools, you host.

## Current Models (abridged — verify against live docs for exact pricing)

| Model | Model ID | Context |
|---|---|---|
| Claude Fable 5 | `claude-fable-5` | 1M |
| Claude Opus 5 | `claude-opus-5` | 1M |
| Claude Opus 4.8 | `claude-opus-4-8` | 1M |
| Claude Sonnet 5 | `claude-sonnet-5` | 1M |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 200K |

**Default to `claude-opus-5` unless the user explicitly names a different model.** Never downgrade for cost. Use exact model ID strings only — never append date suffixes to aliases.

## Thinking & Effort (Quick Reference)

Use adaptive thinking (`thinking: {type: "adaptive"}`) on current models. On Claude Opus 5, thinking is on by default (omitting the param runs adaptive); `{type: "disabled"}` only accepted at effort `high` or below. Effort levels: `low`/`medium`/`high`/`xhigh`/`max` via `output_config.effort`.

## Key Reminders

- 128K output requires streaming (`max_tokens > ~16K`).
- Prompt caching is a prefix match — any byte change downstream invalidates the cache. Max 4 breakpoints per request.
- Structured outputs: use `output_config.format`, not the deprecated `output_format`.
- Tool call JSON: always `json.loads()`/`JSON.parse()`, never string-match.
- Assistant-turn prefills return 400 on Opus 4.6+/Sonnet 4.6/Fable 5/Opus 5 — use `output_config.format` or system prompt instructions instead.
- Bash/text-editor tools are schema-less Anthropic-defined tools — no `input_schema`.
- Managed Agents: agent object created ONCE via `agents.create()`, referenced by ID in every `sessions.create()` — never re-create per run.
- Error handling: catch a most-specific-first exception chain (`NotFoundError` → `RateLimitError` → `APIStatusError` → `APIConnectionError`), never one broad catch-all.

This is an abridged reference. For full details (per-language SDK examples, Managed Agents deep-dive, migration guides, tool-use patterns, prompt-caching architecture), consult the live Anthropic documentation at platform.claude.com or WebFetch the specific topic — the full skill bundles ~15 reference files (shared/*.md, {lang}/claude-api/README.md, {lang}/managed-agents/README.md) that are loaded on demand by the parent Claude Code installation.
