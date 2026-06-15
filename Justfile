# Core linters (blocking CI)

typecheck:
    cd skill/openspec-auto && npx tsc --noEmit

lint-scripts:
    cd skill/openspec-auto && npx biome check .

lint-md:
    npx markdownlint-cli2 "skill/**/*.md" "!skill/**/node_modules/**"

lint: typecheck lint-scripts lint-md

# Experimental skill linters (non-blocking CI)

lint-quick-validate:
    python3 -c "import urllib.request, os, sys; \
        url='https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/scripts/quick_validate.py'; \
        exec(urllib.request.urlopen(url).read().decode())" skill/openspec-auto

lint-skill-lint:
    npx -y himself65/skill-lint skill/openspec-auto

lint-agent-skills-lint:
    npx -y @swarmclawai/agent-skills-lint lint skill/openspec-auto

lint-skill-check:
    npx -y skill-check skill/openspec-auto

lint-agent-skill-linter:
    npx -y agent-skill-linter skill/openspec-auto

lint-pulser:
    npx -y pulser-cli skill/openspec-auto

lint-cclint:
    cclint skill/openspec-auto

lint-agnix:
    npx -y agnix skill/openspec-auto

lint-skillscan:
    docker run --rm -v "$(pwd)/skill/openspec-auto:/skill" kurtpayne/skillscan-lint /skill

lint-skill-validator:
    skill-validator skill/openspec-auto

lint-experimental: lint-quick-validate lint-skill-lint lint-agent-skills-lint lint-skill-check lint-agent-skill-linter lint-pulser lint-cclint lint-agnix lint-skillscan lint-skill-validator
