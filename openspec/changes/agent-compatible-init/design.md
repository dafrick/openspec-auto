## Context

`init.ts` is a standalone Node.js entry point that collects two config values (`reviewer` and `defaultBranch`) via `@inquirer/prompts` interactive prompts, then writes `.openspec-auto.json`. Both values are already inferred automatically from `gh repo view` before the prompts are shown — the prompts exist solely so a human can confirm or override them.

In an agent or CI context there is no TTY, so `@inquirer/prompts`'s `input()` either hangs waiting for stdin or throws immediately. This makes any fully-automated first-time run impossible.

The fix is a flag-driven bypass: when flags are present, skip the `await input(...)` calls entirely and write config from the inferred/provided values. The interactive path stays untouched.

## Goals / Non-Goals

**Goals:**
- Refactor `init.ts` to export `main`, `inferReviewer`, and `inferDefaultBranch` as named exports and guard the auto-run with `if (import.meta.url === \`file://${process.argv[1]}\`) { main() }` — matching the pattern already used in `setup-workspace.ts` and `survey.ts`. This is a prerequisite for test-file imports that do not trigger the interactive flow.
- Add `--yes` / `-y` flag: infer both values and write config without any prompts
- Add `--reviewer <handle>` and `--branch <name>` override flags for explicit agent control
- Exit non-zero with a clear message when `--yes` is set and inference returns an empty string for `reviewer` (the only value without a safe default)
- Keep the existing interactive path byte-for-byte unchanged for human users
- Use only Node.js built-ins for flag parsing (no new dependency)

**Non-Goals:**
- Changing `read-config.ts`, `setup-workspace.ts`, or any other file
- Making the orchestrator's Bring-up automatically run `init` when config is missing
- Supporting JSON inline config or `--config` file flags
- Removing `@inquirer/prompts` (interactive path stays supported)

## Decisions

### D1: `--yes` as the primary agent flag, with optional `--reviewer` / `--branch` overrides

**Decision:** `--yes` / `-y` accepts both inferred defaults without prompting. `--reviewer` and `--branch` let an agent supply explicit values instead of relying on inference.

**Alternatives considered:**
- *Require explicit flags only (no `--yes`)*: forces the agent to always shell out to `gh repo view` itself; redundant since `init.ts` already does this.
- *Environment variables*: unconventional for a CLI init command; harder to document and discover.

**Rationale:** `--yes` mirrors the established convention (`npm init -y`, `apt-get install -y`). An agent can call `npx openspec-auto init --yes` with zero extra steps. Explicit overrides remain available for edge cases.

### D2: Flag parsing via `util.parseArgs` (Node.js built-in)

**Decision:** Use `node:util`'s `parseArgs` — available since Node 18.3, and the project already requires Node ≥ 24 (`engines.node: ">=24"` in `package.json`), so this is well within range. Pass `{ strict: false }` so that unrecognized flags are silently ignored rather than throwing, matching the spec requirement that unknown flags do not crash the process.

**Alternatives considered:**
- *`minimist` / `yargs`*: adds a dependency; unnecessary for three flags.
- *Manual `process.argv` parsing*: fragile and harder to maintain.

### D3: Non-zero exit when non-interactive mode is active and reviewer inference fails

**Decision:** If non-interactive mode is active (any of `--yes`, `--reviewer`, or `--branch` supplied) and the resolved reviewer is `""` (empty string — neither a flag value nor inference returned one), print an error message and `process.exit(1)`. Do not write a config with an empty reviewer field.

**Rationale:** An empty reviewer would silently produce a broken config that fails at review time rather than at init time. Fast failure with a clear message is better. `defaultBranch` already has a hardcoded fallback of `"main"`, so it never produces an empty value.

### D4: `--reviewer` and `--branch` override `--yes` when both are supplied

**Decision:** Explicit flag values take precedence over inference. If `--reviewer org-name` is supplied, that value is used directly without calling `inferReviewer()`.

**Rationale:** Gives agents deterministic control. Order of precedence: explicit flag > inferred value > interactive prompt.

## Risks / Trade-offs

- **Node.js version constraint**: `util.parseArgs` requires Node 18+. The project already targets Node 18+, so this is not a new constraint — but it should be verified in the runtime docs/CI matrix. → Mitigation: document in the spec and verify CI node version.
- **`--yes` with no `gh` CLI**: If `gh` is absent, `inferReviewer()` returns `""` and init exits non-zero. This is the correct behavior (clear error > silent bad config). → Mitigation: the error message should tell the user to install `gh` or use `--reviewer <handle>` explicitly.
- **Interactive path untouched**: The design is strictly additive — the `await input(...)` calls are only skipped when any of `--yes`, `--reviewer`, or `--branch` is supplied. Human users running `init` with no flags get exactly the same experience as today.
