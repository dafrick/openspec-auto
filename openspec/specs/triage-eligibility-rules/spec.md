# triage-eligibility-rules Specification

## Purpose
Defines how the triage sub-agent decides which issues to select, skip, or reject — including the default-eligible model, the observable red flags that justify rejection, the Deferred output format for actively closing rejected issues, and the VISION.md product-fit filter.
## Requirements
### Requirement: Triage uses a default-eligible model
The triage sub-agent SHALL assume every new issue is eligible for selection unless a concrete red flag is observable from the issue's title, body, labels, and comments alone. Issues that are ambiguous or whose feasibility is unclear SHALL be selected; refinement of unclear requirements is Explore's responsibility.

#### Scenario: Ambiguous but non-empty issue is selected
- **WHEN** an issue has a title and body that describe some problem or desired behavior, even if vaguely
- **THEN** triage SHALL select it rather than reject it

#### Scenario: Investigation not required to reach verdict
- **WHEN** triage cannot determine eligibility by reading title, body, labels, and comments
- **THEN** triage SHALL default to selecting the issue rather than investigating further

### Requirement: Triage rejects only on observable red flags
The triage sub-agent SHALL reject a new issue (return `NO_ELIGIBLE` or add it to the `Deferred` list) only when at least one of the following red flags is directly observable from the issue surface or from a VISION.md file read at the start of the run:

1. **No observable ask** — the title and body together contain no discernible problem or desired behavior.
2. **Confirmed duplicate** — the issue body or a maintainer comment explicitly names a canonical duplicate issue.
3. **Out of scope** — the issue or a maintainer comment explicitly states it belongs to a different repository or product.
4. **Out of scope (vision)** — a `VISION.md` (or `docs/VISION.md`) is present and the issue is clearly outside the product's stated purpose as described in that document.

#### Scenario: Empty or contentless issue rejected
- **WHEN** an issue has a blank or near-blank body and a title that conveys no actionable ask
- **THEN** triage SHALL add the issue to the `Deferred` list and name the "No observable ask" red flag

#### Scenario: Maintainer-confirmed duplicate rejected
- **WHEN** a maintainer comment says "duplicate of #N" or equivalent
- **THEN** triage SHALL add the issue to the `Deferred` list and name the "Confirmed duplicate" red flag

#### Scenario: Wrong-repo issue rejected
- **WHEN** a maintainer comment confirms the issue belongs to a different repository
- **THEN** triage SHALL add the issue to the `Deferred` list and name the "Out of scope" red flag

#### Scenario: Issue clearly outside product vision rejected
- **WHEN** a VISION.md is present and the issue requests something clearly outside the product's stated purpose
- **THEN** triage SHALL add the issue to the `Deferred` list and name the "Out of scope (vision)" red flag

#### Scenario: Unclear feasibility does not trigger rejection
- **WHEN** it is unclear from the issue whether the requested feature is technically feasible
- **THEN** triage SHALL NOT reject on that basis; it SHALL select the issue

### Requirement: Triage does not investigate
The triage sub-agent SHALL NOT perform investigation when evaluating eligibility. Specifically, it SHALL NOT:
- Check external services, registries, or URLs referenced in the issue.
- Read linked code, PRs, or documentation beyond what is quoted in the issue body or comments.
- Evaluate technical feasibility, design complexity, or implementation approach.
- Reach a verdict that requires reasoning beyond a literal read of the issue surface.

#### Scenario: External registry check not performed
- **WHEN** an issue references an npm package or external service
- **THEN** triage SHALL NOT verify whether that package or service exists before making a selection decision

#### Scenario: Feasibility not evaluated
- **WHEN** an issue requests a feature whose feasibility is uncertain
- **THEN** triage SHALL select the issue without assessing whether the feature is achievable

### Requirement: NO_ELIGIBLE output names the red flag
When triage returns `NO_ELIGIBLE`, the output body SHALL name the specific red flag that was observed (by name, e.g., "No observable ask", "Confirmed duplicate", "Out of scope", "Out of scope (vision)"). A generic explanation without naming a red flag is not acceptable.

#### Scenario: Red flag named in rejection
- **WHEN** triage rejects an issue and returns `NO_ELIGIBLE`
- **THEN** the output SHALL include the red flag name (e.g., "Rejected: Confirmed duplicate — maintainer comment in #12 names #8 as the canonical issue")

#### Scenario: No red flag means no rejection
- **WHEN** triage cannot name a specific red flag from the list
- **THEN** triage SHALL NOT return `NO_ELIGIBLE`; it SHALL select the issue instead

