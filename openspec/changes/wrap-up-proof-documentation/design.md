## Context

openspec-auto is an orchestrator + sub-agents system. The code-review sub-agent currently returns `APPROVED` or `CHANGES_REQUESTED` with findings, but no record of *how it verified* the implementation. The implement sub-agent runs tests but does not report which tests it ran. The Wrap up stage posts a human-review comment that lacks any verification evidence.

The three affected files are:
- `skill/openspec-auto/prompts/code-review.md` — defines the code-review sub-agent's output format
- `skill/openspec-auto/prompts/implement.md` — defines the implement sub-agent's output format
- `skill/openspec-auto/SKILL.md` — the orchestrator: owns both the Implement handling (writes impl summary to PR) and Wrap up (posts handoff comment)

## Goals / Non-Goals

**Goals:**
- Require the code-review sub-agent to emit a `**Proof:**` block covering: test commands run, CI state, manual verification steps, and caveats.
- Have the orchestrator extract that proof block and post it as a `## Test Evidence` PR comment during Wrap up.
- Require the implement sub-agent to include a `**Tests run:**` line in its `DONE` output.
- Have the orchestrator include the tests-run summary in the implementation summary written to the PR description.

**Non-Goals:**
- Changing the review verdict logic (APPROVED / CHANGES_REQUESTED) or severity categories.
- Changing how the orchestrator loops on blocking findings.
- Adding any new scripts or tooling — all changes are prompt-text and orchestrator prose.

## Decisions

**D1 — Proof block lives in code-review output, not a separate file.**
The orchestrator already extracts the `**Status:**` line from sub-agent output; extending extraction to a named block (`**Proof:**`) is consistent with the existing pattern. Writing to a file would require a new script and a new handoff convention.

*Alternative considered:* have the implement sub-agent write proof to a file and code-review augment it. Rejected: sub-agents don't write to the PR, and adding a file introduces a new contract between two sub-agents that the orchestrator must manage.

**D2 — `**Tests run:**` in implement DONE output, not a separate section.**
The implement sub-agent output already has a `Summary:` section the orchestrator captures. A single `**Tests run:**` line added to the `DONE` block is the minimal change — the orchestrator can append it to the implementation summary before writing to the PR description.

*Alternative considered:* a richer structured block (matching Proof). Rejected: implement's primary job is shipping code; heavy documentation overhead on the hot path discourages the sub-agent from using the format correctly. One line is easier to comply with.

**D3 — Proof block posted as a PR comment, not appended to the description.**
The PR description holds the implementation summary (written by `write-discovery.ts`). Appending proof there would pollute the summary with operational detail. A separate comment titled `## Test Evidence` is visible, filterable, and doesn't disturb the description structure.

**D4 — Extraction by the orchestrator from sub-agent output (not tool call).**
The orchestrator already reads the full string returned by the sub-agent and branches on `**Status:**`. Extending it to also extract the `**Proof:**` block (a simple text extraction — everything from `**Proof:**` to the next blank-line-delimited section or end of output) keeps the orchestrator in sole control of PR writes and avoids any new IPC surface.

## Risks / Trade-offs

- **Sub-agent compliance** — a sub-agent that omits the `**Proof:**` block gives the orchestrator nothing to post. Mitigation: mark the block as required in the prompt, and have the orchestrator post a fallback comment (`## Test Evidence\n*(no proof block returned by code-review)*`) rather than silently skipping.
- **Extraction fragility** — text extraction on free-form markdown output can miss edge cases (nested blocks, varied whitespace). Mitigation: the format is a named header (`**Proof:**`) followed by a bullet list; the orchestrator extracts from that line to the next blank-line section boundary or end of string. The fallback covers the miss case.
- **Tests-run accuracy** — the implement sub-agent self-reports what tests it ran; it may omit or misstate. Mitigation: the code-review sub-agent independently verifies test coverage; the `**Tests run:**` line is supplementary context, not a verification gate.
