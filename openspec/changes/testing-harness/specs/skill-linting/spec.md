## ADDED Requirements

### Requirement: Experimental skill linter CI jobs
The CI pipeline SHALL run each of the following skill-specific linters as an individual, non-blocking job that always exits 0 from the workflow's perspective, posting results as job annotations.

Linters included in CI:
- `anthropics/skills quick_validate.py` (Python) — official Anthropic baseline validation
- `swarmclawai/agent-skills-lint` (npm) — cross-agent schema validation
- `TheStack-ai/pulser` (npm) — 8 best-practice rules, description quality scoring
- `dotcommander/cclint` (Go) — Claude Code config validator
- `agent-sh/agnix` (npm) — 423-rule validator for SKILL.md, CLAUDE.md, hooks, MCP
- `kurtpayne/skillscan-lint` (Python) — readability, clarity, graph integrity

Linters available locally (Justfile target only, excluded from CI):
- `himself65/skill-lint` (npm) — flags every `.ts` file as TOXIC due to a blanket "bundled script" rule with no allowlist; produces spurious TOXIC verdicts for skills that ship TypeScript tooling

Linters removed entirely:
- `thedavidas/skill-check` (npm) — security scan delegates to `mcp-scan`/`snyk-agent-scan`, a tool built for MCP server configs that returns `unknown target` against skill directories; category mismatch, not a tool failure
- `William-Yeh/agent-skill-linter` (npm) — returns HTTP 404 from the npm registry; package does not exist
#### Scenario: A skill linter reports violations
- **WHEN** an experimental skill linter finds issues in the skill files
- **THEN** the individual linter's CI job records the output as annotations but exits 0, not blocking the PR

#### Scenario: A skill linter exits non-zero
- **WHEN** an experimental skill linter itself fails (tool error, exit 1)
- **THEN** the CI job captures the error output but the workflow step is configured with `continue-on-error: true`, so the PR is not blocked

#### Scenario: All experimental linters pass
- **WHEN** all 6 experimental skill linters complete without findings
- **THEN** all experimental jobs exit 0 and show green

### Requirement: Individual job isolation
Each skill linter SHALL run as its own named GitHub Actions job so results are visible independently in the PR checks UI.

#### Scenario: One experimental linter fails, others pass
- **WHEN** one skill linter reports errors and the rest are clean
- **THEN** only that linter's job shows a warning annotation; other jobs remain green; the PR is not blocked
