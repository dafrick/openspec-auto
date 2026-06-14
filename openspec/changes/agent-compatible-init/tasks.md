## 1. Tests (write first — TDD)

- [ ] 1.1 Create `skill/openspec-auto/scripts/init.test.ts` with a test for the `--yes` flag happy path: mock `inferReviewer`/`inferDefaultBranch` to return known values, assert `.openspec-auto.json` is written correctly and the process exits zero
- [ ] 1.2 Add test: `--yes` with empty reviewer inference exits non-zero and does NOT write config
- [ ] 1.3 Add test: `--reviewer <handle> --branch <name>` writes those values directly without calling inference functions
- [ ] 1.4 Add test: no flags → interactive path is still invoked (confirm `@inquirer/prompts`' `input` is called, not skipped)
- [ ] 1.5 Verify all new tests fail (red) before touching `init.ts`

## 2. Implementation

- [ ] 2.1 Add `util.parseArgs` import from `node:util` at the top of `skill/openspec-auto/scripts/init.ts`
- [ ] 2.2 Parse `--yes` / `-y`, `--reviewer`, and `--branch` flags at the start of `main()` using `util.parseArgs`
- [ ] 2.3 When non-interactive mode is active (`--yes` or both `--reviewer`+`--branch` supplied): resolve reviewer from explicit flag or `inferReviewer()`; resolve branch from explicit flag or `inferDefaultBranch()`; skip both `await input(...)` calls entirely
- [ ] 2.4 When `--yes` is set and the resolved reviewer is an empty string: print the diagnostic error message and call `process.exit(1)` before writing any file
- [ ] 2.5 When flags are absent: fall through to the existing interactive path unchanged (no behavior change)
- [ ] 2.6 Confirm `@inquirer/prompts` import and usage are untouched (interactive path stays)

## 3. Verification

- [ ] 3.1 Run the full test suite (`npm test` or equivalent) and confirm all tests pass (green)
- [ ] 3.2 Manually smoke-test the interactive path: run `npx openspec-auto init` in a test repo and confirm it still prompts as before
- [ ] 3.3 Manually smoke-test `--yes`: run `npx openspec-auto init --yes` in a test repo with `gh` available and confirm `.openspec-auto.json` is written with the correct inferred values and exit code 0
- [ ] 3.4 Manually smoke-test failure path: run `npx openspec-auto init --yes` without `gh` on PATH and confirm exit code is non-zero and the error message is clear
