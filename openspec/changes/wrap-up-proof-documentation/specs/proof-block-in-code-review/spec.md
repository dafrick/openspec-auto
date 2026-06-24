## ADDED Requirements

### Requirement: Code-review output includes a Proof block
The code-review sub-agent's output SHALL include a `**Proof:**` block in addition to its `**Status:**` line. The block MUST appear regardless of whether the verdict is `APPROVED` or `CHANGES_REQUESTED`. It SHALL contain the following labeled fields as bullet items:
- `Tests run:` — the exact test commands executed locally
- `CI state:` — one of: green, failing, pending, or not configured
- `Verification:` — what was manually checked, if anything (may be "none")
- `Caveats:` — anything that could not be verified (may be "none")

#### Scenario: APPROVED verdict includes Proof block
- **WHEN** the code-review sub-agent returns `**Status:** APPROVED`
- **THEN** the output also contains a `**Proof:**` block with all four labeled fields populated

#### Scenario: CHANGES_REQUESTED verdict includes Proof block
- **WHEN** the code-review sub-agent returns `**Status:** CHANGES_REQUESTED`
- **THEN** the output also contains a `**Proof:**` block with all four labeled fields populated

#### Scenario: Proof block appears after Status line
- **WHEN** the code-review sub-agent produces its output
- **THEN** the `**Proof:**` block appears after the `**Status:**` line in the output

#### Scenario: All four fields are present
- **WHEN** the code-review sub-agent produces its Proof block
- **THEN** the block contains exactly the fields: Tests run, CI state, Verification, and Caveats
