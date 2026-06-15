## 1. Core TypeScript Linting

- [ ] 1.1 Add `@biomejs/biome` as a devDependency in `skill/openspec-auto/package.json`
- [ ] 1.2 Create `skill/openspec-auto/biome.json` with sensible defaults for TypeScript
- [ ] 1.3 Add `lint` script to `skill/openspec-auto/package.json` running `biome check .`
- [ ] 1.4 Verify `biome check` passes on existing scripts (fix any violations)

## 2. TypeScript Type Checking

- [ ] 2.1 Verify `tsc --noEmit` works against `skill/openspec-auto/tsconfig.json`
- [ ] 2.2 Fix any pre-existing type errors surfaced by a clean `tsc --noEmit` run

## 3. Markdown Linting

- [ ] 3.1 Add `markdownlint-cli2` as a devDependency in the root `package.json`
- [ ] 3.2 Create `.markdownlint-cli2.jsonc` at repo root with rule configuration
- [ ] 3.3 Verify `markdownlint-cli2 "skill/**/*.md"` passes (fix any violations)

## 4. Justfile

- [ ] 4.1 Create `Justfile` at repo root with targets: `typecheck`, `lint-scripts`, `lint-md`, and `lint` (aggregate)
- [ ] 4.2 Add one target per experimental skill linter: `lint-quick-validate`, `lint-skill-lint`, `lint-agent-skills-lint`, `lint-skill-check`, `lint-agent-skill-linter`, `lint-pulser`, `lint-cclint`, `lint-agnix`, `lint-skillscan`
- [ ] 4.3 Verify `just lint` runs all three core linters locally

## 5. GitHub Actions Workflow

- [ ] 5.1 Create `.github/workflows/lint.yml` with three required jobs: `typecheck`, `lint-scripts`, `lint-md`
- [ ] 5.2 Add one job per experimental skill linter (9 jobs), each with `continue-on-error: true`
- [ ] 5.3 Add Go setup step (`actions/setup-go`) to `lint-agnix`, `lint-cclint`, and `lint-skill-validator` jobs (Go-based tools)
- [ ] 5.4 Ensure Python is available for `lint-quick-validate` and `lint-skillscan` jobs (pre-installed on `ubuntu-latest`)
- [ ] 5.5 Verify all job names match their corresponding Justfile targets exactly

## 6. Dev Container

- [ ] 6.1 Create `.devcontainer/devcontainer.json` using `mcr.microsoft.com/devcontainers/typescript-node:22` as base
- [ ] 6.2 Add Devcontainer Features for Go, Python, and `just`
- [ ] 6.3 Set `postCreateCommand` to install npm deps at root and in `skill/openspec-auto/`
- [ ] 6.4 Add VS Code extension recommendations for Biome (`biomejs.biome`) and markdownlint (`DavidAnson.vscode-markdownlint`)

## 7. Contributing Docs

- [ ] 7.1 Create `CONTRIBUTING.md` at repo root documenting prerequisites (Node 22+, just)
- [ ] 7.2 Document local setup steps (clone, npm install, install just)
- [ ] 7.3 Document how to run all linters (`just lint`) and individual targets
- [ ] 7.4 Note that the devcontainer handles all prerequisites automatically
