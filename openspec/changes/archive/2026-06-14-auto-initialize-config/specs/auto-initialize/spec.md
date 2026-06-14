## ADDED Requirements

### Requirement: Bring-up auto-initializes missing config
When Bring-up cannot load `.openspec-auto.json` (file absent or unreadable/invalid), the skill SHALL attempt to create it automatically by running `init --yes` before stopping or continuing. It SHALL NOT require the user to run init manually as a prerequisite.

#### Scenario: Config absent, init succeeds
- **WHEN** Bring-up runs and `.openspec-auto.json` does not exist
- **THEN** the skill runs `$OSL/node_modules/.bin/tsx $OSL/scripts/init.ts --yes`
- **THEN** after init exits 0, the skill reads the newly created `.openspec-auto.json`
- **THEN** Bring-up completes normally and the loop proceeds to Triage

#### Scenario: Config invalid, init succeeds
- **WHEN** Bring-up runs and `.openspec-auto.json` exists but is malformed or missing required fields
- **THEN** the skill runs `$OSL/node_modules/.bin/tsx $OSL/scripts/init.ts --yes`
- **THEN** after init exits 0, the skill reads the repaired `.openspec-auto.json`
- **THEN** Bring-up completes normally and the loop proceeds to Triage

#### Scenario: Config absent, init fails
- **WHEN** Bring-up runs and `.openspec-auto.json` does not exist
- **AND** `init --yes` exits non-zero (e.g., `gh` not authenticated, not a GitHub repo)
- **THEN** the skill surfaces the init error output to the user
- **THEN** Bring-up stops — it does NOT proceed to Triage

#### Scenario: Config present and valid
- **WHEN** Bring-up runs and `.openspec-auto.json` is present and valid
- **THEN** the skill reads config directly and proceeds to Triage without running init
