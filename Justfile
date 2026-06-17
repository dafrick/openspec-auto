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
    git clone --depth 1 https://github.com/anthropics/skills.git /tmp/anthropics-skills
    git -C /tmp/anthropics-skills checkout 57546260929473d4e0d1c1bb75297be2fdfa1949
    python3 /tmp/anthropics-skills/skills/skill-creator/scripts/quick_validate.py skill/openspec-auto

lint-skill-lint:
    npx -y skill-lint skill/openspec-auto

lint-agent-skills-lint:
    npx -y @swarmclawai/agent-skills-lint lint skill/openspec-auto

lint-skill-check:
    npx -y skill-check skill/openspec-auto

lint-agent-skill-linter:
    npx -y agent-skill-linter skill/openspec-auto

lint-pulser:
    npx -y pulser-cli skill/ --format json

lint-cclint:
    cclint skill/openspec-auto

lint-agnix:
    npx -y agnix skill/openspec-auto

lint-skillscan:
    pip3 install -q skillscan-lint && skillscan-lint scan skill/openspec-auto/SKILL.md

lint-experimental: lint-quick-validate lint-skill-lint lint-agent-skills-lint lint-skill-check lint-agent-skill-linter lint-pulser lint-cclint lint-agnix lint-skillscan
