## ADDED Requirements

### Requirement: Justfile at repo root
A `Justfile` SHALL exist at the repository root providing named targets for every linter and an aggregate target.

#### Scenario: Running a single linter locally
- **WHEN** a contributor runs `just typecheck`, `just lint-scripts`, or `just lint-md`
- **THEN** the corresponding linter runs with the same command and arguments used in CI; `typecheck` and `lint-scripts` targets SHALL change directory to `skill/openspec-auto/` before invoking their commands (since `biome.json` and `tsconfig.json` reside there), while `lint-md` runs from the repo root

#### Scenario: Running all core linters
- **WHEN** a contributor runs `just lint`
- **THEN** all core linters (typecheck, lint-scripts, lint-md) run in sequence and the exit code reflects the combined result

#### Scenario: Running an experimental skill linter locally
- **WHEN** a contributor runs a named experimental target (e.g., `just lint-skill-check`, `just lint-agnix`)
- **THEN** the corresponding skill linter runs against the skill files

#### Scenario: Running all experimental linters locally
- **WHEN** a contributor runs `just lint-experimental`
- **THEN** all 10 experimental skill linter targets run in sequence

### Requirement: Target names match CI job names
Each Justfile target name SHALL match the corresponding GitHub Actions job name exactly so contributors can reproduce a failing CI job locally by running `just <job-name>`.

#### Scenario: CI job name lookup
- **WHEN** a CI job named `lint-scripts` fails
- **THEN** a contributor can run `just lint-scripts` locally to reproduce the failure
