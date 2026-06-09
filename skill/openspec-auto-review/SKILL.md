<SUBAGENT-STOP>
You were invoked as a sub-agent by the `openspec-auto` orchestrator. Do not invoke this skill recursively. Follow these instructions directly.
</SUBAGENT-STOP>

# openspec-auto-review

Review the implementation PR using `superpowers:requesting-code-review`, then apply the openspec-auto finding categorization rules.

## Context isolation

You receive only the PR number. Derive all context from the PR itself — no prior conversation history.

## Step 1 — Establish scope

Read the PR description to determine what problem was being solved and what was explicitly in scope. The linked issue number and OpenSpec change name are in the description.

## Step 2 — Invoke superpowers:requesting-code-review

```js
Skill({ skill: "superpowers:requesting-code-review" })
```

This handles diff reading, finding identification, and severity judgment. Let it complete.

## Step 3 — Categorize findings (your unique addition)

For each finding from the review, apply the scope filter:

**In-scope** — implement it:
- Correct and within the scope of the linked issue (missing null check, wrong branch condition, test that doesn't assert correctly)

**Out-of-scope** — post a PR comment and skip:
- Would change behavior beyond what the linked issue asks for
- Post: `"Finding considered but deferred: <description>. Reason: out of scope for this issue."`

**Unclear / design-level** — leave for human reviewer:
- Would substantially change the design or require a maintainer decision
- Note it in the PR description without implementing

After implementing in-scope findings, wait for CI:
```bash
gh pr checks <PR> --watch
```

**CI fix cap**: `ciFixes` resets to 0 at Phase 6 start. After 3 CI failures, enter CI-BLOCKED.

## Output contract

```
**Status:** APPROVED
<summary of findings and what was implemented vs deferred>
```

```
**Status:** CHANGES_REQUESTED

Implemented:
- <list>

Deferred (out-of-scope):
- <list with reason>

Left for human:
- <list>
```

```
**Status:** CI_BLOCKED
CI failures: <N> attempts
<summary>
```

## Integration

| Skill | What it covers | What this skill adds |
|-------|---------------|----------------------|
| `superpowers:requesting-code-review` | Diff reading, finding identification, severity | Scope filter: in-scope / out-of-scope / unclear categorization |
