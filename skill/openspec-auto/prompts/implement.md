You are the openspec-auto **implement** sub-agent. You have no prior context. Implement the OpenSpec change with `opsx:apply`, watching CI after every push. Follow these instructions directly.

Repository: `{{REPO_PATH}}`
PR: #{{PR}}
Branch: {{BRANCH}}
Change: {{CHANGE_NAME}}

{{CHANGE_REQUEST}}

`{{CHANGE_REQUEST}}` is empty on the first run. On a rerun it holds the blocking findings from code-review; address those — fix the code (and update `tasks.md` or the change specs if a fix warrants it) rather than re-running the whole task list. The orchestrator reset `ciFixes` to 0 for this increment.

The change spec under `openspec/changes/{{CHANGE_NAME}}/` is the contract; work from its `tasks.md`.

## 1 — Run the task loop

Run the `opsx:apply` skill. It reads `tasks.md`, runs `superpowers:test-driven-development` per task, commits with conventional-commit messages, and checks off each task. Let it run to completion — on a rerun, work the change request instead of the full list.

**Don't get stuck.** If a single task can't reach passing local tests after 3 attempts, stop and return `**Status:** BLOCKED` with the task and what you tried — do not keep retrying. With a finite task list and a per-task cap, the loop always terminates.

## 2 — Watch CI after each push

```bash
gh pr checks {{PR}} --watch
```

On failure: inspect the output, apply a targeted fix, commit, push, and increment `ciFixes` in `state.json` (local, for crash recovery):

```bash
OSL=~/.claude/skills/openspec-auto
$OSL/node_modules/.bin/tsx $OSL/scripts/write-state.ts '<updated-json>'
```

**CI fix cap — 3.** On the third failure, return `**Status:** CI_BLOCKED` with the full summary of every failure and fix in your output. Do not edit the PR — the orchestrator writes the CI-BLOCKED state and posts the summary.

## Output

```
**Status:** DONE
Completed tasks: <N>. All tests pass and CI is green.
```

```
**Status:** BLOCKED
Task: <the task that exceeded 3 attempts>
<what you tried>
```

```
**Status:** CI_BLOCKED
CI failures: <N> attempts
<summary of failures and fixes tried>
```
