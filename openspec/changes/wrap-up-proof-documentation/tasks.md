## 1. Update code-review prompt

- [ ] 1.1 Add `**Proof:**` block to the Output section of `skill/openspec-auto/prompts/code-review.md`, with labeled fields: Tests run, CI state, Verification, Caveats
- [ ] 1.2 Mark the `**Proof:**` block as required in both the APPROVED and CHANGES_REQUESTED output examples in `code-review.md`
- [ ] 1.3 Write a test asserting that a code-review output fixture without a `**Proof:**` block is considered non-conformant (documents expected format)

## 2. Update implement prompt

- [ ] 2.1 Add `**Tests run:**` line to the `DONE` output block in `skill/openspec-auto/prompts/implement.md`, positioned after `Completed tasks:` and before `Summary:`
- [ ] 2.2 Add a note in `implement.md` clarifying that "none" with explanation is acceptable if no tests exist

## 3. Update orchestrator Wrap up stage

- [ ] 3.1 In `SKILL.md` Wrap up stage, add a step to extract the `**Proof:**` block from the code-review sub-agent's output (from `**Proof:**` line to the next blank-line section boundary or end of output)
- [ ] 3.2 Add a step to post a `## Test Evidence` PR comment with the extracted proof block content (using `gh pr comment <PR> --body "## Test Evidence\n<proof-content>"`)
- [ ] 3.3 Add fallback: if no `**Proof:**` block is found, post `## Test Evidence\n*(no proof block returned by code-review)*`
- [ ] 3.4 Confirm in `SKILL.md` that the Test Evidence comment is posted before the reviewer request and the `@<reviewer> — ready for review` comment

## 4. Update orchestrator Implement handling

- [ ] 4.1 In `SKILL.md` Implement stage handling, update the `DONE` processing to also capture the `**Tests run:**` line from the sub-agent output
- [ ] 4.2 Ensure the tests-run content is included in the implementation summary passed to `write-discovery.ts`

## 5. Verify end-to-end format compliance

- [ ] 5.1 Confirm that the updated `code-review.md` output template renders correctly and all four proof fields are present in both verdict variants
- [ ] 5.2 Confirm that the updated `implement.md` DONE template includes `**Tests run:**` in the correct position
- [ ] 5.3 Confirm that `SKILL.md` Wrap up step ordering: Test Evidence comment → reviewer request → ready-for-review comment
