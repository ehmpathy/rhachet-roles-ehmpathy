# self-review: has-role-standards-adherance

review for adherance to mechanic role standards.

---

## relevant briefs directories

| directory | relevance to blueprint |
|-----------|----------------------|
| `briefs/practices/code.prod/` | skill implementation patterns |
| `briefs/practices/code.test/` | test patterns and fixtures |
| `briefs/practices/lang.terms/` | term conventions |
| `briefs/practices/lang.tones/` | output format and vibes |
| `briefs/practices/work.flow/` | skill invocation patterns |

### directory coverage verification

i enumerated the briefs directories to ensure i haven't missed any relevant categories:

| directory | checked | why relevant or not |
|-----------|---------|-------------------|
| code.prod/pitofsuccess.errors | yes | exit codes, failfast, failloud |
| code.prod/evolvable.procedures | yes | idempotent, input-context pattern |
| code.prod/readable.narrative | yes | code structure patterns |
| code.test/frames.behavior | yes | given-when-then, snapshots |
| code.test/lessons.howto | yes | mock-cli-via-path |
| lang.terms | yes | treestruct, gerunds |
| lang.tones | yes | turtle vibes, lowercase |
| work.flow/tools | yes | keyrack, skills |
| work.flow/diagnose | no | not applicable to skill authorship |
| work.flow/release | no | not applicable to skill authorship |

**no category missed.**

---

## standards check: code.prod

### rule.require.exit-code-semantics

**standard**: 0=success, 1=malfunction, 2=constraint

**blueprint adherance**:
- exit 0 on tests pass
- exit 1 on keyrack failure (malfunction)
- exit 2 on tests fail, no tests matched, absent command (constraint)

**why this adherance matters**:

exit 1 vs 2 tells caller whether to retry (malfunction) or fix (constraint). the blueprint correctly uses:
- exit 1 for keyrack failure — infrastructure issue, might be transient
- exit 2 for test failure — clone must fix code
- exit 2 for no tests matched — clone must fix scope pattern
- exit 2 for absent command — clone must add npm command

**no violation found.**

---

### rule.require.failfast

**standard**: fail early with helpful errors

**blueprint adherance**:
- validate npm command exists before test run
- detect no-tests-matched after run
- exit 2 with helpful hints for both

**why this adherance matters**:

fail-fast prevents wasted time. a deviation would run tests blindly, then fail with cryptic jest error. the blueprint validates first, fails with actionable hints.

**no violation found.**

---

### rule.require.idempotent-procedures

**standard**: procedures should be safe to run multiple times

**blueprint adherance**:
- keyrack unlock is idempotent (rhx keyrack handles)
- log file uses isotime (no overwrite conflict)
- test run is idempotent (no state mutation)

**why this adherance matters**:

clone might run `rhx git.repo.test` multiple times on same code. the skill must not corrupt state or produce different results. the blueprint uses:
- keyrack: already handles idempotent unlock
- logs: isotime prevents filename collision
- tests: jest runs are inherently idempotent

**no violation found.**

---

## standards check: code.test

### rule.require.given-when-then

**standard**: tests use `given`, `when`, `then` from test-fns

**blueprint adherance**:

test coverage section shows structure:
```typescript
given('[case1] scenario description', () => {
  when('[t0] action description', () => {
    then('expected outcome', () => {
```

**why this adherance matters**:

bdd structure makes tests readable and maps to criteria usecases. the blueprint test structure matches the pattern exactly: given sets scenario, when triggers action, then asserts outcome.

**what a violation would look like**:
```typescript
// 👎 violation: raw jest describe/it without bdd structure
describe('git.repo.test', () => {
  it('should pass unit tests', () => {
    // no given/when/then
  });
});
```

the blueprint explicitly uses given/when/then with case labels ([case1], [t0]).

**no violation found.**

---

### rule.require.snapshots

**standard**: output artifacts should use snapshots for vibecheck

**blueprint adherance**:

test coverage section states:
```
all journeys include expect(...).toMatchSnapshot() for stdout/stderr with sanitized timestamps and paths.
```

**why this adherance matters**:

snapshots enable visual diff review in PRs. if output format changes unexpectedly, snapshot diff surfaces it. the blueprint explicitly calls for snapshots with sanitization (timestamps, paths) for stability.

**no violation found.**

---

### howto.mock-cli-via-path

**standard**: mock external CLI tools via PATH injection for hermetic tests

**blueprint adherance**:

fixture pattern shows:
```typescript
if (config.mockKeyrack) {
  const fakeBinDir = path.join(tempDir, '.fakebin');
  // ... mock rhx keyrack
  env = { ...env, PATH: `${fakeBinDir}:${process.env.PATH}` };
}
```

**why this adherance matters**:

journey test 5 (integration with keyrack) needs to be hermetic — it shouldn't require real keyrack credentials. the blueprint uses PATH injection to mock `rhx keyrack`, following the established pattern.

**no violation found.**

---

## standards check: lang.terms

### rule.require.treestruct

**standard**: [verb][...noun] for mechanisms

**blueprint adherance**:
- `git.repo.test` — verb-dot-noun pattern
- journey names: "unit tests pass", "scoped tests" — clear verb-noun

**why this adherance matters**:

tree-sorted navigation enables finding skills by domain. `git.repo.test` sits with other `git.*` skills. the name follows convention.

**no violation found.**

---

### rule.forbid.gerunds

**standard**: no -ing forms as nouns

**blueprint adherance**:

reviewed blueprint text for gerunds:
- "no-tests-matched" — acceptable compound, describes a detection result
- codepath text uses verbs and nouns appropriately

**why this adherance matters**:

gerunds obscure whether something is a verb or noun. the blueprint uses "detect no-tests-matched" (verb + compound-noun) rather than "detecting" or "matching".

**no violation found.**

---

## standards check: lang.tones

### rule.require.treestruct-output

**standard**: turtle vibes output format with 🐢, 🐚, ├─, └─

**blueprint adherance**:

output format section shows:
```
├─ [○] turtle header (cowabunga!/bummer dude...)
├─ [○] shell line with skill and args
├─ [+] stats section
│  ├─ suites: N files
│  ├─ tests: X passed, Y failed, Z skipped
│  └─ time: X.Xs
├─ [○] log section
│  ├─ stdout path
│  └─ stderr path
```

**why this adherance matters**:

consistent output format across mechanic skills enables clone to parse and recognize patterns. the blueprint uses exact turtle vibes vocabulary:
- 🐢 cowabunga! / bummer dude...
- 🐚 git.repo.test --what unit
- ├─ └─ tree structure

**what a violation would look like**:
```
# 👎 violation: plain text output without turtle vibes
Tests passed!
Suites: 3
Tests: 12 passed
Time: 2.4s
Log: .log/...
```

the blueprint explicitly uses turtle header, shell root, and tree branches. it marks extant output functions as `[○]` to reuse, not reinvent.

**no violation found.**

---

### im_an.ehmpathy_seaturtle

**standard**: chill vibes, turtle personality

**blueprint adherance**:

brief deliverable shows hints and tips in chill style:
- "tip: Read the log for full test output"
- helpful hints on constraint errors

**why this adherance matters**:

seaturtle personality creates friendly error messages. instead of "ERROR: no tests matched", the clone sees "bummer dude... no tests matched scope" with a helpful hint.

**no violation found.**

---

## standards check: work.flow

### howto.keyrack

**standard**: use `rhx keyrack unlock --owner ehmpath --env test`

**blueprint adherance**:

codepath shows:
```
├─ run: rhx keyrack unlock --owner ehmpath --env test
```

**why this adherance matters**:

exact command matches documented pattern. a deviation would use wrong owner (personal keyrack) or wrong env (prod credentials). the blueprint uses ehmpath/test as documented.

**no violation found.**

---

### rule.require.test-covered-repairs

**standard**: every defect fix needs a test

**blueprint adherance**:

9 journey tests cover all criteria usecases. each usecase has corresponding test coverage.

**why this adherance matters**:

if a future change breaks scope translation, journey test 3 catches it. if keyrack unlock breaks, journey test 5 catches it. the test coverage ensures regressions are detected.

**no violation found.**

---

## violations found

none.

---

## conclusion

**blueprint adheres to mechanic role standards.**

### standards verified

| category | standards checked | violations |
|----------|------------------|------------|
| code.prod | exit-code-semantics, failfast, idempotent | 0 |
| code.test | given-when-then, snapshots, mock-cli-via-path | 0 |
| lang.terms | treestruct, forbid.gerunds | 0 |
| lang.tones | treestruct-output, seaturtle vibes | 0 |
| work.flow | keyrack, test-covered-repairs | 0 |

### why adherance holds

the blueprint was written with mechanic role standards in mind:

| standard | how blueprint satisfies | what junior might have done wrong |
|----------|------------------------|-----------------------------------|
| exit codes | 0/1/2 semantics | use exit 1 for all errors |
| fail-fast | validate npm command first | let jest fail with cryptic error |
| idempotent | isotime logs, keyrack idempotent | overwrite log files |
| given-when-then | explicit bdd structure | raw describe/it |
| snapshots | sanitized snapshot assertion | no snapshots, manual assertions |
| path injection | mock keyrack via PATH | require real credentials |
| turtle vibes | 🐢 🐚 ├─ └─ | plain text output |
| keyrack pattern | exact `rhx keyrack unlock --owner ehmpath --env test` | wrong owner or env |

### what i checked in detail

1. **read the blueprint codepath tree** — verified each section follows mechanic patterns
2. **read the test structure** — verified bdd, snapshots, fixtures use correct patterns
3. **read the brief deliverable** — verified hints use seaturtle voice
4. **enumerated briefs directories** — confirmed no category missed
5. **looked for potential violations** — none found

**no violations found.**

