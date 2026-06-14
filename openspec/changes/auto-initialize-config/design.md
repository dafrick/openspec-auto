## Context

The `openspec-auto` skill orchestrates an autonomous GitHub issue-resolution loop. Its first stage, **Bring-up**, currently reads `.openspec-auto.json` and immediately stops if the file is missing or invalid, instructing the user to run `npx openspec-auto init` manually.

Issue #2 ("init is not suitable for agents") was resolved by adding a non-interactive path to `init.ts`: passing `--yes` (or `--reviewer`/`--branch`) skips the interactive prompt, infers config from `gh`, writes `.openspec-auto.json`, and exits non-zero if it cannot infer the reviewer. This capability exists and is tested, but Bring-up was never updated to use it.

The only file in scope is `skill/openspec-auto/SKILL.md`. No scripts, sub-agent prompts, or supporting libraries change.

## Goals / Non-Goals

**Goals:**
- When Bring-up finds `.openspec-auto.json` missing or invalid, run `init --yes` instead of stopping.
- If `init --yes` succeeds (exit 0), re-read config and proceed normally.
- If `init --yes` fails (exit non-zero), surface the error message and stop — giving the user the same clear, actionable guidance they would have gotten from running init themselves.
- Keep the prose change minimal and consistent with the existing SKILL.md style and OSL variable convention.

**Non-Goals:**
- Modifying `init.ts`, `read-config.ts`, `config-types.ts`, or `init.test.ts`.
- Syncing the installed copy at `.claude/skills/openspec-auto/` (that is handled separately by the install step in the harness).
- Adding new flags or behaviors to `init.ts`.
- Handling partial or corrupted config files differently from missing ones (both trigger `init --yes`).

## Decisions

### Decision 1: Run `init --yes`, not a custom inference path

**Choice:** Call `$OSL/node_modules/.bin/tsx $OSL/scripts/init.ts --yes`.

**Rationale:** `init --yes` already handles reviewer inference (`gh repo view`), default-branch inference, writing the file, and error reporting. Duplicating any of this logic in SKILL.md prose would create a maintenance split. Using the existing script keeps the single source of truth.

**Alternative considered:** Inline the inference steps directly in Bring-up prose (call `gh repo view`, derive values, write JSON). Rejected: too much logic in prose; diverges from `init.ts` over time.

### Decision 2: Treat missing and invalid config identically

**Choice:** Both "file not found" and "file exists but is invalid/unreadable" trigger `init --yes`.

**Rationale:** `init --yes` merges on top of existing config (see `init.ts` lines 94-99) if the file already exists, so running it on an invalid/partial file is safe and self-healing. The user outcome (a valid config) is the same either way.

**Alternative considered:** Only auto-init when the file is fully absent; stop on invalid. Rejected: more complex conditional logic for minimal benefit.

### Decision 3: Fail loudly on `init --yes` exit non-zero

**Choice:** If init exits non-zero, stop Bring-up and surface the error output to the user.

**Rationale:** The most common failure is `gh` not being authenticated or not being in a GitHub repo — both require human action. Continuing without a valid reviewer would silently corrupt downstream stages. Stopping with the init error message gives the user clear direction.

### Decision 4: No TDD requirement on SKILL.md prose

**Choice:** No automated test is written for the Bring-up prose change.

**Rationale:** SKILL.md is operational guidance prose, not executable code. The underlying behavior (`init --yes`) already has test coverage in `init.test.ts`. The prose change itself is verified by reading it. If the project adds integration tests for SKILL.md in the future, they can cover this scenario then.

## Risks / Trade-offs

- **`gh` not available or not authenticated** → `init --yes` exits 1 with a clear error message. Bring-up stops and surfaces it. Acceptable: the user needs to fix their environment before the loop can run.
- **Repo is not GitHub-hosted** → same as above. No silent data corruption.
- **Init writes a config, but the user had intentionally omitted it** → unlikely (the skill's purpose requires GitHub), but if it happens the user can delete `.openspec-auto.json` and re-run with `--reviewer` and `--branch` explicitly. Low risk.
- **Prose-only change; no runtime regression surface** → the only risk is the prose being ambiguous. Mitigated by following the existing SKILL.md style precisely.
