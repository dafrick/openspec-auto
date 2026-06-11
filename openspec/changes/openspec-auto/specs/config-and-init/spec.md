## ADDED Requirements

### Requirement: Config file is git-ignored and project-local
The `.openspec-auto.json` file SHALL be located at the repository root and SHALL be git-ignored. It SHALL not be committed.

#### Scenario: Config file created by init
- **WHEN** the `init` script runs
- **THEN** it SHALL write `.openspec-auto.json` to the repository root
- **THEN** it SHALL add `.openspec-auto.json` to `.gitignore` if not already present
- **THEN** it SHALL output which lines were added to `.gitignore`

#### Scenario: Config file not committed
- **WHEN** `.openspec-auto.json` exists and `.gitignore` contains it
- **THEN** `git status` SHALL not list `.openspec-auto.json` as a tracked or untracked file

---

### Requirement: Init script infers reviewer from GitHub repository owner
The `init` script SHALL use `gh repo view` to determine the repository owner and present it as the default reviewer.

#### Scenario: GitHub inference on init
- **WHEN** the user runs `init` in a repository with a GitHub remote
- **THEN** the script SHALL call `gh repo view --json owner` to get the repository owner's login
- **THEN** it SHALL present this value as the default reviewer handle

#### Scenario: User accepts inferred reviewer
- **WHEN** the user presses Enter without changing the reviewer field
- **THEN** the script SHALL write the inferred value to `.openspec-auto.json`

#### Scenario: User provides custom reviewer
- **WHEN** the user types a different GitHub handle at the reviewer prompt
- **THEN** the script SHALL write the user-provided value to `.openspec-auto.json`

---

### Requirement: Init detects and stores the default branch
The `init` script SHALL detect the repository's default branch and store it in `.openspec-auto.json` so the loop reads it from config rather than detecting or hardcoding it per run.

#### Scenario: Default branch detected on init
- **WHEN** the user runs `init`
- **THEN** the script SHALL call `gh repo view --json defaultBranchRef` to read the default branch
- **THEN** it SHALL present it (falling back to `main`) and write the accepted value to `defaultBranch` in `.openspec-auto.json`

#### Scenario: Workspace setup uses the configured default branch
- **WHEN** `setup-workspace.ts` runs
- **THEN** it SHALL check out and base the PR on `defaultBranch` from config, not a hardcoded `main`

---

### Requirement: Config file contains required fields
The `.openspec-auto.json` file SHALL be valid JSON containing at minimum the `reviewer` and `defaultBranch` fields.

#### Scenario: Valid config structure
- **WHEN** `.openspec-auto.json` is read by the skill or helpers
- **THEN** it SHALL parse as valid JSON
- **THEN** it SHALL contain a non-empty `reviewer` string field and a `defaultBranch` string field

#### Scenario: Additional fields are preserved
- **WHEN** the config file contains fields beyond the minimum set
- **THEN** the init script and skill SHALL not remove or overwrite unknown fields

---

### Requirement: Orchestrator fails fast if config is missing
The orchestrator skill SHALL check for `.openspec-auto.json` at Bring-up. If the file is absent or invalid, it SHALL stop with a clear error message.

#### Scenario: Config missing at startup
- **WHEN** `openspec-auto` is invoked and `.openspec-auto.json` does not exist
- **THEN** the skill SHALL output: "Config not found. Run `npx openspec-auto init` to set up."
- **THEN** it SHALL stop without scheduling a wakeup

#### Scenario: Config present and valid at startup
- **WHEN** `.openspec-auto.json` exists and is valid JSON with a non-empty `reviewer` field
- **THEN** Bring-up SHALL proceed to Triage normally

---

### Requirement: Init script warns about a missing `gh` CLI
The `init` script SHALL warn if the `gh` CLI is unavailable, but SHALL NOT probe for installed skills: a reliable cross-harness check of skill availability is not available, and a false "missing" warning is worse than none. The required OpenSpec and superpowers skills are documented as prerequisites in the README, and a genuinely missing skill surfaces as a clear failure at the stage that needs it.

#### Scenario: Missing `gh` CLI
- **WHEN** `gh` is not found on the PATH
- **THEN** the script SHALL warn that `gh` must be installed and authenticated
- **THEN** it SHALL still complete config setup (warning, not blocking)

#### Scenario: Init does not probe for skills
- **WHEN** the `init` script runs
- **THEN** it SHALL NOT check the filesystem for installed skills, and SHALL NOT emit a "missing skills" warning
