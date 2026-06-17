## Context

The repo contains two distinct code surfaces: TypeScript scripts in `skill/openspec-auto/scripts/` and Markdown skill files in `skill/openspec-auto/prompts/` and `SKILL.md`. These require different tooling. There are currently no linters, no CI workflow, and no documented contributor setup. The skill-specific linter ecosystem is brand new (all tools released June 2026), so the goal is to sample a broad set cheaply rather than commit to any one.

## Goals / Non-Goals

**Goals:**
- Fast, reliable blocking CI jobs for the two core surfaces (TypeScript, Markdown)
- Non-blocking experimental jobs for 6 skill-specific linters so they can be evaluated without gating PRs
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
The 10 skill linters are all under a week old. Blocking PRs on immature tooling would create noise and friction. The experimental tier runs all jobs in parallel, collects results, and always exits 0 — giving visibility without risk. Once a linter proves its value (or doesn't), it can be promoted or dropped. Alternative: only run proven tools — loses the exploration benefit.

### Justfile over npm scripts / Makefile
npm scripts can't cleanly span the root and skill sub-package. Makefile has tab-sensitive syntax and was designed for build artifacts. `just` is a purpose-built task runner with clean shell-like syntax, a single binary install, and maps 1:1 to CI job names. Alternative: `task` (go-task) is YAML-based and more feature-rich but overkill here.

### Off-the-shelf devcontainer image + Features
`mcr.microsoft.com/devcontainers/typescript-node:24` ships Node 24 and common tools, matching the `engines.node: >=24` declared in root `package.json`. Devcontainer Features add Go, Python, and `just` without a custom Dockerfile. `postCreateCommand` handles npm installs. Alternative: custom Dockerfile gives more control but adds maintenance burden and build time.

### markdownlint-cli2 at root, Biome inside skill sub-package
markdownlint targets `skill/**/*.md` — a repo-level concern. Biome targets only the TypeScript scripts — a sub-package concern. Keeping each tool co-located with what it governs avoids cross-package config leakage.

### Skill linter selection
6 skill-specific linters run in CI experimental jobs. Excluded from CI: `majesticlabs-dev/skill-linter` and `agent-ecosystem/skill-validator` (agent skills, not CLIs); `William-Yeh/agent-skill-linter` (returns HTTP 404 from npm — package does not exist); `thedavidas/skill-check` (security scan delegates to `mcp-scan`/`snyk-agent-scan`, which is designed for MCP server configurations — returns `unknown target` against skill directories regardless of whether a local path or GitHub URL is supplied, a category mismatch not a tool failure); `himself65/skill-lint` (flags every `.ts` file as TOXIC due to a blanket "bundled script" rule with no allowlist, producing spurious TOXIC verdicts for any skill that ships TypeScript tooling — kept as a local-only Justfile target for reference). Runtimes required beyond Node: Python (for `anthropics/skills quick_validate.py` and `kurtpayne/skillscan-lint`), Go (for `dotcommander/cclint`). Note: `agent-sh/agnix` is npm-based despite its Rust implementation — no Go setup needed for it.

### gitleaks over skill-check for security scanning
`skill-check` uses `mcp-scan` (now `snyk-agent-scan`) for security scanning. That tool is designed for MCP server configurations and cannot scan skill directories — it always returns `unknown target` with 0 findings and exits 1. `gitleaks` covers the relevant security concern (accidentally committed secrets and API keys) and is added as a blocking core job. Alternative: `trufflehog` is more thorough but heavier; `gitleaks` is fast and has a pre-built GitHub Action.

## Risks / Trade-offs

- **Experimental linters may be flaky or abandoned** → Non-blocking tier means failures are visible but don't block work. If a tool disappears from npm/GitHub, its job fails silently and can be removed.
- **Go and Python runtime requirements in CI** → GitHub Actions `ubuntu-latest` runners have Python pre-installed; Go needs a `setup-go` step. Adds ~20s to those jobs but is standard practice.
- **`just` requires a separate install everywhere** → Not in npm, not pre-installed on GitHub Actions runners. Contributors install via brew/apt/cargo; CONTRIBUTING.md documents this; devcontainer installs via Features; CI uses the `extractions/setup-just` community action.
- **Biome may conflict with existing editor formatting** → `.editorconfig` or VS Code settings could fight Biome's formatter. Mitigated by recommending the Biome VS Code extension in devcontainer customizations.
- **Skill linter ecosystem is immature** → Some tools may have rough edges or produce false positives. The experimental tier and per-job isolation mean one bad tool doesn't contaminate others.
