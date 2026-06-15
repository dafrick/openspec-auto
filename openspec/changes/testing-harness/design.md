## Context

The repo contains two distinct code surfaces: TypeScript scripts in `skill/openspec-auto/scripts/` and Markdown skill files in `skill/openspec-auto/prompts/` and `SKILL.md`. These require different tooling. There are currently no linters, no CI workflow, and no documented contributor setup. The skill-specific linter ecosystem is brand new (all tools released June 2026), so the goal is to sample a broad set cheaply rather than commit to any one.

## Goals / Non-Goals

**Goals:**
- Fast, reliable blocking CI jobs for the two core surfaces (TypeScript, Markdown)
- Non-blocking experimental jobs for 9 skill-specific linters so they can be evaluated without gating PRs
- Single Justfile at repo root so contributors run the same commands as CI
- Devcontainer that installs all runtimes (Node, Go, Python, just) without a custom image
- Minimal CONTRIBUTING.md scoped to setup + running checks

**Non-Goals:**
- Test execution (unit tests already have a script; wiring them into CI is a separate change)
- Runtime behaviour changes to the published skill
- Enforcement of skill linter results (experimental tier is observe-only)

## Decisions

### Biome over ESLint + Prettier
Biome is a single binary that handles both formatting and lint rules for TypeScript/JavaScript. One config file (`biome.json`), much faster, no plugin ecosystem to manage. The downside is a smaller rule set than ESLint — acceptable here since the scripts are internal tooling, not a public library. Alternative: ESLint + Prettier is more configurable but adds two config files and a plugin chain.

### Two CI tiers: required vs. experimental
The 9 skill linters are all under a week old. Blocking PRs on immature tooling would create noise and friction. The experimental tier runs all jobs in parallel, collects results, and always exits 0 — giving visibility without risk. Once a linter proves its value (or doesn't), it can be promoted or dropped. Alternative: only run proven tools — loses the exploration benefit.

### Justfile over npm scripts / Makefile
npm scripts can't cleanly span the root and skill sub-package. Makefile has tab-sensitive syntax and was designed for build artifacts. `just` is a purpose-built task runner with clean shell-like syntax, a single binary install, and maps 1:1 to CI job names. Alternative: `task` (go-task) is YAML-based and more feature-rich but overkill here.

### Off-the-shelf devcontainer image + Features
`mcr.microsoft.com/devcontainers/typescript-node:22` ships Node 22 and common tools. Devcontainer Features add Go, Python, and `just` without a custom Dockerfile. `postCreateCommand` handles npm installs. Alternative: custom Dockerfile gives more control but adds maintenance burden and build time.

### markdownlint-cli2 at root, Biome inside skill sub-package
markdownlint targets `skill/**/*.md` — a repo-level concern. Biome targets only the TypeScript scripts — a sub-package concern. Keeping each tool co-located with what it governs avoids cross-package config leakage.

### Skill linter selection
Include all 9 confirmed-real skill-specific CLIs. Exclude `majesticlabs-dev/skill-linter` (it's an agent skill, not a CLI — can't run in CI). Each linter gets its own CI job and its own `just` target. Runtimes required beyond Node: Python (for `anthropics/skills quick_validate.py` and `kurtpayne/skillscan-lint`), Go (for `agent-ecosystem/skill-validator` and `dotcommander/cclint`).

## Risks / Trade-offs

- **Experimental linters may be flaky or abandoned** → Non-blocking tier means failures are visible but don't block work. If a tool disappears from npm/GitHub, its job fails silently and can be removed.
- **Go and Python runtime requirements in CI** → GitHub Actions `ubuntu-latest` runners have Python pre-installed; Go needs a `setup-go` step. Adds ~20s to those jobs but is standard practice.
- **`just` requires a separate install** → Not in npm, so contributors need to install it (brew, apt, cargo). CONTRIBUTING.md documents this. Devcontainer handles it automatically via Features.
- **Biome may conflict with existing editor formatting** → `.editorconfig` or VS Code settings could fight Biome's formatter. Mitigated by recommending the Biome VS Code extension in devcontainer customizations.
- **Skill linter ecosystem is immature** → Some tools may have rough edges or produce false positives. The experimental tier and per-job isolation mean one bad tool doesn't contaminate others.
