## ADDED Requirements

### Requirement: Dev container configuration
A `.devcontainer/devcontainer.json` SHALL exist using an off-the-shelf base image with no custom Dockerfile, installing all required runtimes and tools via Devcontainer Features and `postCreateCommand`.

#### Scenario: Opening the repo in a dev container
- **WHEN** a contributor opens the repo in VS Code Dev Containers or GitHub Codespaces
- **THEN** the container starts with Node 22, Go, Python 3, and `just` available without any manual installation steps

#### Scenario: npm dependencies installed automatically
- **WHEN** the dev container finishes creating
- **THEN** `postCreateCommand` has run `npm install` at root and `npm install` in `skill/openspec-auto/`, making all linters available

### Requirement: VS Code extension recommendations
The devcontainer configuration SHALL recommend the Biome and markdownlint VS Code extensions so contributors get editor-integrated feedback without manual extension discovery.

#### Scenario: Opening the dev container in VS Code
- **WHEN** a contributor opens the dev container in VS Code
- **THEN** VS Code prompts to install the Biome (`biomejs.biome`) and markdownlint (`DavidAnson.vscode-markdownlint`) extensions
