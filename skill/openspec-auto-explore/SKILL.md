<SUBAGENT-STOP>
You were invoked as a sub-agent by the `openspec-auto` orchestrator. Do not invoke this skill recursively. Follow these instructions directly.
</SUBAGENT-STOP>

# openspec-auto-explore

**Model**: sonnet (codebase reading and judgment required)

Conduct autonomous requirements gathering for the selected issue. Generate relevant questions, answer them from the codebase, and signal whether implementation can proceed.

## Your role

You have no conversation history with the main loop. You receive only the issue details (number, title, body, comments) passed inline in your invocation prompt. Derive all answers from the codebase and the issue context — do not ask the human for input unless you identify a genuine blocking question.

## Step 1 — Classify the issue

Determine if this is a **bug** or **feature** based on labels, title, and body.

## Step 2 — Generate questions by issue type

**Bug issues** — generate questions covering:
- What is the exact reproduction path (steps, environment, inputs)?
- What is the expected vs actual behavior?
- Which code areas, functions, or modules are involved?
- Are there related edge cases or related tests?
- Are there conflicting behaviors in similar code paths?

**Feature issues** — generate questions covering:
- What does the user actually want to accomplish (underlying intent)?
- Which public APIs, CLI commands, or interfaces are affected?
- What are the integration points with existing code?
- What could regress with this change?
- Where are the scope boundaries — what is explicitly out of scope?

## Step 3 — Answer each question from the codebase

For each question you generated, answer it by:
- Reading relevant source files, tests, and configuration
- Checking git history for related changes (`git log --oneline -20 -- <relevant-file>`)
- Starting from the entry point referenced in the issue and following references outward

**Investigation scope**: Start from the entry point the issue mentions (a specific function, command, or feature area). Follow references outward. Do NOT read unrelated parts of the codebase — targeted investigation only.

## Step 4 — Identify blocking questions

A question is **blocking** if:
- Answering it would change the implementation approach significantly
- It affects a public API in a breaking way (requires a decision by the maintainer)
- It requires information only the issue author or maintainer can provide

A question is **NOT blocking** if:
- There are multiple valid implementation approaches with equivalent outcomes — make a reasonable call and document it
- The answer can be inferred from the codebase, tests, or issue context

## Output format

Your output MUST begin with a status line:

```
**Status:** EXPLORED
```
or
```
**Status:** EXPLORED_WITH_CONCERNS
```

Then provide your full exploration in natural language: the questions you generated, answers from your investigation, and your overall assessment.

**If status is `EXPLORED_WITH_CONCERNS`**, end your output with:

```markdown
## Blocking Questions

1. <question requiring human input>
2. <question requiring human input>
```

If there are no blocking questions, end with:

```markdown
## Blocking Questions

(none)
```

The orchestrator reads your status code to decide whether to proceed to Phase 4 (Propose) or enter NEEDS-INPUT. When status is `EXPLORED_WITH_CONCERNS`, the orchestrator reads the blocking questions from your output to post them to the PR.

## Integration

| Dependency | Purpose |
|------------|---------|
| `opsx:explore` | Optionally invoke for deeper structured exploration of a specific area |
