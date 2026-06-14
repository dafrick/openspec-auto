## Why

When a user runs the `openspec-auto` skill on a repository that lacks a `.openspec-auto.json` config file, the Bring-up stage hard-stops and instructs the user to run `npx openspec-auto init` manually. This is unnecessary friction: the non-interactive `--yes` flag added to `init.ts` (as part of closing issue #2) already enables headless initialization, so the skill can detect a missing config and self-initialize rather than stopping the user cold.

## What Changes

- The **Bring-up** section of `skill/openspec-auto/SKILL.md` is updated so that, when `.openspec-auto.json` is absent or invalid, the skill automatically runs `init.ts --yes` before proceeding.
- If `init --yes` succeeds, Bring-up reads the newly created config and continues normally.
- If `init --yes` fails (e.g., no `gh` auth, not a GitHub repo), Bring-up surfaces the error and stops — giving the user actionable context.
- No changes to `init.ts`, `read-config.ts`, `config-types.ts`, or any sub-agent prompts.

## Capabilities

### New Capabilities

- `auto-initialize`: The Bring-up stage can self-initialize `.openspec-auto.json` non-interactively via `init --yes` when config is missing.

### Modified Capabilities

<!-- No existing spec-level behavior is changing. The change is confined to the operational prose in SKILL.md. -->

## Impact

- **`skill/openspec-auto/SKILL.md`** — Bring-up section prose updated (the only file that changes).
- **No runtime dependency changes** — `init.ts` and its `--yes` path already exist and are tested.
- **No breaking changes** — repositories that already have `.openspec-auto.json` are unaffected.
- **User experience** — first-time runs on unconfigured repos no longer require a manual detour; they complete end-to-end.
