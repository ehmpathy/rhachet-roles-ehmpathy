# self-review: has-role-standards-coverage

review for coverage of mechanic role standards.

---

## briefs directories enumeration

### directories to check

| directory | why relevant |
|-----------|--------------|
| code.prod/pitofsuccess.errors | error handlers, exit codes |
| code.prod/pitofsuccess.procedures | idempotency, immutability |
| code.prod/evolvable.procedures | input-context, dependency injection |
| code.prod/readable.narrative | code structure |
| code.prod/readable.comments | .what/.why headers |
| code.test/frames.behavior | given-when-then |
| code.test/scope.coverage | test coverage by grain |
| code.test/lessons.howto | fixtures, mocks |
| lang.terms | treestruct, gerunds, ubiqlang |
| lang.tones | turtle vibes, lowercase, seaturtle |
| work.flow/tools | keyrack, skills |

### coverage verification

i will verify each relevant standard is present in the blueprint.

---

## standards coverage: code.prod

### rule.require.exit-code-semantics

**should be present?**: yes — skill has multiple exit paths

**is it present?**: yes

blueprint codepath tree shows:
- exit 0 on pass
- exit 1 on keyrack failure
- exit 2 on test fail, no tests matched, absent command

**why it holds**: the blueprint explicitly assigns each exit path a semantic code. the codepath tree shows "exit 1 on failure with hint" for keyrack (malfunction = infrastructure), and "exit 2" for test failures and constraint errors (constraint = user must fix). this matches the 0/1/2 semantics from `rule.require.exit-code-semantics`.

**what would be absent**: a junior might use exit 1 for all errors, or not specify exit codes at all. the blueprint explicitly specifies exit codes for each path.

**verification done**: traced each exit path in codepath tree, confirmed semantic assignment.

---

### rule.require.failfast

**should be present?**: yes — skill validates input before expensive operations

**is it present?**: yes

blueprint codepath tree shows:
- validate npm command exists (before test run)
- detect no-tests-matched (after run, but fail-fast with hint)

**why it holds**: the blueprint validates BEFORE expensive operations. the "validate npm command exists" step comes BEFORE "run test command" in the codepath tree. this is the fail-fast pattern — check before you act.

**what would be absent**: a junior might run `npm run test:unit` directly and let npm fail with a cryptic "command not found" error. the blueprint validates first and emits a helpful hint.

**verification done**: checked codepath order — validation precedes execution.

---

### rule.require.failloud

**should be present?**: yes — errors need context for diagnosis

**is it present?**: yes

blueprint codepath tree shows:
- "exit 2 if absent with helpful hint"
- "exit 2 with scope hint"
- "exit 1 on failure with hint"

all error paths include hints.

**why it holds**: every error path in the blueprint includes "with hint" or "helpful hint". the word "hint" appears 4 times in the codepath tree, always attached to error exits. this is the failloud pattern — never emit a naked error.

**what would be absent**: a junior might just `exit 2` without any message, or emit "error: tests failed" without context about which scope pattern matched no tests. the blueprint requires hints on all error paths.

**verification done**: grep'd codepath for "exit" — all non-zero exits have associated hints.

---

### rule.require.idempotent-procedures

**should be present?**: yes — skill may be run multiple times

**is it present?**: yes

blueprint uses:
- isotime for log filenames (no collision)
- keyrack unlock is idempotent (rhx handles)
- test runs are stateless

**why it holds**: re-running `rhx git.repo.test --what unit` twice produces two separate log files (different isotime), does not corrupt state, and keyrack unlock is explicitly noted as idempotent. the blueprint uses isotime pattern from extant skill behavior — this is not new, but it IS covered.

**what would be absent**: a junior might use a fixed log filename (overwrite), or not consider that clone will rerun tests 5+ times. the blueprint uses isotime to ensure each run has its own log.

**verification done**: checked log filename pattern — uses "generate isotime filename" step.

---

### rule.require.input-context-pattern

**should be present?**: no — skill is bash, not typescript

**is it present?**: n/a

bash skills use positional args and env vars, not `(input, context)` pattern. this standard applies to typescript procedures.

**why this is acceptable**: different language, different patterns.

---

### rule.require.what-why-headers

**should be present?**: yes — brief deliverable needs headers

**is it present?**: yes

brief deliverable section shows:
```markdown
# howto: run tests with git.repo.test

## .what

use `rhx git.repo.test` to run tests...
```

the brief follows `.what` header convention.

**why it holds**: the blueprint's brief deliverable section explicitly shows `## .what` header. this matches the pattern from `rule.require.what-why-headers` which requires `.what` and `.why` headers on named procedures/briefs.

**what would be absent**: a junior might write a brief without any headers, or use "Usage:" instead of `.what`. the blueprint shows the exact header format.

**verification done**: read brief deliverable section — `.what` header present.

---

## standards coverage: code.test

### rule.require.given-when-then

**should be present?**: yes — tests must use bdd structure

**is it present?**: yes

blueprint test structure section shows explicit given/when/then with case labels:
```typescript
given('[case1] scenario description', () => {
  when('[t0] action description', () => {
    then('expected outcome', () => {
```

**why it holds**: the blueprint shows the exact import `import { given, when, then, useThen } from 'test-fns';` and the exact structure with `[case1]` and `[t0]` labels. this is not jest's `describe/it` — it's the bdd structure from `rule.require.given-when-then`.

**what would be absent**: a junior might use raw jest `describe('...', () => { it('...', () => { })})` without bdd structure. the blueprint explicitly uses given/when/then with case labels.

**verification done**: read test structure section — imports test-fns, uses given/when/then with labels.

---

### rule.require.snapshots

**should be present?**: yes — output format needs vibecheck

**is it present?**: yes

blueprint test coverage section states:
```
all journeys include expect(...).toMatchSnapshot() for stdout/stderr with sanitized timestamps and paths.
```

**why it holds**: the blueprint explicitly requires snapshots for ALL journeys, with sanitization for stability. this is the pattern from `rule.require.snapshots.[lesson].md` — use snapshots for output artifacts to enable vibecheck in PRs.

**what would be absent**: a junior might only assert on exit code, not snapshot the actual output. the blueprint explicitly requires `toMatchSnapshot()` on stdout/stderr.

**verification done**: read test coverage section — snapshots required with sanitization.

---

### rule.require.test-coverage-by-grain

**should be present?**: yes — skill is a communicator (i/o boundary)

**is it present?**: yes

blueprint specifies integration tests (`git.repo.test.play.integration.test.ts`), which is correct for a skill that:
- invokes external commands (npm, rhx keyrack)
- writes to filesystem (.log/)
- has side effects

**why it holds**: per `rule.require.test-coverage-by-grain`, communicators require integration tests. the blueprint file is `.integration.test.ts`, not `.test.ts`. this is correct grain for a bash skill that shells out to npm and writes to .log/.

**what would be absent**: a junior might write `.test.ts` (unit test) and mock everything. the blueprint correctly uses integration tests for this communicator grain.

**verification done**: checked test filename — `.integration.test.ts` suffix matches communicator grain.

---

### howto.mock-cli-via-path

**should be present?**: yes — keyrack must be mocked for hermetic tests

**is it present?**: yes

blueprint fixture pattern shows PATH injection:
```typescript
if (config.mockKeyrack) {
  const fakeBinDir = path.join(tempDir, '.fakebin');
  // ... mock rhx keyrack
  env = { ...env, PATH: `${fakeBinDir}:${process.env.PATH}` };
}
```

**why it holds**: journey 5 (integration with keyrack) needs hermetic tests. the blueprint uses the exact pattern from `howto.mock-cli-via-path.[lesson].md` — create a `.fakebin` directory, write a mock executable, prepend to PATH. this avoids real keyrack credentials in tests.

**what would be absent**: a junior might require real keyrack credentials for tests (non-hermetic), or use jest.mock (wrong pattern for cli). the blueprint uses PATH injection.

**verification done**: read fixture pattern — PATH injection with `.fakebin` directory.

---

## standards coverage: lang.terms

### rule.require.treestruct

**should be present?**: yes — skill name must follow pattern

**is it present?**: yes

skill name `git.repo.test` follows `<domain>.<action>` pattern. brief name `howto.run-tests.[lesson].md` follows `howto.<topic>.[lesson].md` pattern.

**why it holds**: the skill name `git.repo.test` sorts with other `git.*` skills in autocomplete. the brief name `howto.run-tests.[lesson].md` follows the `howto.<topic>.[lesson].md` pattern from other howto briefs. this enables tree-sorted navigation.

**what would be absent**: a junior might name it `testRunner.sh` or `run-tests.md` (flat names). the blueprint uses hierarchical dot-separated names.

**verification done**: checked skill and brief names in filediff tree — both follow treestruct patterns.

---

### rule.forbid.gerunds

**should be present?**: yes — blueprint text must avoid gerunds

**is it present?**: yes (verified in r11)

blueprint uses "detect no-tests-matched" not "detect" as verb with compound noun. codepath text uses verbs and nouns appropriately.

**why it holds**: r11 review verified no gerunds remain in the blueprint. the codepath tree uses action verbs ("validate", "parse", "detect", "emit") not gerunds. compound nouns like "no-tests-matched" are acceptable.

**what would be absent**: a junior might write "validating arguments" or "parsing output". the blueprint uses "validate arguments" and "parse jest output" (verb forms).

**verification done**: r11 review already verified gerund compliance.

---

## standards coverage: lang.tones

### rule.require.treestruct-output

**should be present?**: yes — skill output must use turtle vibes

**is it present?**: yes

blueprint output format section shows:
- 🐢 turtle header
- 🐚 shell root
- ├─ └─ tree structure
- nested stats section
- nested log section

**why it holds**: the blueprint output format section uses exact turtle vibes vocabulary: 🐢 for header, 🐚 for shell root, ├─ and └─ for tree branches. the stats and log sections are nested with tree structure. this matches `rule.require.treestruct-output` from the ergonomist briefs.

**what would be absent**: a junior might use plain text output ("Tests passed! Suites: 3, Tests: 12"). the blueprint uses structured turtle vibes output.

**verification done**: read output format section — all turtle vibes elements present.

---

### im_an.ehmpathy_seaturtle

**should be present?**: yes — error messages should be friendly

**is it present?**: yes

blueprint shows:
- "cowabunga!" on success
- "bummer dude..." on failure
- helpful tips in output

**why it holds**: the blueprint uses exact seaturtle phrases from `im_an.ehmpathy_seaturtle` — "cowabunga!" for success, "bummer dude..." for failure. the output format section marks `[○] turtle header (cowabunga!/bummer dude...)` showing these are extant, reused phrases.

**what would be absent**: a junior might use "SUCCESS" or "FAILED" (clinical). the blueprint uses chill seaturtle vibes.

**verification done**: read output format section — seaturtle phrases present.

---

## standards coverage: work.flow

### howto.keyrack

**should be present?**: yes — skill uses keyrack for integration tests

**is it present?**: yes

blueprint codepath shows exact command:
```
├─ run: rhx keyrack unlock --owner ehmpath --env test
```

**why it holds**: the blueprint uses the exact keyrack command from `howto.keyrack.[lesson].md` — `rhx keyrack unlock --owner ehmpath --env test`. the owner is `ehmpath` (not personal keyrack), the env is `test` (not `prod`). this is the documented pattern.

**what would be absent**: a junior might use wrong owner (personal keyrack → yubikey block), wrong env (prod credentials in tests), or forget keyrack entirely. the blueprint uses exact documented command.

**verification done**: read codepath — exact keyrack command matches howto brief.

---

## coverage gaps found

none.

---

## conclusion

**all relevant mechanic role standards covered.**

### coverage summary

| category | standards applicable | standards covered | gaps |
|----------|---------------------|-------------------|------|
| code.prod errors | exit-codes, failfast, failloud | 3 | 0 |
| code.prod procedures | idempotent | 1 | 0 |
| code.prod comments | what-why headers | 1 | 0 |
| code.test behavior | given-when-then, snapshots | 2 | 0 |
| code.test coverage | test-by-grain | 1 | 0 |
| code.test howto | mock-cli-via-path | 1 | 0 |
| lang.terms | treestruct, gerunds | 2 | 0 |
| lang.tones | treestruct-output, seaturtle | 2 | 0 |
| work.flow | keyrack | 1 | 0 |
| **total** | **14** | **14** | **0** |

### standards not applicable

| standard | why not applicable |
|----------|-------------------|
| input-context-pattern | bash skill, not typescript |
| domain-driven-design | skill, not domain logic |
| barrel-exports | single file, no exports |

### what a junior might have omitted

| standard | junior omission | blueprint has it |
|----------|-----------------|------------------|
| exit-code-semantics | exit 1 for all errors | explicit 0/1/2 semantics |
| failfast | let npm fail with cryptic error | validate before run |
| failloud | naked "exit 2" | hints on all error paths |
| idempotent | fixed log filename | isotime filenames |
| what-why headers | "Usage:" instead of ".what" | explicit .what header |
| given-when-then | raw jest describe/it | test-fns imports with labels |
| snapshots | assert only exit code | toMatchSnapshot() required |
| test-by-grain | .test.ts (unit) | .integration.test.ts |
| mock-cli-via-path | jest.mock | PATH injection |
| treestruct | flat names | dot-separated hierarchical |
| gerunds | "validating", "parsing" | verb forms |
| treestruct-output | plain text | turtle vibes |
| seaturtle | "SUCCESS" | "cowabunga!" |
| keyrack | wrong owner/env | exact documented command |

### verification steps taken

1. **enumerated directories** — listed 11 relevant briefs directories
2. **checked each standard** — 14 standards verified present
3. **verified why it holds** — traced each standard to blueprint evidence
4. **noted what would be absent** — documented junior omission patterns
5. **confirmed no gaps** — all relevant standards covered

### why coverage is complete

the blueprint addresses every mechanic standard relevant to:
1. **bash skill authorship** — exit codes, fail-fast, failloud, idempotent
2. **integration tests** — given-when-then, snapshots, fixtures, PATH mocks, correct grain
3. **output format** — turtle vibes, treestruct, seaturtle personality
4. **brief authorship** — .what headers, treestruct names

no standard was forgotten or omitted. each standard has blueprint evidence.

**no coverage gaps found.**

