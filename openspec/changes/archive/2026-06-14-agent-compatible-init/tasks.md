## 0. Refactor entry point (prerequisite for TDD)

`init.ts` currently calls `main()` unconditionally at module top-level and exports nothing, which means importing it from a test file would immediately execute the interactive flow. The rest of the codebase uses an established pattern (`setup-workspace.ts`, `survey.ts`) that makes files testable. Apply the same pattern here before writing any tests.

- [x] 0.1 Export `inferReviewer` and `inferDefaultBranch` as named exports from `skill/openspec-auto/scripts/init.ts`
- [x] 0.2 Export `main` as a named export
- [x] 0.3 Guard the auto-run with `if (import.meta.url === `file://${process.argv[1]}`) { main() }` so importing the module from tests does not execute the interactive flow
- [x] 0.4 Verify the interactive flow still works end-to-end after the refactor (no behavior change for human users)

## 1. Tests (write first — TDD)

- [x] 1.1 Create `skill/openspec-auto/scripts/init.test.ts` with a test for the `--yes` flag happy path: mock `inferReviewer`/`inferDefaultBranch` to return known values, assert `.openspec-auto.json` is written correctly and the process exits zero
- [x] 1.2 Add test: `--yes` with empty reviewer inference exits non-zero and does NOT write config
- [x] 1.3 Add test: `--reviewer <handle> --branch <name>` writes those values directly without calling inference functions
- [x] 1.3a Add test: `--reviewer <handle>` alone (no `--branch`) activates non-interactive mode and uses inferred branch
- [x] 1.3b Add test: `--branch <name>` alone (no `--reviewer`) activates non-interactive mode and uses inferred reviewer
- [x] 1.4 Add test: no flags → interactive path is still invoked (confirm `@inquirer/prompts`' `input` is called, not skipped)
- [x] 1.5 Verify all new tests fail (red) before touching `init.ts` further

## 2. Implementation

- [x] 2.1 Add `util.parseArgs` import from `node:util` at the top of `skill/openspec-auto/scripts/init.ts`
- [x] 2.2 Parse `--yes` / `-y`, `--reviewer`, and `--branch` flags at the start of `main()` using `util.parseArgs`
- [x] 2.3 When non-interactive mode is active (any of `--yes`, `--reviewer`, or `--branch` supplied): resolve reviewer from explicit flag or `inferReviewer()`; resolve branch from explicit flag or `inferDefaultBranch()`; skip both `await input(...)` calls entirely
- [x] 2.4 When non-interactive mode is active and the resolved reviewer is an empty string: print the diagnostic error message and call `process.exit(1)` before writing any file
- [x] 2.5 When flags are absent: fall through to the existing interactive path unchanged (no behavior change)
- [x] 2.6 Confirm `@inquirer/prompts` import and usage are untouched (interactive path stays)

## 3. Verification

- [x] 3.1 Run the full test suite (`npm test` or equivalent) and confirm all tests pass (green)
- [ ] 3.2 Manually smoke-test the interactive path: run `npx openspec-auto init` in a test repo and confirm it still prompts as before
- [ ] 3.3 Manually smoke-test `--yes`: run `npx openspec-auto init --yes` in a test repo with `gh` available and confirm `.openspec-auto.json` is written with the correct inferred values and exit code 0
- [ ] 3.4 Manually smoke-test failure path: run `npx openspec-auto init --yes` without `gh` on PATH and confirm exit code is non-zero and the error message is clear
