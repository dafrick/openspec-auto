## ADDED Requirements

### Requirement: Config file is git-ignored and project-local
The `.openspec-loop.json` file SHALL be located at the repository root and SHALL be git-ignored. It SHALL not be committed.

#### Scenario: Config file created by init
- **WHEN** the `init` script runs
- **THEN** it SHALL write `.openspec-loop.json` to the repository root
- **THEN** it SHALL add `.openspec-loop.json` to `.gitignore` if not already present
- **THEN** it SHALL output which lines were added to `.gitignore`

#### Scenario: Config file not committed
- **WHEN** `.openspec-loop.json` exists and `.gitignore` contains it
- **THEN** `git status` SHALL not list `.openspec-loop.json` as a tracked or untracked file

---

### Requirement: Init script infers reviewer from GitHub repository owner
The `init` script SHALL use `gh repo view` to determine the repository owner and present it as the default reviewer.

#### Scenario: GitHub inference on init
- **WHEN** the user runs `init` in a repository with a GitHub remote
- **THEN** the script SHALL call `gh repo view --json owner` to get the repository owner's login
- **THEN** it SHALL present this value as the default reviewer handle

#### Scenario: User accepts inferred reviewer
- **WHEN** the user presses Enter without changing the reviewer field
- **THEN** the script SHALL write the inferred value to `.openspec-loop.json`

#### Scenario: User provides custom reviewer
- **WHEN** the user types a different GitHub handle at the reviewer prompt
- **THEN** the script SHALL write the user-provided value to `.openspec-loop.json`

---

### Requirement: Config file contains required fields
The `.openspec-loop.json` file SHALL be valid JSON containing at minimum the `reviewer` field.

#### Scenario: Valid config structure
- **WHEN** `.openspec-loop.json` is read by the skill or helpers
- **THEN** it SHALL parse as valid JSON
- **THEN** it SHALL contain a non-empty `reviewer` string field

#### Scenario: Additional fields are preserved
- **WHEN** the config file contains fields beyond the minimum set
- **THEN** the init script and skill SHALL not remove or overwrite unknown fields

---

### Requirement: Main loop fails fast if config is missing
The main loop skill SHALL check for `.openspec-loop.json` at the start of Phase 0. If the file is absent or invalid, it SHALL stop with a clear error message.

#### Scenario: Config missing at startup
- **WHEN** `openspec-loop` is invoked and `.openspec-loop.json` does not exist
- **THEN** the skill SHALL output: "Config not found. Run `npx openspec-loop init` to set up."
- **THEN** it SHALL stop without scheduling a wakeup

#### Scenario: Config present and valid at startup
- **WHEN** `.openspec-loop.json` exists and is valid JSON with a non-empty `reviewer` field
- **THEN** Phase 0 SHALL proceed normally

---

### Requirement: Init script validates prerequisites
The `init` script SHALL check that required skills and tools are available and warn if any are missing.

#### Scenario: Missing OpenSpec skills detected
- **WHEN** one or more of `opsx:explore`, `opsx:propose`, `opsx:apply`, `opsx:archive` are not installed in `~/.claude/skills/`
- **THEN** the script SHALL warn which skills are missing and provide install instructions
- **THEN** it SHALL still complete config setup (warning, not blocking)

#### Scenario: Missing `gh` CLI
- **WHEN** `gh` is not found on the PATH
- **THEN** the script SHALL warn that `gh` must be installed and authenticated
- **THEN** it SHALL still complete config setup
