<SUBAGENT-STOP>
You were invoked as a sub-agent by the `openspec-auto` orchestrator. Do not invoke this skill recursively. Follow these instructions directly.
</SUBAGENT-STOP>

# openspec-auto-implement

Implement the OpenSpec task list using `opsx:apply`, then monitor CI after each push.

## Step 1 — Invoke opsx:apply

```js
Skill({ skill: "opsx:apply" })
```

`opsx:apply` handles the full task loop: reads `tasks.md`, invokes `superpowers:test-driven-development` per task, commits with conventional format, and checks off each task. Let it run to completion.

## Step 2 — CI monitoring (your unique addition)

After each commit push, wait for CI:

```bash
gh pr checks <PR> --watch
```

If CI fails:
- Inspect the failure output
- Apply a targeted fix, commit, push
- Increment `ciFixes` in state.json: `OSL=~/.claude/skills/openspec-auto && $OSL/node_modules/.bin/tsx $OSL/scripts/write-state.ts '<updated-json>'`

**CI fix cap**: 3 failures → CI-BLOCKED.

On the third failure:
1. Post a PR comment summarising all CI failures and fix attempts
2. Update state: `phase: "CI-BLOCKED"`, `blocked: true`
3. Output `**Status:** CI_BLOCKED` and stop

## Output contract

```
**Status:** DONE
Completed tasks: <N>
All tests pass and CI is green.
```

```
**Status:** BLOCKED
Task: <description>
<summary of what was tried>
```

```
**Status:** CI_BLOCKED
CI failures: <N> attempts
<summary of failures and fixes tried>
```

## Integration

| Skill | What it covers | What this skill adds |
|-------|---------------|----------------------|
| `opsx:apply` | Task loop, TDD per task, commit discipline, check-off | CI monitoring after each push |
| `superpowers:test-driven-development` | Used internally by `opsx:apply` per task | — |
