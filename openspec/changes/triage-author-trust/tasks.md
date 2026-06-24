## 1. Update triage prompt

- [ ] 1.1 Add trust-evaluation step to `skill/openspec-auto/prompts/triage.md` — after ranking eligible issues, if and only if two or more candidates land in the same priority tier (HIGH / MEDIUM / LOW) with no confident ordering, fetch author signals via `gh api /users/<login>` and `gh api "search/issues?q=repo:<owner>/<repo>+author:<login>&per_page=1"` (use `.total_count` from the search response; do not fetch for a clear winner)
- [ ] 1.2 Add tiebreaker logic description: a tie is defined as two or more candidates in the same priority tier where recency, impact, and effort do not produce a confident ordering; when tied, prefer the candidate whose reporter has higher trust (older account, prior repo activity, higher public repo count); when not tied, skip trust fetch entirely and note `Trust: not evaluated — clear winner` in output
- [ ] 1.3 Add rate-limit fallback: if `gh api` returns a rate-limit error, skip trust step and emit `Trust: unknown — rate limit`
- [ ] 1.4 Update the `SELECTED` output format in triage.md to include the `Trust:` annotation line after branch slug; two formats: `Trust: @<login>; acct <YYYY-MM>; <N> prior repo activity; signal: <summary>` (tie case) or `Trust: not evaluated — clear winner` (no tie)

## 2. Update orchestrator skill

- [ ] 2.1 Update `skill/openspec-auto/SKILL.md` Triage stage description to document the `Trust:` annotation field, its format, and its purpose
- [ ] 2.2 Update `skill/openspec-auto/SKILL.md` dispatch logic for the Explore stage to extract the `Trust:` line from triage output and pass it as `{{AUTHOR_TRUST}}` when dispatching the explore sub-agent prompt

## 3. Update explore prompt

- [ ] 3.1 Add `{{AUTHOR_TRUST}}` placeholder to `skill/openspec-auto/prompts/explore.md` in the header variables section (alongside `{{REPO_PATH}}`, `{{ISSUE}}`, etc.)
- [ ] 3.2 Add instruction in explore.md's blocking-questions step (step 4) describing how to use `{{AUTHOR_TRUST}}` to calibrate tone: more context-setting for new/low-activity accounts, more direct for known contributors
- [ ] 3.3 Ensure the instruction is clear that trust affects tone only, not whether a question is asked

## 4. Verification

- [ ] 4.1 Dry-run triage against a sample repo with a mix of old and new account reporters — confirm `Trust:` annotation appears in output with correct format
- [ ] 4.2 Confirm that a low-trust reporter issue is not rejected, only deprioritized when an equal-ranked alternative exists
- [ ] 4.3 Confirm `{{AUTHOR_TRUST}}` is passed through to explore prompt in SKILL.md dispatch logic
