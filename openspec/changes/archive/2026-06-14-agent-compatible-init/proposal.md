## Why

`openspec-auto init` uses `@inquirer/prompts` interactive prompts that require a TTY, making it impossible to run in an agent or CI context. Both values it collects (`reviewer` and `defaultBranch`) are already inferred automatically from `gh repo view` — the prompts only let a human confirm them. Agents have no way to confirm interactively, so any fully-automated first-time setup is blocked.

## What Changes

- Add a `--yes` (`-y`) flag to `init.ts` that skips all interactive prompts and writes the two inferred values directly to `.openspec-auto.json`
- Add optional `--reviewer <handle>` and `--branch <name>` override flags for cases where an agent needs to supply explicit values rather than rely on inference
- When `--yes` is set and inference fails (no `gh` CLI, no remote), exit non-zero with a clear error message instead of writing empty/wrong values
- Flag parsing uses Node.js built-in `util.parseArgs` — no new dependencies
- The existing interactive flow for human users is unchanged

## Capabilities

### New Capabilities
- `non-interactive-init`: Non-interactive init path — `--yes`/`--reviewer`/`--branch` flag support and the guarantee that init exits non-zero when `--yes` is set and inference fails

### Modified Capabilities
- `config-and-init`: The existing `config-and-init` spec gains requirements for the new non-interactive path (flag behavior, error contract, identical output file contract)

## Impact

- **Code**: `skill/openspec-auto/scripts/init.ts` — flag parsing + branch at top of `main()`
- **Tests**: `init.ts` currently has no tests; the non-interactive path enables end-to-end testing without a TTY
- **Dependencies**: `@inquirer/prompts` stays as `devDependency` (interactive path remains)
- **Spec**: `openspec/changes/openspec-auto/specs/config-and-init/spec.md` needs delta requirements for the non-interactive path
