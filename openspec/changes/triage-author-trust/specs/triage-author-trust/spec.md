## ADDED Requirements

### Requirement: Triage evaluates reporter trust signals for selected issue
After ranking eligible issues and identifying the top candidate(s), the triage sub-agent SHALL fetch author trust signals for the top candidate via `gh api` and use the result as a tiebreaker when two candidates are otherwise equal in priority. Trust signals SHALL include: account creation date, count of prior issues or PRs in the target repository authored by the reporter, and count of public repositories on the reporter's account.

#### Scenario: Trust tiebreaker applied between equal-ranked candidates
- **WHEN** two or more eligible issues are equal in priority by recency, impact, and effort
- **THEN** triage SHALL prefer the candidate whose reporter has higher trust (older account, prior repo activity, or more public repos)

#### Scenario: High-quality issue from new account still selected over low-quality issue
- **WHEN** a new-account reporter has filed a clearly higher-priority issue than an established-account reporter
- **THEN** triage SHALL select the higher-priority issue regardless of trust signals

#### Scenario: gh api rate limit reached during trust fetch
- **WHEN** the `gh api` call to fetch author data returns a rate-limit error
- **THEN** triage SHALL skip the trust step, select the top-ranked issue by existing criteria, and emit `Trust: unknown — rate limit`

### Requirement: Triage emits a Trust annotation for the selected issue
The triage sub-agent output for `SELECTED` status SHALL include a one-line `Trust:` annotation immediately after the branch slug line. The annotation SHALL follow the format: `Trust: @<login>; acct <YYYY-MM>; <N> prior repo activity; signal: <one-line summary>`.

#### Scenario: Trust annotation included in SELECTED output
- **WHEN** triage returns `SELECTED` status
- **THEN** the output SHALL contain a `Trust:` line with the reporter's login, account creation year-month, count of prior repo activity, and a one-line signal summary

#### Scenario: Elevated risk indicated for new accounts
- **WHEN** the selected reporter's account is less than 30 days old
- **THEN** the `Trust:` signal summary SHALL include the phrase `new account — NEEDS_INPUT risk elevated`

#### Scenario: Known contributor indicated for reporters with prior activity
- **WHEN** the selected reporter has one or more prior issues or PRs in the repository
- **THEN** the `Trust:` signal summary SHALL reference their prior activity (e.g., `known contributor — N prior issues/PRs`)

### Requirement: Orchestrator passes Trust annotation to Explore sub-agent
The orchestrator SHALL extract the `Trust:` annotation from triage output and pass it as the `{{AUTHOR_TRUST}}` placeholder when dispatching the Explore sub-agent prompt.

#### Scenario: AUTHOR_TRUST placeholder populated from triage Trust annotation
- **WHEN** triage returns `SELECTED` with a `Trust:` annotation
- **THEN** the orchestrator SHALL set `{{AUTHOR_TRUST}}` to the full content of the `Trust:` line before dispatching Explore

#### Scenario: AUTHOR_TRUST placeholder empty when Trust annotation absent
- **WHEN** triage output does not contain a `Trust:` line (e.g., resume path, rate-limit skip without annotation)
- **THEN** the orchestrator SHALL set `{{AUTHOR_TRUST}}` to an empty string

### Requirement: Explore sub-agent uses Trust annotation to calibrate blocking-question tone
When the `{{AUTHOR_TRUST}}` placeholder is non-empty, the Explore sub-agent SHALL use the trust signal to calibrate the tone and framing of any blocking questions it generates. It SHALL NOT use the trust signal to change whether a blocking question is asked.

#### Scenario: New-account reporter receives context-setting blocking questions
- **WHEN** `{{AUTHOR_TRUST}}` signals a new or low-activity account and Explore has blocking questions
- **THEN** the blocking questions SHALL include additional context about what information is needed and why, accommodating lower assumed familiarity with the project

#### Scenario: Known contributor receives direct blocking questions
- **WHEN** `{{AUTHOR_TRUST}}` signals a known contributor and Explore has blocking questions
- **THEN** the blocking questions SHALL be framed directly, assuming project familiarity

#### Scenario: Trust signal does not affect whether questions are asked
- **WHEN** Explore determines a question is not blocking regardless of trust level
- **THEN** the trust signal SHALL NOT cause additional questions to be asked
