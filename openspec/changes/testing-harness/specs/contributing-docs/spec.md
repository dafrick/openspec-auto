## ADDED Requirements

### Requirement: CONTRIBUTING.md with setup and lint instructions
A `CONTRIBUTING.md` SHALL exist at the repo root documenting prerequisites, local setup, and how to run all linters.

#### Scenario: New contributor setting up locally
- **WHEN** a contributor follows the steps in CONTRIBUTING.md
- **THEN** they can run `just lint` successfully with no additional research required; prerequisites listed SHALL include Node 24+, `just`, and (for experimental targets) Go and Python

#### Scenario: Reproducing a failing CI job
- **WHEN** a CI job fails and a contributor reads CONTRIBUTING.md
- **THEN** they can find the corresponding `just <target>` command to reproduce it locally

### Requirement: CONTRIBUTING.md scope is limited to setup and checks
`CONTRIBUTING.md` SHALL NOT include contribution process, PR guidelines, code style opinions, or any content beyond prerequisites, environment setup, and running linters.

#### Scenario: Contributor looking for PR process
- **WHEN** a contributor looks for branching strategy or PR review process in CONTRIBUTING.md
- **THEN** they do not find it there (it is out of scope for this document)
