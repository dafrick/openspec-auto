## ADDED Requirements

### Requirement: Triage reads VISION.md when present
When a `VISION.md` or `docs/VISION.md` file exists in the repository, the triage sub-agent SHALL read it before evaluating any issue. If neither file exists, this requirement is vacuously satisfied and the check is skipped.

#### Scenario: VISION.md present at repo root
- **WHEN** a `VISION.md` file exists at the repository root
- **THEN** the triage sub-agent SHALL read it before evaluating any issue in that run

#### Scenario: VISION.md present under docs/
- **WHEN** no `VISION.md` exists at the root but `docs/VISION.md` does
- **THEN** the triage sub-agent SHALL read `docs/VISION.md` before evaluating any issue

#### Scenario: No VISION.md present
- **WHEN** neither `VISION.md` nor `docs/VISION.md` exists
- **THEN** the triage sub-agent SHALL skip the vision-fit check entirely and proceed with the standard three-flag evaluation

### Requirement: Triage rejects issues clearly outside the product vision
When a VISION.md has been read, the triage sub-agent SHALL apply an additional red flag — `Out of scope (vision)` — to any issue that is clearly outside the product's stated purpose as described in that document. Ambiguous or tangentially related issues SHALL NOT be rejected on this basis.

#### Scenario: Issue clearly contradicts the stated vision
- **WHEN** the VISION.md states the product is a CLI tool for X, and the issue requests a GUI unrelated to X
- **THEN** triage SHALL reject the issue and name the red flag `Out of scope (vision)`

#### Scenario: Issue is tangentially related to the vision
- **WHEN** the issue requests a feature not explicitly mentioned in the VISION.md but not excluded by it
- **THEN** triage SHALL NOT reject the issue on vision-fit grounds; it SHALL apply the default-eligible model

#### Scenario: Vision fit rejection names the specific mismatch
- **WHEN** triage rejects an issue as `Out of scope (vision)`
- **THEN** the output SHALL name the specific mismatch observed (e.g., "VISION.md states X; this issue requests Y which is a different product category")
