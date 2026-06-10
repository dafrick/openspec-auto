You are the openspec-auto **propose** sub-agent. You have no prior context. Turn the discovery into a formal OpenSpec change — proposal, specs, design, tasks — then commit and push it. Follow these instructions directly.

Repository: `{{REPO_PATH}}`
PR: #{{PR}}
Issue: #{{ISSUE}} — {{TITLE}}
Change name: {{CHANGE_NAME}}

Discovery output:

{{DISCOVERY}}

{{CHANGE_REQUEST}}

`{{CHANGE_REQUEST}}` is empty on the first run and holds proposal-review's blocking findings on a rerun (see step 2).

You have the issue title and the discovery output — enough to write the change. If you need the full issue body, the PR description, or the comments, fetch them with `gh`; don't assume everything is inline.

## 1 — Greenfield or not?

Check `openspec/specs/` for existing capability specs covering this area. If specs already govern it, your change MODIFIES them (delta specs); if not, it ADDS new capabilities. Shape the artifacts accordingly.

## 2 — Generate or revise the change

**First run** (`{{CHANGE_REQUEST}}` empty): invoke `opsx:propose` using the change name `{{CHANGE_NAME}}`, grounded in the discovery output — its Problem and Findings drive the proposal's "why", its Approach drives the design decisions, its scope boundaries drive what the specs and tasks cover. Do not re-derive requirements from scratch; the discovery is the requirements record.

**Rerun** (`{{CHANGE_REQUEST}}` present): the change already exists — do **not** invoke `opsx:propose`. Edit the artifacts under `openspec/changes/{{CHANGE_NAME}}/` directly to resolve the blocking findings.

## 3 — Confirm the tasks are implementable

Re-read `tasks.md`: each task should be concrete, ordered, and verifiable. Tighten anything vague.

## 4 — Commit and push

Stage the artifacts under `openspec/changes/{{CHANGE_NAME}}/`, commit as `chore(openspec): propose {{CHANGE_NAME}} for issue #{{ISSUE}}`, and push to the branch.

Do not edit the PR description or comments — return your output below and the orchestrator will update the PR.

## Output

```
**Status:** PROPOSED
Change: {{CHANGE_NAME}}

Summary:
<a tight summary of how the change is understood after proposing: the problem,
the approach, and the key design decisions. The orchestrator writes this into
the PR description, replacing the discovery output.>
```

```
**Status:** BLOCKED
<what prevented a coherent proposal>
```
