## ADDED Requirements

### Requirement: TypeScript type checking
The CI pipeline SHALL run `tsc --noEmit` against `skill/openspec-auto/` and fail the build on any type error.

#### Scenario: Type error in a script
- **WHEN** a TypeScript script in `skill/openspec-auto/scripts/` contains a type error
- **THEN** the `typecheck` CI job exits non-zero and blocks the PR

#### Scenario: Clean type check
- **WHEN** all TypeScript scripts are type-correct
- **THEN** the `typecheck` CI job exits 0

### Requirement: TypeScript and JavaScript formatting and linting via Biome
The CI pipeline SHALL run `biome check` against `skill/openspec-auto/` and fail the build on any lint or formatting violation.

#### Scenario: Formatting violation in a script
- **WHEN** a TypeScript file in `skill/openspec-auto/scripts/` has a formatting violation
- **THEN** the `lint-scripts` CI job exits non-zero and blocks the PR

#### Scenario: Lint rule violation in a script
- **WHEN** a TypeScript file contains a Biome lint rule violation
- **THEN** the `lint-scripts` CI job exits non-zero and blocks the PR

#### Scenario: Clean Biome check
- **WHEN** all scripts pass Biome's format and lint checks
- **THEN** the `lint-scripts` CI job exits 0

### Requirement: Markdown structural linting
The CI pipeline SHALL run `markdownlint-cli2` against all Markdown files in `skill/` and fail the build on any structural violation.

#### Scenario: Structural violation in a prompt file
- **WHEN** a `.md` file in `skill/openspec-auto/prompts/` or `SKILL.md` contains a markdownlint rule violation
- **THEN** the `lint-md` CI job exits non-zero and blocks the PR

#### Scenario: Clean Markdown
- **WHEN** all Markdown files pass markdownlint rules
- **THEN** the `lint-md` CI job exits 0
