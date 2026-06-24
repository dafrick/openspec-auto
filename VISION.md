# Vision

## Table of Contents

1. [Mission](#mission)
2. [Audience](#audience)
3. [North Star](#north-star)
4. [Design Principles](#design-principles)
5. [Scope](#scope)
6. [Future Direction](#future-direction)

---

## Mission

openspec-auto is an autonomous issue lifecycle agent. It takes an open issue and, without a human in the loop, produces a mergeable change backed by a proposal, spec, and implementation plan. Every change follows a spec-driven workflow from start to finish.

openspec-auto is platform- and framework-agnostic: it adapts to whatever issue tracker (GitHub, GitLab, Jira), version control platform, and spec-driven tools are available in the environment — OpenSpec, superpowers, or built-in Claude skills — and requires that at least one spec framework is present. It is not a competitor to any of them; it is the automation layer that runs on top.

---

## Audience

**Primary:** Small teams and solo developers using an issue tracker as an internal workflow who want autonomous issue resolution without being the bottleneck on every fix.

**Secondary:** Open source maintainers who want eligible issues handled end-to-end with human review as the final gate.

**Not the target:** Projects where the primary concern is bad-actor management, spam filtering, or issue queue hygiene at scale. Also not suitable for repos without a test suite and CI — openspec-auto follows TDD and requires a codebase where tests can be written and run.

---

## North Star

Issues become high-quality, mergeable changes with minimal maintainer intervention.

A good run produces a change the maintainer can merge as-is. A still-good run produces a rejected change with a clear reason attached — the issue is annotated, re-queued, and the next run produces a better proposal. Rejection is not failure; an annotated rejection that improves the next attempt is the system working correctly.

When an issue is genuinely ambiguous, the agent asks blocking questions rather than guessing. Ambiguity surfaces early — in Explore — not late in a failed implementation.

---

## Design Principles

**We optimize for:**

- **Loop quality over throughput** — a well-reasoned proposal and spec beats a fast but shallow one
- **Spec-driven change management at every phase** — no code before a proposal and plan exist
- **Test-driven implementation** — the target repo must have good test infrastructure and hygiene; TDD is the implementation discipline, not an option
- **Adaptive capability detection** — use what the environment provides; never hard-require a specific framework
- **Resumability** — agent state survives context resets; every phase is re-entrant
- **Transparency** — machine-parseable state, proof of verification at handoff, human-reviewable at every phase

**We do not optimize for:**

- **Triage sophistication** — we filter obvious non-issues; refinement of unclear requirements is Explore's job
- **Bad-actor or spam management** — we assume good-faith input
- **Extending the human review step** — that gate exists and is sufficient; we don't build on it
- **Auto-merge** — human review is always the final step
- **Tight coupling to any platform or spec framework**

---

## Scope

**In scope**

- Full issue lifecycle: triage → explore → propose → implement → review → wrap-up
- Spec-agnostic: adapts to OpenSpec, superpowers, or built-in Claude skills; requires at least one
- Platform-agnostic implementation discipline: GitHub now; GitLab, Jira, and Bitbucket as the direction of travel
- Resumable, machine-parseable agent state that survives context resets
- Iterative rejection cycles — rejected changes re-enter the loop with richer context
- Blocking questions to surface ambiguity early rather than fail late

**Less important (not a current priority)**

- Author trust scoring and bad-actor filtering
- Active issue queue management (bulk defer, close, or label automation)
- Extending or replacing the human review step

**Out of scope**

- Auto-merge — human review is always the final gate
- Issue creation and project management (openspec-auto resolves issues; it does not create them)
- Repository setup or scaffolding from scratch
- Dependency management, security patching, or bot-style automation unconnected to discrete issues
- Code review assistance for manually-written PRs not produced by the agent

---

## Future Direction

The current implementation is GitHub- and OpenSpec-specific. The direction of travel is a spec-agnostic, platform-agnostic autonomous change agent that installs on top of whatever workflow the team already has.

The more interesting frontier is the quality of the explore → propose → spec loop itself. Some directions worth pursuing:

- **Fail fast** — ship a minimal implementation quickly and develop mechanisms to assess how the change performs in practice; iterate based on real outcomes rather than investing more upfront time trying to perfect the proposal
- **Deeper research** — Explore draws on related PRs, commits, linked issues, and external sources to produce richer discovery output before proposing
- **Subagent panels** — multiple independent subagents evaluate a proposal from different angles (implementer, skeptic, reviewer) before it is committed, surfacing weak assumptions early
- **Spec quality gate** — score a proposal and spec for completeness, internal consistency, and testability before implementation begins; block on low-confidence specs rather than discovering problems in CI
- **Rejection learning** — when a change is rejected, a dedicated subagent analyses the feedback, identifies what the proposal missed, and enriches the issue before re-queuing — making each cycle meaningfully better than the last
