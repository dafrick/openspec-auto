## ADDED Requirements

### Requirement: Init supports a non-interactive mode for agent and CI use
The `init` script SHALL support a non-interactive execution path that writes `.openspec-auto.json` without requiring a TTY or user input. This path is activated by the `--yes` / `-y` flag or by supplying both `--reviewer` and `--branch` override flags.

#### Scenario: Non-interactive init writes valid config
- **WHEN** `init` is run with `--yes` in a repository where `gh` is available and authenticated
- **THEN** it SHALL write a valid `.openspec-auto.json` with non-empty `reviewer` and `defaultBranch` fields
- **THEN** it SHALL update `.gitignore` exactly as the interactive path does
- **THEN** it SHALL exit zero

#### Scenario: Non-interactive init and interactive init produce identical config structure
- **WHEN** both paths are run with the same effective `reviewer` and `defaultBranch` values
- **THEN** the resulting `.openspec-auto.json` files SHALL be structurally identical (same fields, same JSON shape)

#### Scenario: Config missing and init cannot run non-interactively
- **WHEN** `openspec-auto` is invoked with no `.openspec-auto.json` in a context where `init` could not complete (e.g., inference failed)
- **THEN** the skill SHALL output: "Config not found. Run `npx openspec-auto init` to set up."
- **THEN** it SHALL stop without scheduling a wakeup (existing behavior, unchanged)
