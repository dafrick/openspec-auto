# openspec-auto

Autonomous GitHub issue lifecycle agent for Claude Code. Manages the full issue lifecycle — triage → explore → propose → implement → review → wrap-up — with every issue backed by an OpenSpec proposal, design, and task list.

## What it does

`openspec-auto` is a Claude Code skill that autonomously resolves GitHub issues with structure: every issue gets an OpenSpec proposal, design, and task list before a line of code is written. The PR carries machine-parseable agent state so runs are resumable and human-reviewable at every phase.

## Prerequisites

- [OpenSpec CLI](https://github.com/dafrick/openspec-auto) with skills: `opsx:explore`, `opsx:propose`, `opsx:apply`, `opsx:archive`
- Superpowers skills: `superpowers:using-git-worktrees`, `superpowers:test-driven-development`
- `gh` CLI (authenticated)
- Node.js 20+
- **The target repository must be OpenSpec-initialized** (`openspec init`) — `propose` creates and applies changes under `openspec/changes/`. The loop assumes this is in place and does not set it up for you.

## Install

```bash
git clone https://github.com/dafrick/openspec-auto.git
cp -r openspec-auto/skill/* ~/.claude/skills/
cd ~/.claude/skills/openspec-auto && npm install
node_modules/.bin/tsx scripts/init.ts
```

## Usage

From within any project repository, invoke as a loop:

```
/loop /openspec-auto
```

The `/loop` form is required so Claude Code re-reads the skill on each iteration, enabling resumability across context resets.

## Configuration

`init` creates `.openspec-auto.json` at your project root (git-ignored). It contains:

```json
{ "reviewer": "github-handle" }
```

To re-run init: `npx tsx scripts/init.ts`

## Limitations

- Designed for Claude Code only (uses harness tools: `Agent`, `Skill`, `ExitWorktree`, `ScheduleWakeup`)
- Requires OpenSpec CLI and skills
- Processes one issue per loop iteration
- Does not auto-merge PRs — human review is always the final step
