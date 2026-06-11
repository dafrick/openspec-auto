## Why

The initial openspec-auto skill files reimplement logic already provided by superpowers and opsx skills — the implement sub-agent describes its own TDD loop, CI monitoring, and task-tracking that `opsx:apply` and `superpowers:subagent-driven-development` already handle; the review sub-agent reinvents review mechanics covered by `superpowers:requesting-code-review`. This creates maintenance duplication and makes skills larger than they need to be.

## What Changes

- `skill/openspec-auto-implement/SKILL.md`: Replace the self-described TDD + task loop with a delegation to `opsx:apply`; keep only the CI monitoring and CI-BLOCKED handling that is unique to this skill
- `skill/openspec-auto-review/SKILL.md`: Replace the self-described review mechanics with a delegation to `superpowers:requesting-code-review`; keep only the finding-categorization rules (in-scope / out-of-scope / unclear) that are unique to this skill
- `skill/openspec-auto/SKILL.md`: Add model selection guidance per sub-agent invocation; add `superpowers:finishing-a-development-branch` to Phase 7 (Wrap-up) before `opsx:archive`; add an Integration section
- `skill/openspec-auto-triage/SKILL.md`: Add model selection hint (haiku); add `NEEDS_CONTEXT` status for when issue data cannot be fetched; add Integration section
- `skill/openspec-auto-explore/SKILL.md`: Add model selection hint (sonnet); add Integration section

## Capabilities

### New Capabilities

- `skill-delegation`: Rules for how openspec-auto skills delegate to superpowers and opsx skills — which skills handle which concerns, what the openspec-auto layer adds on top, and the model selection convention per sub-agent role

### Modified Capabilities

## Impact

- All five skill files in `skill/` are modified (content only, no renames)
- No TypeScript scripts are changed
- No OpenSpec specs or schema files are changed
- Install path and skill names are unchanged
