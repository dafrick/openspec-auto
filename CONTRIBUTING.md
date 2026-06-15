# Contributing

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 24 | [nodejs.org](https://nodejs.org) or [fnm](https://github.com/Schniz/fnm) |
| just | any | `brew install just` / `apt install just` / [just.systems](https://just.systems/man/en/packages.html) |
| Go | any | [go.dev](https://go.dev/dl/) — required for `lint-cclint` and `lint-skill-validator` only |
| Python 3 | any | [python.org](https://python.org) — required for `lint-quick-validate` and `lint-skillscan` only |

> **Devcontainer:** If you use VS Code Dev Containers or GitHub Codespaces, all prerequisites are installed automatically. Open the repo in a container and skip to [Running checks](#running-checks).

## Setup

```bash
git clone https://github.com/dafrick/openspec-auto.git
cd openspec-auto
npm install
cd skill/openspec-auto && npm install && cd ../..
```

## Running checks

### Core linters (same as required CI jobs)

```bash
just lint          # run all three core linters
just typecheck     # TypeScript type checking
just lint-scripts  # Biome formatting + lint
just lint-md       # Markdown structure
```

### Experimental skill linters

```bash
just lint-experimental        # run all 10 experimental linters in sequence
just lint-skill-check         # individual linter (example)
just lint-agnix               # individual linter (example)
```

Each `just <target>` name matches its GitHub Actions job name exactly — if a CI job fails, run the same target locally to reproduce it.
