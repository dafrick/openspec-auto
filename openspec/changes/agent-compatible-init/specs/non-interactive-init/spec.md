## ADDED Requirements

### Requirement: Init accepts a --yes flag for non-interactive execution
The `init` script SHALL accept a `--yes` (short: `-y`) flag. When this flag is present, the script SHALL skip all interactive prompts and write `.openspec-auto.json` directly from the inferred values without user confirmation.

#### Scenario: Agent runs init with --yes
- **WHEN** `init` is invoked with `--yes` and `gh` is available and authenticated
- **THEN** the script SHALL call `inferReviewer()` and `inferDefaultBranch()` as normal
- **THEN** it SHALL write the inferred values directly to `.openspec-auto.json` without showing any prompt
- **THEN** it SHALL update `.gitignore` as normal
- **THEN** it SHALL exit zero

#### Scenario: Agent runs init with -y (short flag)
- **WHEN** `init` is invoked with `-y`
- **THEN** it SHALL behave identically to `--yes`

#### Scenario: Non-interactive init produces the same config structure as interactive init
- **WHEN** `init` is run with `--yes` and the inferred values match what a user would accept interactively
- **THEN** the resulting `.openspec-auto.json` SHALL be structurally identical to a config produced by the interactive path with the same values

---

### Requirement: Init accepts --reviewer and --branch override flags
The `init` script SHALL accept `--reviewer <handle>` and `--branch <name>` flags. When supplied, these values SHALL override inference for their respective fields without prompting.

#### Scenario: Agent supplies explicit reviewer
- **WHEN** `init` is invoked with `--reviewer some-org`
- **THEN** the script SHALL use `some-org` as the reviewer value without calling `inferReviewer()`
- **THEN** it SHALL not prompt for reviewer

#### Scenario: Agent supplies explicit branch
- **WHEN** `init` is invoked with `--branch develop`
- **THEN** the script SHALL use `develop` as the `defaultBranch` value without calling `inferDefaultBranch()`
- **THEN** it SHALL not prompt for default branch

#### Scenario: Agent supplies both explicit flags (no --yes needed)
- **WHEN** `init` is invoked with `--reviewer some-org --branch develop`
- **THEN** the script SHALL write config from those values directly without any prompts
- **THEN** it SHALL exit zero

---

### Requirement: Init exits non-zero when --yes is set and reviewer inference fails
When running in non-interactive mode via `--yes` and reviewer inference returns an empty string, the script SHALL exit non-zero with a diagnostic message rather than writing a config with an empty reviewer field.

#### Scenario: --yes with no gh CLI
- **WHEN** `init` is invoked with `--yes` and `gh` is not on PATH
- **THEN** the script SHALL print an error: "Cannot infer reviewer: `gh` CLI is not available. Install and authenticate `gh`, or supply `--reviewer <handle>` explicitly."
- **THEN** it SHALL exit with a non-zero exit code
- **THEN** it SHALL NOT write `.openspec-auto.json`

#### Scenario: --yes with gh available but empty owner
- **WHEN** `init` is invoked with `--yes` and `gh repo view` returns an empty owner login
- **THEN** the script SHALL print an error indicating inference failed and suggest using `--reviewer <handle>`
- **THEN** it SHALL exit with a non-zero exit code
- **THEN** it SHALL NOT write `.openspec-auto.json`

#### Scenario: --yes with defaultBranch inference failing falls back to main
- **WHEN** `init` is invoked with `--yes` and `gh repo view` cannot determine the default branch
- **THEN** the script SHALL fall back to `"main"` for `defaultBranch` (consistent with current behavior)
- **THEN** it SHALL continue and write the config successfully (reviewer must be non-empty)

---

### Requirement: Flag parsing uses Node.js built-in util.parseArgs
The `init` script SHALL use `util.parseArgs` from the Node.js `node:util` built-in module for CLI flag parsing. No third-party argument-parsing library SHALL be added. `parseArgs` SHALL be called with `{ strict: false }` so that unrecognized flags do not throw.

#### Scenario: Unknown flags are ignored gracefully
- **WHEN** `init` is invoked with an unrecognized flag
- **THEN** the script SHALL NOT crash with an unhandled error
- **THEN** the script SHALL silently ignore the unknown flag and proceed normally (achieved via `strict: false` passed to `parseArgs`)
