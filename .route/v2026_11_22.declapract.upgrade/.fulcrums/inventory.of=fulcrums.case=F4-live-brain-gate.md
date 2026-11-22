# F4 · live-brain-gate

## .the fork
- keep live-brain suites in the default globs and the acceptance keyrack `strict`: every host without a filled OPENROUTER key (and an unused github token) reads red
- gate the live-brain suites off the default globs (testMatch, with by-hand commands, as the repo already does for live-pr and live-registry suites) and source acceptance keyrack in the org default (`lenient`) mode

## .taken, why
gate. a test that needs a live-brain key is gated off by default so the keyless tiers run green on any host. `useKeyrack` itself defaults to `lenient` and forces `strict` only under declared aws auth; the template's explicit `strict` contradicted that for a repo with no aws account. `EHMPATHY_SEATURTLE_GITHUB_TOKEN` left `env.test`: no suite reads a real one (all pass fakes), and push/pr writes go `--auth as-human`.

gated: `imagineIsContentAdmissible`, `pressViaPipeline` (integration); `guardBorder.onWebfetch*` (acceptance, 4 files).

ci keeps them: `test:evaluation` runs exactly the gated suites, and the practice's `test-evaluation` job runs it (keyrack firewall supplies the key). so the gate moves them off the default tiers, not out of ci.

## .rework
clean: delete the testMatch entries; restore `mode: 'strict'` and the manifest line.

## .confidence
90%. two keyless cases ride along in a gated file (dream `v2026_11_22.fix.guardborder-acceptance-split-keyless-cases.md`).

## .where
`jest.integration.config.ts` · `jest.acceptance.config.ts` · `jest.acceptance.prepare.ts` · `.agent/keyrack.yml`

## .verdict
settled by driver, per the director's gate rule
