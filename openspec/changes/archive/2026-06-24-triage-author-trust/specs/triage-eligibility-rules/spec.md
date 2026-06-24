## MODIFIED Requirements

### Requirement: Triage uses a default-eligible model
The triage sub-agent SHALL assume every new issue is eligible for selection unless a concrete red flag is observable from the issue's title, body, labels, and comments alone. Issues that are ambiguous or whose feasibility is unclear SHALL be selected; refinement of unclear requirements is Explore's responsibility. Among eligible candidates, triage SHALL apply author trust signals as a tiebreaker when two issues are otherwise equal in priority — this tiebreaker does not affect eligibility, only selection order.

#### Scenario: Ambiguous but non-empty issue is selected
- **WHEN** an issue has a title and body that describe some problem or desired behavior, even if vaguely
- **THEN** triage SHALL select it rather than reject it

#### Scenario: Investigation not required to reach verdict
- **WHEN** triage cannot determine eligibility by reading title, body, labels, and comments
- **THEN** triage SHALL default to selecting the issue rather than investigating further

#### Scenario: Low-trust reporter does not make issue ineligible
- **WHEN** an eligible issue is filed by a reporter with a new account or no prior repo activity
- **THEN** triage SHALL NOT reject the issue on that basis; it SHALL remain eligible for selection
