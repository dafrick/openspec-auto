## 1. Core TypeScript Linting

- [x] 1.1 Add `@biomejs/biome` as a devDependency in `skill/openspec-auto/package.json`
- [x] 1.2 Create `skill/openspec-auto/biome.json` with sensible defaults for TypeScript
- [x] 1.3 Add `lint` script to `skill/openspec-auto/package.json` running `biome check .`
- [x] 1.4 Verify `biome check` passes on existing scripts (fix any violations)

## 2. TypeScript Type Checking

- [x] 2.1 Verify `tsc --noEmit` works against `skill/openspec-auto/tsconfig.json`
- [x] 2.2 Fix any pre-existing type errors surfaced by a clean `tsc --noEmit` run

## 3. Markdown Linting

- [x] 3.1 Add `markdownlint-cli2` as a devDependency in the root `package.json`
- [x] 3.2 Create `.markdownlint-cli2.jsonc` at repo root with rule configuration
- [x] 3.3 Verify `markdownlint-cli2 "skill/**/*.md"` passes (fix any violations)

## 4. Justfile

- [x] 4.1 Create `Justfile` at repo root with targets: `typecheck` (cd to skill/openspec-auto, run tsc --noEmit), `lint-scripts` (cd to skill/openspec-auto, run biome check), `lint-md` (run from root), and `lint` (aggregate of all three core targets)
- [x] 4.2 Add one target per experimental skill linter: `lint-quick-validate`, `lint-skill-lint`, `lint-agent-skills-lint`, `lint-skill-check`, `lint-agent-skill-linter`, `lint-pulser`, `lint-cclint`, `lint-agnix`, `lint-skillscan`, `lint-skill-validator`
- [x] 4.3 Add `lint-experimental` aggregate target that runs all 10 experimental skill linter targets in sequence
- [x] 4.4 Verify `just lint` runs all three core linters locally

## 5. GitHub Actions Workflow

- [x] 5.1 Add a `setup-just` step (using `extractions/setup-just` community action) at the workflow level or in each job that needs `just`
- [x] 5.2 Create `.github/workflows/lint.yml` with three required jobs: `typecheck`, `lint-scripts`, `lint-md`
- [x] 5.3 Add one job per experimental skill linter (10 jobs), each with `continue-on-error: true`
- [x] 5.4 Add Go setup step (`actions/setup-go`) to `lint-cclint` and `lint-skill-validator` jobs only (the two Go-based tools; `lint-agnix` is npm, not Go)
- [x] 5.5 Ensure Python is available for `lint-quick-validate` and `lint-skillscan` jobs (pre-installed on `ubuntu-latest`)
- [x] 5.6 Verify all job names match their corresponding Justfile targets exactly

## 6. Dev Container

- [x] 6.1 Create `.devcontainer/devcontainer.json` using `mcr.microsoft.com/devcontainers/typescript-node:24` as base (matches `engines.node: >=24` in root package.json)
- [x] 6.2 Add Devcontainer Features for Go, Python, and `just`
- [x] 6.3 Set `postCreateCommand` to install npm deps at root and in `skill/openspec-auto/`
- [x] 6.4 Add VS Code extension recommendations for Biome (`biomejs.biome`) and markdownlint (`DavidAnson.vscode-markdownlint`)

## 7. Contributing Docs

- [x] 7.1 Create `CONTRIBUTING.md` at repo root documenting prerequisites: Node 24+, `just`; and for experimental linters: Go and Python (note that the devcontainer installs all of these automatically)
- [x] 7.2 Document local setup steps (clone, npm install at root and in skill/openspec-auto, install just)
- [x] 7.3 Document how to run all core linters (`just lint`), all experimental linters (`just lint-experimental`), and individual targets
- [x] 7.4 Note that the devcontainer handles all prerequisites automatically
