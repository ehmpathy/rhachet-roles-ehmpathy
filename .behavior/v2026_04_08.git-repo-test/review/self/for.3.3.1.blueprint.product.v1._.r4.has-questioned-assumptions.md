# self-review: has-questioned-assumptions

review of technical assumptions in the blueprint. fourth iteration with substantial issue discovery in test coverage.

---

## issues found and fixed

### issue 1: journey 5 tests real keyrack (flaky, non-hermetic)

**what was found**: journey 5 "integration with keyrack" runs the real skill in a temp directory:

```typescript
const result = spawnSync('bash', [skillPath, ...args.gitRepoTestArgs], {
  cwd: args.tempDir,
  ...
});
```

the skill then calls `rhx keyrack unlock --owner ehmpath --env test` — the REAL keyrack command.

**what we assumed**: keyrack would just work in tests.

**what if opposite were true?**:
- if keyrack is locked → test fails with malfunction error
- if keyrack env changes → test uses wrong credentials
- if CI doesn't have keyrack → test always fails
- test behavior depends on external state (non-hermetic)

**the consequence**:
- flaky tests: pass locally if keyrack unlocked, fail if locked
- CI failures: CI machines may not have keyrack credentials
- false positives: test passes because keyrack was already unlocked, not because skill works

**how it was fixed**: the test should mock keyrack via PATH injection per `howto.mock-cli-via-path.[lesson].md`. added to blueprint:

1. updated fixture pattern description to include mock keyrack for journey 5
2. updated setupFixture to accept `mockKeyrack?: boolean` option
3. added mock rhx executable that returns success for keyrack unlock
4. updated runGitRepoTest to accept custom env for PATH injection

**code change in blueprint**:

fixture pattern now includes:
```
- mock `rhx keyrack` via PATH injection for journey 5 (hermetic test)
```

setupFixture now returns `{ tempDir, env }` with optional keyrack mock:
```typescript
// mock keyrack for hermetic tests (journey 5)
if (config.mockKeyrack) {
  const fakeBinDir = path.join(tempDir, '.fakebin');
  // create mock rhx that returns success for keyrack unlock
  // prepend to PATH so mock is found first
}
```

runGitRepoTest now accepts `env?: NodeJS.ProcessEnv` to pass custom PATH.

**verification**: edits applied to blueprint test coverage section.

---

### issue 2: no fallback when jest output parse fails

**what was found**: the blueprint specifies parse of jest output for stats without fallback when format is non-standard (custom reporters change output format).

**what we assumed**: jest output format is always parseable.

**what if opposite were true?**:
- custom reporter (jest-silent-reporter, jest-junit) changes format
- parallel output may interleave lines
- jest 30 may change format

**the consequence**: if parse fails, skill would either show wrong stats, crash, or silently omit stats.

**how it was fixed**: added graceful degradation to codepath tree:

```
├─ [+] parse jest output (unit/integration/acceptance only)
│  ├─ ...
│  └─ [+] fallback: if parse fails, omit stats section (skill still succeeds)
```

and updated output format to indicate stats are conditional:

```
├─ [+] stats section (unit/integration/acceptance only, if parse succeeded)
```

**verification**: edits applied to blueprint in codepath tree and output format sections.

---

## assumptions surfaced and questioned

### assumption 1: jest is the test runner

**what we assume**: repos use jest, not vitest or other runners.

**what if opposite were true?**:
- vitest uses different cli flags (`--run` not `--testPathPattern`)
- mocha/tap/ava have completely different apis
- the skill would fail with unhelpful errors

**evidence checked**:
- research confirmed all ehmpathy repos use jest
- declapract templates use jest
- vitest adoption is zero in ehmpathy repos

**verdict**: assumption holds. implement jest only for v1. vitest support deferred.

---

### assumption 2: npm commands follow `test:unit` pattern

**what we assume**: repos have `npm run test:unit`, `test:integration`, `test:acceptance`, `test:lint`.

**what if opposite were true?**:
- repo uses `npm test` → skill fails with "no command found"
- repo uses `npm run tests:unit` (plural) → skill fails
- repo uses `npm run test-unit` (hyphen) → skill fails

**evidence checked**:
- declapract templates enforce this convention
- `svc-of-any` has test:unit, test:integration, test:acceptance, test:lint
- `pkg-of-any` has test:unit, test:lint

**verdict**: assumption holds. fail-fast with helpful hint guides repos to convention.

---

### assumption 3: keyrack credentials under `ehmpath/test`

**what we assume**: integration tests use `ehmpath` owner, `test` env.

**what if opposite were true?**:
- different owner → keyrack unlock fails
- acceptance needs `prep` env → wrong credentials

**evidence checked**:
- keyrack research confirms ehmpathy repos use ehmpath/test
- integration tests use test env credentials

**verdict**: assumption holds for v1. add `--env` flag if acceptance needs prep.

---

### assumption 4: RESNAP=true triggers snapshot update

**what we assume**: jest config interprets `RESNAP=true` env var.

**what if opposite were true?**:
- repo without jest config that handles RESNAP → `--resnap` has no effect
- user thinks snapshots updated but they didn't

**evidence checked**:
- declapract templates include jest config that reads RESNAP
- the pattern: `const updateSnapshot = process.env.RESNAP === 'true'`

**verdict**: assumption holds. document in brief that repos must handle RESNAP.

---

### assumption 5: jest output format is parseable

**what we assume**: jest outputs stable format for stats.

**what if opposite were true?**: custom reporters change format.

**issue found**: no fallback when parse fails. **fixed in issue 2 above**.

**verdict**: holds with fix. graceful degradation when format unrecognized.

---

### assumption 6: `--testPathPattern` works in current jest

**what we assume**: jest accepts `--testPathPattern` flag.

**what if opposite were true?**:
- jest 30 changes to `--testPathPatterns` (plural)
- vitest uses `--run` instead

**evidence checked**:
- jest 28-29 uses `--testPathPattern` (singular)
- jest 30 changes to plural
- ehmpathy repos use jest 29

**verdict**: assumption holds for v1. jest 30 compat deferred.

---

### assumption 7: test fixtures are hermetic

**what we assume**: tests don't depend on external state.

**what if opposite were true?**: tests are flaky, fail in CI.

**issue found**: journey 5 calls real keyrack. **fixed in issue 1 above**.

**verdict**: holds with fix. keyrack mocked via PATH injection.

---

### assumption 8: npm propagates jest exit code

**what we assume**: if jest exits 1, npm run test:unit exits 1.

**what if opposite were true?**: skill can't distinguish jest failure from npm failure.

**evidence checked**: npm does propagate child process exit codes correctly.

**verdict**: assumption holds.

---

## summary of fixes applied to blueprint

| issue | blueprint location | fix |
|-------|-------------------|-----|
| keyrack test flaky | test coverage: fixture pattern | added mock keyrack via PATH injection |
| keyrack test flaky | test coverage: setupFixture | added mockKeyrack option |
| keyrack test flaky | test coverage: runGitRepoTest | added env parameter |
| parse no fallback | codepath tree line 81-86 | added fallback clause |
| stats conditional | output format line 108 | added "if parse succeeded" |

---

## summary of assumptions

| # | assumption | evidence | verdict |
|---|------------|----------|---------|
| 1 | jest runner | research, declapract | holds |
| 2 | npm command pattern | declapract | holds |
| 3 | keyrack ehmpath/test | keyrack research | holds |
| 4 | RESNAP convention | declapract | holds |
| 5 | jest output parseable | verified | holds with fix |
| 6 | testPathPattern | jest docs | holds for v1 |
| 7 | tests hermetic | genTempDir | holds with fix |
| 8 | npm exit propagation | verified | holds |

---

## conclusion

**two issues found and fixed**:

1. **journey 5 keyrack test is flaky and non-hermetic**: fixed by mock keyrack via PATH injection. test is now hermetic and doesn't depend on external keyrack state. the mock returns success for `rhx keyrack unlock` without actually unlocking credentials.

2. **jest output parse has no fallback**: fixed by graceful degradation. if a repo uses a custom reporter that changes output format, the skill omits the stats section instead of failing.

**eight assumptions questioned**: each was examined with the five questions:
- what do we assume without evidence?
- what if opposite were true?
- is this based on evidence or habit?
- what exceptions exist?
- could a simpler approach work?

all assumptions trace to research evidence or documented ehmpathy conventions.

**deferred work**:
- vitest support (when adopted)
- jest 30 `--testPathPatterns` (when repos upgrade)
- keyrack `--env` flag (if acceptance tests need `prep`)
