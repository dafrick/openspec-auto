## 1. Read and understand the current Bring-up section

- [ ] 1.1 Read `skill/openspec-auto/SKILL.md` and locate the **Bring-up** paragraph (search for "Bring-up")
- [ ] 1.2 Confirm the current wording: "If it's missing or invalid, stop and tell the user to run init."
- [ ] 1.3 Read `skill/openspec-auto/scripts/init.ts` lines 63–99 to confirm the `--yes` flag interface and non-zero exit behavior

## 2. Update the Bring-up section in SKILL.md

- [ ] 2.1 Replace the Bring-up sentence that tells the user to run init manually with the new auto-initialize flow: attempt `$OSL/node_modules/.bin/tsx $OSL/scripts/init.ts --yes`; on exit 0 re-read config and proceed; on non-zero surface the error and stop
- [ ] 2.2 Verify the updated prose uses the `OSL` variable convention already established in SKILL.md (consistent with the scripts table at line ~150)
- [ ] 2.3 Confirm the rest of the Bring-up paragraph is unchanged

## 3. Verify all four spec scenarios are satisfied by the prose

- [ ] 3.1 Trace through "Config absent, init succeeds" — confirm the prose routes to Triage after re-reading config
- [ ] 3.2 Trace through "Config invalid, init succeeds" — confirm same path (invalid = missing or malformed, both trigger init)
- [ ] 3.3 Trace through "Config absent, init fails" — confirm prose surfaces error and stops
- [ ] 3.4 Trace through "Config present and valid" — confirm prose reads config directly without running init

## 4. Commit the change

- [ ] 4.1 Stage `skill/openspec-auto/SKILL.md`
- [ ] 4.2 Commit with message `feat(skill): auto-initialize config on first run (#4)`
- [ ] 4.3 Push to the feature branch
