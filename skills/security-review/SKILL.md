# Security Review

Perform a security-focused code review of the pending changes on the current branch (uncommitted + committed-but-unpushed).

## Objective

Identify HIGH-CONFIDENCE security vulnerabilities newly introduced by the diff under review — not a general code review, not pre-existing issues.

## Process

1. Gather git status, diff, and commit log for the current branch relative to its upstream/main.
2. Research repository context — existing security frameworks, established sanitization patterns, the project's security model.
3. Analyze the diff for security implications, comparing against established secure patterns in the codebase.
4. For each candidate finding, verify exploitability before reporting.

## Categories to examine

- **Input validation**: SQL/command/XXE/template/NoSQL injection, path traversal.
- **Auth**: bypass logic, privilege escalation, session/JWT flaws, authorization bypasses.
- **Crypto & secrets**: hardcoded keys/passwords, weak algorithms, improper key storage, bad randomness, cert validation bypass.
- **Injection & code execution**: deserialization RCE, pickle/YAML injection, eval injection, XSS (reflected/stored/DOM).
- **Data exposure**: sensitive logging, PII handling, API leakage, debug info exposure.

## Exclusions (do not report)

DoS/resource exhaustion, secrets-on-disk (handled elsewhere), rate limiting, lack of hardening/best-practices, theoretical race conditions, outdated-dependency CVEs, memory-safety in memory-safe languages, findings only in tests, log spoofing of user input, SSRF limited to path-only control, regex injection/DoS, doc-only findings, missing audit logs. React/Angular components are assumed safe from XSS unless using `dangerouslySetInnerHTML` or equivalent. Client-side JS lacking auth checks is not a finding — the backend is the trust boundary. UUIDs are assumed unguessable. Env vars/CLI flags are trusted.

## Output format

For each surviving finding: file:line, severity (High/Medium/Low), category, description, concrete exploit scenario, and a fix recommendation. Confidence below 0.7 (or 7/10) — don't report. Prioritize HIGH and MEDIUM; MEDIUM only when obvious and concrete.

## Verification discipline

Read code to determine exploitability — do not execute untrusted code or write files during the review. Every finding should be something a security engineer would confidently raise in a PR review, with a clear attack path and actionable fix.
