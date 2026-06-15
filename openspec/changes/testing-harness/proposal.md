## Why

The repository has no automated quality gates — TypeScript scripts go unlinted and untype-checked, Markdown skill files have no structural validation, and there is no standard way for contributors to run checks locally. Adding a testing harness establishes a baseline of confidence and makes contribution expectations explicit.

## What Changes

- Add Biome for TypeScript/JavaScript formatting and linting (`skill/openspec-auto/`)
- Add TypeScript type checking via `tsc --noEmit` (`skill/openspec-auto/`)
- Add markdownlint-cli2 for Markdown structural validation (`skill/**/*.md`, `SKILL.md`)
- Add 9 skill-specific linters as experimental (non-blocking) CI jobs
- Add a Justfile at the repo root abstracting all linter commands locally
- Add a devcontainer configuration for a reproducible development environment
- Add `CONTRIBUTING.md` documenting prerequisites and how to run checks

## Capabilities

### New Capabilities

- `core-linting`: TypeScript type checking (tsc) and formatting/lint (Biome) for scripts, plus Markdown structural linting (markdownlint-cli2) — these are required/blocking CI jobs
- `skill-linting`: Suite of 9 experimental skill-specific linters run as individual non-blocking CI jobs to evaluate quality and spec compliance of skill files
- `task-runner`: Justfile at repo root with one target per linter plus a `lint` aggregate target
- `devcontainer`: Dev container configuration using an off-the-shelf Node image with features for Go, Python, just, and VS Code extension recommendations
- `contributing-docs`: `CONTRIBUTING.md` covering prerequisites, local setup, and how to run all checks

### Modified Capabilities

## Impact

- New devDependencies in `skill/openspec-auto/package.json`: `@biomejs/biome`
- New devDependencies in root `package.json`: `markdownlint-cli2`
- New files: `Justfile`, `.devcontainer/devcontainer.json`, `CONTRIBUTING.md`, `skill/openspec-auto/biome.json`, `.markdownlint-cli2.jsonc`
- New GitHub Actions workflow: `.github/workflows/lint.yml`
- No changes to runtime behaviour or the published skill
