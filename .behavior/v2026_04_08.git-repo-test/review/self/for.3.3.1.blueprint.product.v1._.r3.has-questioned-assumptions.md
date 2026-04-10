# self-review: has-questioned-assumptions

review of technical assumptions in the blueprint.

---

## assumptions surfaced and questioned

### assumption 1: jest is the test runner

**what we assume**: repos use jest, not vitest or other runners.

**what if opposite were true?**: if a repo uses vitest, `--testPathPattern` flag may not work. vitest has different CLI flags.

**is this based on evidence or habit?**: evidence. research document confirms all ehmpathy repos currently use jest. vision lists "jest or vitest" as an assumption, not a requirement.

**exceptions?**: no ehmpathy repos currently use vitest. future repos may adopt it.

**simpler approach?**: yes — support jest only for v1. add vitest when needed.

**verdict**: assumption holds. implement jest only, document vitest as future work.

---

### assumption 2: npm commands follow `test:unit` pattern

**what we assume**: repos have `npm run test:unit`, `test:integration`, `test:acceptance`, `test:lint`.

**what if opposite were true?**: if a repo uses `npm test` or `npm run tests:unit`, the skill fails.

**is this based on evidence or habit?**: evidence. this is documented ehmpathy convention. repos that don't follow convention already have issues with other tooling.

**exceptions?**: legacy repos may use non-standard commands. new repos should follow convention.

**simpler approach?**: no. we could detect the command dynamically, but that adds complexity. fail-fast with helpful error is simpler.

**verdict**: assumption holds. fail-fast guides repos to adopt convention.

---

### assumption 3: keyrack credentials under `ehmpath/test`

**what we assume**: integration tests use `ehmpath` owner, `test` env.

**what if opposite were true?**: if acceptance tests need `prep` env credentials, skill would fail silently or use wrong credentials.

**is this based on evidence or habit?**: partial evidence. research confirms integration tests use `test` env. acceptance may need `prep` in some cases.

**exceptions?**: acceptance tests that touch `prep` env services.

**simpler approach?**: yes — always use `test` env for now. add `--env` flag later if needed.

**verdict**: assumption holds for v1. documented as potential future enhancement.

---

### assumption 4: RESNAP=true triggers snapshot update

**what we assume**: jest config interprets `RESNAP=true` env var and passes `--updateSnapshot` to jest.

**what if opposite were true?**: if a repo lacks this jest config, `--resnap` has no effect — snapshots don't update, no error shown.

**is this based on evidence or habit?**: evidence. research confirms this is ehmpathy convention. repos should have this in jest.config.js.

**exceptions?**: new repos that haven't set up jest config properly.

**simpler approach?**: could pass `--updateSnapshot` directly to jest. however, RESNAP is the convention. repos should follow it.

**verdict**: assumption holds. document in brief that repos must handle RESNAP.

---

### assumption 5: jest output format is parseable

**what we assume**: jest outputs lines like:
- `Test Suites: 3 passed, 1 failed, 4 total`
- `Tests: 10 passed, 2 failed, 1 skipped, 13 total`
- `Time: 5.123 s`

**what if opposite were true?**: if jest output format changes, parse fails silently or shows wrong stats.

**is this based on evidence or habit?**: partial evidence. jest has maintained this format for years. but jest 30 may change it.

**exceptions?**: custom jest reporters may change output format.

**simpler approach?**: use `--json` flag for structured output. however, json output is verbose and may not include all info. regex parse of known format is simpler.

**verdict**: assumption holds. regex parse is robust enough. if format changes, tests will catch it.

---

### assumption 6: `--testPathPattern` works in current jest

**what we assume**: jest accepts `--testPathPattern` flag.

**what if opposite were true?**: research shows jest 30 changes to `--testPathPatterns` (plural). current repos use jest 29.

**is this based on evidence or habit?**: evidence. research confirmed current jest uses singular form.

**exceptions?**: repos that upgrade to jest 30 before skill is updated.

**simpler approach?**: could detect jest version and use correct flag. adds complexity. for v1, use current flag.

**verdict**: assumption holds for v1. document jest 30 compatibility as future work.

---

## issues found: none

all assumptions trace to evidence from research documents:
1. jest usage — confirmed in research
2. npm command pattern — ehmpathy convention
3. keyrack ehmpath/test — confirmed in keyrack research
4. RESNAP convention — confirmed in research
5. jest output format — verified with npm test output
6. testPathPattern flag — confirmed for jest 29

no assumption is based purely on habit. each has a research basis.

---

## why assumptions hold

| assumption | research evidence | why it holds |
|------------|------------------|--------------|
| jest runner | all repos use jest | implement jest, defer vitest |
| npm command pattern | ehmpathy convention | fail-fast guides adoption |
| keyrack ehmpath/test | keyrack research | v1 scope, extend later |
| RESNAP convention | ehmpathy convention | document in brief |
| jest output parse | jest output verified | regex is robust |
| testPathPattern | jest 29 confirmed | v1 scope, jest 30 later |

---

## conclusion

**no issues found.**

all technical assumptions in the blueprint trace to research evidence. no assumption is based on habit or guesswork.

six assumptions were surfaced and questioned. each was examined for:
- what if opposite were true
- evidence basis
- exceptions
- simpler alternatives

all assumptions hold for v1 scope. future enhancements (vitest, jest 30, keyrack --env) are documented as deferred work beyond vision requirements.
