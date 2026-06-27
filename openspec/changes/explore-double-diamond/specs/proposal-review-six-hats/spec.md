## ADDED Requirements

### Requirement: Proposal-review applies Six Thinking Hats evaluation
The proposal-review sub-agent SHALL evaluate each proposal using the Six Thinking Hats framework. All six hats SHALL be applied to the overall proposal (not per-candidate). The Blue Hat is applied first as a process gate; if the Double Diamond structure is missing, the review SHALL return CHANGES_REQUESTED without proceeding to the other hats.

#### Scenario: All hats applied in sequence
- **WHEN** the proposal-review sub-agent evaluates a proposal
- **THEN** it SHALL apply Blue, White, Yellow, Black, Red, and Green hats in sequence
- **THEN** findings from each hat are tagged by hat color and severity

#### Scenario: Blue Hat fails — Double Diamond not present
- **WHEN** the proposal-review sub-agent finds the explore discovery output is missing required sections (Point of View, How Might We, Candidates, Recommendation)
- **THEN** it SHALL return CHANGES_REQUESTED with a blocking finding under the Blue Hat
- **THEN** it SHALL NOT continue evaluating the other hats

---

### Requirement: Blue Hat — process check
The proposal-review sub-agent SHALL verify that the explore discovery output followed the Double Diamond structure. This is a structural check: required sections must exist and must be structurally sound (not empty or placeholder text).

#### Scenario: Point of View is missing or is an issue restatement
- **WHEN** the discovery output has no Point of View section, or the Point of View merely restates the issue without diagnosing the underlying need
- **THEN** proposal-review SHALL flag this as a blocking finding

#### Scenario: How Might We is missing or embeds a solution
- **WHEN** the discovery output has no How Might We section, or the HMW references a specific implementation approach (e.g., "How might we add a command to...")
- **THEN** proposal-review SHALL flag this as a blocking finding

#### Scenario: Candidates section is missing or has only one candidate
- **WHEN** the discovery output for a feature has no Candidates section or lists fewer than two candidates
- **THEN** proposal-review SHALL flag this as a blocking finding

#### Scenario: Double Diamond structure is intact
- **WHEN** all required sections are present and structurally sound
- **THEN** proposal-review SHALL proceed to the White Hat

---

### Requirement: White Hat — facts check
The proposal-review sub-agent SHALL verify the factual accuracy of the discovery output and proposal artifacts.

#### Scenario: Point of View misrepresents the problem
- **WHEN** the Point of View contradicts the codebase findings or misclassifies a real constraint as assumed (or vice versa)
- **THEN** proposal-review SHALL flag this as a blocking finding

#### Scenario: Candidate technical claims are incorrect
- **WHEN** a candidate's technical description contains factual errors about the codebase or API
- **THEN** proposal-review SHALL flag this as a blocking finding

#### Scenario: Facts check passes
- **WHEN** the factual claims in the discovery and proposal artifacts are accurate
- **THEN** proposal-review SHALL proceed to the Yellow Hat

---

### Requirement: Yellow Hat — value check
The proposal-review sub-agent SHALL assess what is genuinely good about the proposal — whether it solves the job-to-be-done and aligns with VISION.md.

#### Scenario: Recommendation solves the job-to-be-done
- **WHEN** the Recommendation clearly addresses the JTBD stated in the Point of View
- **THEN** proposal-review SHALL note this as a positive finding under the Yellow Hat

#### Scenario: Recommendation does not solve the job-to-be-done
- **WHEN** the Recommendation would not actually accomplish the user's underlying job
- **THEN** proposal-review SHALL flag this as a blocking finding

#### Scenario: Proposal misaligns with VISION.md
- **WHEN** the proposal's approach contradicts a stated design principle in VISION.md
- **THEN** proposal-review SHALL flag this as a blocking finding under Yellow Hat

---

### Requirement: Black Hat — risk check
The proposal-review sub-agent SHALL identify risks, principle violations, and authorization requirements.

#### Scenario: Chosen approach violates a ux-principles.md failure mode
- **WHEN** design.md acknowledges a deviation from `docs/ux-principles.md` and no maintainer comment explicitly authorizes it
- **THEN** proposal-review SHALL return CHANGES_REQUESTED with a blocking finding naming the failure mode

#### Scenario: Authorized deviation is present
- **WHEN** design.md acknowledges a principle deviation and a maintainer comment in the issue or PR explicitly authorizes it
- **THEN** proposal-review SHALL note the deviation as authorized and continue

#### Scenario: Technical risks or regressions identified
- **WHEN** the proposal's approach carries identifiable technical risks (breaking changes, regressions, data loss)
- **THEN** proposal-review SHALL flag these — blocking if unmitigated, minor if mitigation is documented

---

### Requirement: Red Hat — perspective check
The proposal-review sub-agent SHALL evaluate the proposal's overall coherence and appropriateness by wearing three stakeholder hats in sequence: a product developer's hat, a product manager's hat, and a UX researcher's hat. This is a gut coherence check — does the proposal feel right from each perspective?

#### Scenario: Product developer perspective
- **WHEN** wearing the product developer hat
- **THEN** proposal-review SHALL assess whether this is a clean, implementable solution that a developer would be confident building and maintaining

#### Scenario: Product manager perspective
- **WHEN** wearing the product manager hat
- **THEN** proposal-review SHALL assess whether the Now/Next/Later sequencing is sensible, whether the scope is appropriate, and whether the proposal moves the product in the right direction

#### Scenario: UX researcher perspective
- **WHEN** wearing the UX researcher hat
- **THEN** proposal-review SHALL assess whether the Recommendation genuinely addresses the user's job, and whether the solution would be intuitive and friction-free for the intended user

#### Scenario: Red Hat raises a coherence concern
- **WHEN** any stakeholder perspective reveals a significant mismatch — a solution that feels technically awkward, commercially misaligned, or user-hostile
- **THEN** proposal-review SHALL flag this as a blocking or minor finding depending on severity

---

### Requirement: Green Hat — coverage check
The proposal-review sub-agent SHALL check for obvious candidates that were not considered, and for untested assumptions in the Recommendation.

#### Scenario: Obvious candidate not in the Candidates list
- **WHEN** proposal-review identifies a strong solution candidate that was not enumerated during Ideate
- **THEN** it SHALL assess whether that candidate would change the Recommendation
- **THEN** if it would, this is a blocking finding; if not, it is a minor finding

#### Scenario: Recommendation rests on an untested assumption
- **WHEN** the Recommendation's rationale depends on an assumption that was not verified during investigation
- **THEN** proposal-review SHALL flag this as a blocking finding if the assumption is likely to be wrong, or minor if it is low-risk
