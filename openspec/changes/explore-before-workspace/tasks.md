## 1. Extend survey.ts with agentIssueState

- [ ] 1.1 Add `agentIssueState: { phase: Phase; blocked: boolean } | null` to the `SurveyRow` interface in `survey.ts`
- [ ] 1.2 In `buildTable`, after resolving `agentPr`, scan the issue's comments for an `<!-- agent-state: … -->` marker (using the existing `parseAgentState` helper) when `agentPr` is null; populate `agentIssueState` from the first matching comment
- [ ] 1.3 Ensure `agentIssueState` is always null when `agentPr` is non-null (PR takes precedence)

## 2. Update prompts/triage.md for pre-Workspace resume

- [ ] 2.1 Add a third resume case to the "Resume first" section: a row where `agentPr` is null but `agentIssueState.phase === "NEEDS_INPUT"` and a non-agent issue comment is newer than the agent's blocking-questions comment → return `RESUME` with `Target: issue #N`
- [ ] 2.2 Update the RESUME output block to include an optional `Target:` line (`Target: issue #N` or `Target: pr #N`) so the orchestrator can distinguish the two paths
- [ ] 2.3 Update the eligibility filter to exclude issues where `agentIssueState` is non-null but not yet resumable (i.e., the agent has asked a question but no human has replied) — these are neither resumable nor fresh-work candidates

## 3. Update prompts/explore.md for pre-Workspace context

- [ ] 3.1 Rename `{{PR_CONTEXT}}` to `{{PRIOR_CONTEXT}}` in `explore.md`
- [ ] 3.2 Update the placeholder description to say: "Empty on the first run. On a pre-Workspace resume it holds the prior discovery output and the issue comment dialogue (blocking questions + human answers). On a post-Workspace resume it holds the prior discovery output and the PR comment dialogue."

## 4. Update SKILL.md orchestration

- [ ] 4.1 Update the Mermaid flow diagram: move Explore between Triage's `SELECTED` edge and the Workspace node; add `EXPLORED` edge from Explore to Workspace and `NEEDS_INPUT` edge from Explore to Teardown (pre-Workspace)
- [ ] 4.2 Update the Handling Sub-Agent Status table: add a `triage` row for `RESUME` with `Target: issue` → action: re-enter Explore-on-issue with prior dialogue
- [ ] 4.3 Update the **Triage** stage description to note that `SELECTED` now goes to Explore (not Workspace)
- [ ] 4.4 Update the **Workspace** stage description: Fresh path now requires a prior `EXPLORED` result from Explore-on-issue, and seeding the PR description with the discovery output is part of the Workspace setup sequence
- [ ] 4.5 Update the **Explore** stage description: note that on first run there is no worktree and no PR; `{{PRIOR_CONTEXT}}` is now the placeholder name; post blocking questions to the issue on NEEDS_INPUT (not to a PR); add the `agent-investigating` label at Explore start and remove it at Workspace creation
- [ ] 4.6 Add a Bring-up step: ensure the `agent-investigating` label exists in the repo (`gh label create agent-investigating --color … --description … --force` is idempotent)
- [ ] 4.7 Update the Red Flags section: add a flag "Never create a branch or PR before Explore returns EXPLORED"

## 5. Verify

- [ ] 5.1 Re-read `survey.ts` and confirm: `SurveyRow` has `agentIssueState`; `buildTable` populates it from issue comments when `agentPr` is null; PR takes precedence
- [ ] 5.2 Re-read `prompts/triage.md` and confirm: pre-Workspace resume case is present, output format includes `Target:` line, and issues mid-Explore with no human reply are excluded from both resume and new-work selection
- [ ] 5.3 Re-read `prompts/explore.md` and confirm: placeholder is `{{PRIOR_CONTEXT}}`, description covers both pre- and post-Workspace resume scenarios
- [ ] 5.4 Re-read `SKILL.md` and confirm: flow diagram, stage descriptions, handling table, and Red Flags all reflect the new Explore-before-Workspace ordering
