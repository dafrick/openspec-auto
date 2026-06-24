## Context

The openspec-auto triage sub-agent currently ranks eligible issues by recency, impact, and effort, then selects the top candidate. It has no awareness of reporter identity or account characteristics. When triage selects an issue from a drive-by or brand-new account, the downstream Explore stage often generates blocking questions that are never answered — the issue parks in `NEEDS_INPUT` indefinitely, occupying a slot in the orchestrator's attention without ever progressing.

The fix is lightweight: after ranking, apply a trust tiebreaker using data already accessible via `gh api` (no new dependencies). The trust signal travels as a one-line annotation through the orchestrator into the Explore prompt, where it adjusts tone rather than logic.

## Goals / Non-Goals

**Goals:**

- Add a trust-evaluation step to triage that fetches author signals via `gh api` only when two or more candidates are tied in priority
- Use trust as a tiebreaker when two issues are in the same priority tier
- Emit a `Trust:` annotation in triage output for the selected issue
- Pass `{{AUTHOR_TRUST}}` into the explore prompt so blocking-question tone can be calibrated
- Document the annotation in SKILL.md's Triage stage description

**Non-Goals:**

- Hard-filtering issues by author trust (low-trust never means ineligible)
- Fetching trust data when there is a clear top candidate (only fetched when candidates are tied in priority tier)
- Adding trust signals to the resume path (only applies to new-issue selection)
- Changing the orchestrator state machine or adding new phases

## Decisions

### Decision 1: Trust as tiebreaker, not hard filter

**Choice:** Trust is advisory — a low-trust signal reduces priority vs. equal-ranked candidates but never makes an issue ineligible.

**Rationale:** The existing `triage-eligibility-rules` spec establishes a default-eligible model; changing eligibility semantics would require a spec amendment and could cause the system to discard legitimate issues from new contributors. The failure mode we're fixing is prioritization, not eligibility. A tiebreaker is the minimal intervention.

**Alternative considered:** Hard filter (reject issues from accounts < 30 days old). Rejected because it would block genuine new contributors and contradict the default-eligible model.

### Decision 2: "Tied" means same priority tier after ranking

**Choice:** Candidates are considered tied when, after applying recency, impact, and effort criteria, two or more issues land in the same priority tier (HIGH / MEDIUM / LOW) and the model cannot produce a confident ordering between them. Trust is fetched only in that case; if one candidate is clearly ranked above the others, trust is skipped and no `gh api` calls are made.

**Rationale:** Triage ranking is qualitative, not a precise numeric score. A band defined by priority tier is the natural unit of "close enough to be a coin flip." Restricting the trust fetch to genuine ties keeps the non-goal concrete: trust data is never fetched just as a sanity check on the top pick.

**Alternative considered:** A percentage band (e.g., within 10% of top score). Rejected — triage doesn't produce numeric scores, so a tier band is more implementable and honest.

### Decision 3: Three trust signals via `gh api`

**Choice:** Fetch (a) account creation date, (b) prior issues/PRs in this repo, (c) public repo count as a proxy for general GitHub activity.

**Rationale:** These three signals are available from two `gh api` calls (`/users/<login>` and `/search/issues?repo:...&author:...`), are fast, and cover the key risk dimensions: account age, repo familiarity, and account legitimacy. They avoid scraping activity feeds or pulling large datasets.

**Alternative considered:** GitHub's contribution graph or follower count. Rejected — noisy, not meaningful for OSS maintainers, and requires more API calls.

### Decision 4: One-line `Trust:` annotation in triage output

**Choice:** Triage emits a single structured line: `Trust: @login; acct <YYYY-MM>; <N> prior repo activity; signal: <summary>`.

**Rationale:** The orchestrator needs to extract and pass this to Explore without parsing a prose paragraph. A structured one-liner is easy to extract with a regex and keeps the triage output format stable.

**Alternative considered:** A structured JSON block. Rejected — the rest of triage output is prose Markdown; mixing in JSON adds parsing complexity for the orchestrator.

### Decision 5: Explore uses trust for tone, not routing

**Choice:** The `{{AUTHOR_TRUST}}` placeholder is passed to Explore, which uses it only to calibrate the language of blocking questions — not to decide whether to ask them.

**Rationale:** Whether to ask a blocking question is determined by Explore's own logic (is the answer required to proceed?). Trust affects how the question is framed: a new account gets more context and lower assumed familiarity; a known contributor gets a more direct ask. This keeps routing logic in the orchestrator, not in a prompt variable.

## Risks / Trade-offs

- **Rate limits on `gh api`**: Fetching per-author data adds two API calls per triage cycle. At normal operating frequency (one triage per loop iteration), this is well within GitHub's rate limits. [Risk: rate limit hit during burst] → Mitigation: if `gh api` returns a rate-limit error, skip the trust step and emit `Trust: unknown — rate limit`.
- **New account ≠ low-quality issue**: A brand-new account may file a completely valid, well-specified bug. The tiebreaker only activates when two issues are otherwise equal, so a high-quality new-account issue will still beat a low-quality old-account issue. The risk is accepting this small bias in exchange for fewer dead-end `NEEDS_INPUT` states.
- **Trust annotation staleness**: Trust is evaluated at triage time. If the author later becomes active, the annotation is stale. This is acceptable because the annotation is informational, not a persistent record.

## Migration Plan

This is an additive prompt-only change. No state migration is needed.

1. Update `prompts/triage.md` with trust evaluation step and `Trust:` output format.
2. Update `SKILL.md` Triage stage docs to document `Trust:` field.
3. Update `prompts/explore.md` to accept `{{AUTHOR_TRUST}}` and describe its usage.
4. The orchestrator (SKILL.md's dispatch logic) must extract `Trust:` from triage output and inject it as `{{AUTHOR_TRUST}}` when dispatching Explore.

Rollback: revert the three file changes. No persistent state is affected.

## Open Questions

- Should the orchestrator log the `Trust:` annotation in the PR description or just pass it ephemerally to Explore? (Current design: ephemeral, not persisted to PR description. Could be added later if useful for audit.)
