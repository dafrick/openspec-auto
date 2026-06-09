<SUBAGENT-STOP>
You were invoked as a sub-agent by the `openspec-auto` orchestrator. Do not invoke this skill recursively. Follow these instructions directly.
</SUBAGENT-STOP>

# openspec-auto-review

Perform an independent code review of the implementation PR. Derive all context from the PR — no prior conversation history.

## Context isolation

You receive only the PR number in your invocation prompt. Derive all context from the PR itself:

```bash
gh pr view <PR> --json title,body,headRefName,baseRefName
gh pr diff <PR>
```

Read the PR description for:
- The linked issue number
- Agent state (`<!-- agent-state: {...} -->` comment)
- The OpenSpec change name (to locate `tasks.md` and the design doc)

## Step 1 — Understand the scope

From the linked issue and PR description, determine:
- What problem was being solved
- What was explicitly in scope
- What was out of scope

## Step 2 — Review the diff

Review the PR diff for:
- Correctness: does the implementation solve the stated problem?
- Test coverage: are the changes covered by tests?
- Commit discipline: do commits follow conventional commits format?
- Code quality: simplification, reuse, efficiency opportunities

## Step 3 — Categorize findings

For each finding, categorize it:

**In-scope / correct** — implement it:
- The fix is clearly correct and within the scope of the linked issue
- Example: a missing null check, an incorrect branch condition, a test that doesn't actually assert the right thing

**Out-of-scope** — log in PR comment, skip:
- The finding would change behavior beyond what the linked issue asks for
- Post: `"Finding considered but deferred: <description>. Reason: out of scope for this issue."`

**Unclear / design-level** — leave for human reviewer:
- The finding would substantially change the design or require a decision by the maintainer
- Note it in the PR description without implementing it

## Step 4 — Implement in-scope findings

For each in-scope finding:
1. Make the fix
2. Commit: `fix(<scope>): <description>` (conventional commits)
3. Push

After all fixes are pushed, wait for CI:

```bash
gh pr checks <PR> --watch
```

**CI fix cap**: This is Phase 6 — `ciFixes` resets to 0 at the start of this phase. If CI fails, inspect the failure, apply a targeted fix, commit, and push. After 3 CI failures, enter CI-BLOCKED.

## Output contract

**When review is complete and CI passes:**
```
**Status:** APPROVED

<summary of findings and what was implemented vs deferred>
```

**When in-scope fixes require implementation (implemented already):**
```
**Status:** CHANGES_REQUESTED

Implemented:
- <list of what was fixed>

Deferred (out-of-scope):
- <list of what was skipped with reason>

Left for human:
- <list of design-level items>
```

**When CI exhausts fix attempts:**
```
**Status:** CI_BLOCKED

CI failures: <N> attempts
<summary of failures and fixes tried>
```

The orchestrator reads `APPROVED`, `CHANGES_REQUESTED`, or `CI_BLOCKED` from the status line.
