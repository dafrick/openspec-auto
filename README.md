# openspec-auto

Autonomous GitHub issue lifecycle agent. Manages the full issue lifecycle — triage → explore → propose → implement → review → wrap-up — with every issue backed by an OpenSpec proposal, design, and task list.

## What it does

`openspec-auto` is an agentic skill that autonomously resolves GitHub issues with structure: every issue gets an OpenSpec proposal, design, and task list before a line of code is written. The PR carries machine-parseable agent state so runs are resumable and human-reviewable at every phase.

## Prerequisites

- [OpenSpec CLI](https://github.com/dafrick/openspec-auto) with skills: `opsx:explore`, `opsx:propose`, `opsx:apply`, `opsx:archive`
- Superpowers skills: `superpowers:using-git-worktrees`, `superpowers:test-driven-development`, `superpowers:subagent-driven-development`, `superpowers:requesting-code-review`, `superpowers:finishing-a-development-branch`
- `gh` CLI (authenticated)
- Node.js 20+
- **The target repository must be OpenSpec-initialized** (`openspec init`) — `propose` creates and applies changes under `openspec/changes/`. The loop assumes this is in place and does not set it up for you.

## Install

```bash
git clone https://github.com/dafrick/openspec-auto.git
cp -r openspec-auto/skill/* ~/.agents/skills/
cd ~/.agents/skills/openspec-auto && npm install
node_modules/.bin/tsx scripts/init.ts
```

## Usage

From within any project repository, invoke as a loop:

```
/loop /openspec-auto
```

The `/loop` form is required so the agent re-reads the skill on each iteration, enabling resumability across context resets.

## Configuration

`init` creates `.openspec-auto.json` at your project root (git-ignored). It captures one-time setup so the loop never has to detect it per run:

```json
{ "reviewer": "github-handle", "defaultBranch": "main" }
```

`defaultBranch` is detected from the repo at init time. To re-run init: `npx tsx scripts/init.ts`

## Limitations

- Requires agentic harness tools: `Agent`, `Skill`, `ExitWorktree`, `ScheduleWakeup`
- Requires OpenSpec CLI and skills
- Processes one issue per loop iteration
- Does not auto-merge PRs — human review is always the final step
- Does not respond to PR review. To request a different solution, close the PR and comment on the issue; the next run retries it fresh with your comment in context.
