## ADDED Requirements

### Requirement: Explore follows the Double Diamond structure
The explore sub-agent SHALL organize its work around two explicit diamonds: the Problem Space diamond (Discover → Define) and the Solution Space diamond (Ideate → Evaluate → Recommend). These diamonds are sequential and must not be collapsed — the agent SHALL complete the full Problem Space diamond before entering the Solution Space diamond.

#### Scenario: Feature issue processed through both diamonds
- **WHEN** the explore sub-agent receives a feature issue
- **THEN** it SHALL complete Discover and Define before generating any solution candidates
- **THEN** it SHALL generate candidates from the Point of View and How Might We, not from the issue's text
- **THEN** it SHALL evaluate candidates before recommending one

#### Scenario: Bug issue processed through both diamonds
- **WHEN** the explore sub-agent receives a bug issue
- **THEN** it SHALL complete Discover (reproduction path, affected code, expected vs actual behavior) and Define (what the correct behavior is, per existing specs) before proposing a fix approach
- **THEN** it SHALL treat the fix approach as a Recommendation, not as an assumed derivation from the issue

---

### Requirement: Explore extracts a Job-to-be-Done for every feature issue
For feature issues, the explore sub-agent SHALL extract a Job-to-be-Done statement during the Discover step. The JTBD format is: "When [situation], I want [motivation], so I can [outcome]." This is required, not conditional on whether the job appears obvious.

#### Scenario: JTBD extracted unconditionally
- **WHEN** the explore sub-agent classifies an issue as a feature
- **THEN** it SHALL write a JTBD statement during Discover regardless of whether the job appears obvious from the issue text
- **THEN** the JTBD SHALL describe what the user is actually trying to accomplish, in solution-neutral terms

#### Scenario: JTBD reveals a gap between issue framing and real need
- **WHEN** writing the JTBD reveals that the user's actual job differs from the issue's stated request
- **THEN** the Point of View SHALL reflect the real job, not the issue's framing
- **THEN** the How Might We SHALL be derived from the real job

---

### Requirement: Explore produces a solution-neutral Point of View
The explore sub-agent's discovery output SHALL include a Point of View section that synthesizes the real user need in solution-neutral terms. The Point of View SHALL be derived from the Discover step (including the JTBD for features) and SHALL explicitly classify constraints from the issue as real or assumed.

#### Scenario: Issue constraint has no stated reason
- **WHEN** an issue states a constraint without explanation (e.g., "no new command")
- **THEN** the Point of View SHALL classify it as an assumed constraint (feasibility guess)
- **THEN** it SHALL NOT encode the constraint as a hard limit in the Point of View

#### Scenario: Issue constraint has an explicit reason
- **WHEN** an issue states a constraint with a specific reason (e.g., "no new command — this is a 2-week project")
- **THEN** the Point of View SHALL classify it as a potentially real constraint and note the stated reason
- **THEN** the Ideate step SHALL still generate candidates that may include the ruled-out option

#### Scenario: Issue framing accurately describes the real need
- **WHEN** the Discover step confirms the issue described the real problem accurately
- **THEN** the Point of View SHALL state this confirmation explicitly — confirming the issue's framing is itself a valid diagnostic finding

---

### Requirement: Explore produces a How Might We question
The explore sub-agent's discovery output SHALL include a How Might We (HMW) question that bridges the Problem Space diamond and the Solution Space diamond. The HMW SHALL be derived from the Point of View and SHALL NOT embed a solution or a specific technology.

#### Scenario: HMW is solution-neutral
- **WHEN** the explore sub-agent writes the How Might We
- **THEN** the HMW SHALL NOT reference any specific implementation approach (no "add a command," no "document the workflow")
- **THEN** the HMW SHALL be specific enough to generate relevant candidates and open enough to allow multiple valid solutions

#### Scenario: HMW is too narrow
- **WHEN** the explore sub-agent cannot write a HMW without embedding a solution
- **THEN** it SHALL broaden the Point of View to find the underlying need and derive the HMW from there

---

### Requirement: Explore generates Candidates from the How Might We
For feature issues, the explore sub-agent SHALL enumerate at least two Candidate solutions during the Ideate step. Candidates SHALL be derived from the How Might We question (the problem), not from the issue's implied solution. The issue's implied approach is not a required candidate.

#### Scenario: Candidates are generated from the HMW
- **WHEN** the explore sub-agent enters the Ideate step
- **THEN** it SHALL generate candidates that answer the How Might We question
- **THEN** each candidate SHALL be named and described independently of the issue's framing

#### Scenario: Issue's implied approach is not among the candidates
- **WHEN** the issue's implied solution would not answer the How Might We well or violates a principle
- **THEN** it is NOT required to be listed as a candidate
- **THEN** the Recommendation SHALL include one sentence acknowledging the issue's implied direction and explaining why it was not carried forward

#### Scenario: Issue's implied approach is a strong candidate
- **WHEN** the issue's implied solution naturally answers the How Might We and is principle-compliant
- **THEN** it MAY appear as one of the candidates, evaluated on equal footing with other candidates

---

### Requirement: Explore evaluates Candidates using Six Thinking Hats
During the Evaluate step, the explore sub-agent SHALL apply three of the Six Thinking Hats to each candidate: Yellow Hat (benefits), Black Hat (risks and principle violations), and Green Hat (check for missed candidates). Evaluation SHALL occur after all candidates are generated — not during ideation.

#### Scenario: Yellow Hat applied per candidate
- **WHEN** evaluating a candidate
- **THEN** the explore sub-agent SHALL assess what is genuinely beneficial about it — why it works, what user value it delivers

#### Scenario: Black Hat applied per candidate
- **WHEN** evaluating a candidate
- **THEN** the explore sub-agent SHALL assess risks, failure modes, and whether it violates any `docs/ux-principles.md` failure modes or conflicts with `VISION.md`

#### Scenario: Green Hat check for missing candidates
- **WHEN** evaluation is complete
- **THEN** the explore sub-agent SHALL ask whether there is an obvious candidate not yet on the list
- **THEN** if a strong missing candidate is identified, it SHALL be added to the Candidates list and evaluated

#### Scenario: All candidates violate a failure mode
- **WHEN** every candidate triggers a `docs/ux-principles.md` failure mode and no compliant alternative can be found
- **THEN** the explore sub-agent SHALL return NEEDS_INPUT with a `product_direction` blocker

---

### Requirement: Explore produces a Recommendation derived from Evaluation
The explore sub-agent's discovery output SHALL include a Recommendation section that names the chosen candidate and explains the rationale. The Recommendation is the converge step of the Solution Space diamond.

#### Scenario: Recommendation selects the principle-compliant candidate
- **WHEN** one candidate is clearly more compliant with `docs/ux-principles.md` and better aligned with `VISION.md`
- **THEN** the Recommendation SHALL select it and explain why it was chosen over the alternatives

#### Scenario: Recommendation diverges from the issue's implied direction
- **WHEN** the chosen Recommendation differs from what the issue implied
- **THEN** the Recommendation SHALL note this explicitly in one sentence and explain the reasoning
- **THEN** it SHALL NOT return NEEDS_INPUT solely because it diverges from the issue's framing

---

### Requirement: Explore produces a Now / Next / Later scope breakdown
The explore sub-agent's discovery output SHALL include a Now / Next / Later section that sequences scope. "Now" is this PR: the smallest set that solves the core problem well. "Next" is a clear follow-up that could be its own issue. "Later" is future direction without commitment. There is no "Out of scope" list.

#### Scenario: Right solution requires large scope
- **WHEN** the Recommendation would require a large amount of work
- **THEN** the explore sub-agent SHALL propose a Now/Next/Later sequencing breakdown
- **THEN** it SHALL return NEEDS_INPUT with a `product_direction` blocker: "which phase to start with?"
- **THEN** it SHALL NOT cut scope to an inferior solution that does not solve the core problem well

#### Scenario: Scope fits in one PR
- **WHEN** the Recommendation can be delivered in a single PR without significant scope risk
- **THEN** the Now section covers the full Recommendation
- **THEN** Next and Later capture natural follow-ups and future direction, even if none are required

#### Scenario: Issue asks for a scoped-down approach
- **WHEN** the issue suggests a partial solution to avoid complexity
- **THEN** the explore sub-agent SHALL evaluate whether that partial solution solves the core problem well
- **THEN** if it does not, the explore sub-agent SHALL recommend the full right solution and explain why the partial approach was not sufficient
