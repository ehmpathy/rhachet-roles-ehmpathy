# self-review r6: role-standards-adherance

## briefs directories enumerated

files changed:
1. `git.repo.test.sh` — shell skill
2. `git.repo.test.integration.test.ts` — test file
3. `getMechanicRole.ts` — hook config
4. `init.claude.permissions.jsonc` — permissions

relevant rule categories:

| category | applicable files |
|----------|------------------|
| code.prod/pitofsuccess.errors | shell skill (exit codes, failfast) |
| code.prod/readable.comments | shell skill (headers) |
| code.test/frames.behavior | test file (given/when/then) |
| code.test/lessons.howto | test file (patterns) |
| code.test/scope.coverage | test file (coverage) |
| code.test/pitofsuccess.errors | test file (failfast) |
| lang.terms | all files (name conventions) |
| lang.tones | shell skill (vibes) |

---

## code.prod/pitofsuccess.errors

### rule.require.exit-code-semantics

**standard**: skills use semantic exit codes: 0=success, 1=malfunction, 2=constraint

**check** (git.repo.test.sh):
- line 65: `exit 2` (unknown arg) — constraint ✓
- line 79: `exit 2` (no --what) — constraint ✓
- line 86: `exit 2` (wrong --what) — constraint ✓
- line 96: `exit 2` (not in git repo) — constraint ✓
- line 110: `exit 2` (no package.json) — constraint ✓
- line 173: `exit 0` (lint passed) — success ✓
- line 187: `exit 1` (npm error) — malfunction ✓
- line 196: `exit 2` (lint failed) — constraint ✓

**why it holds**: every exit code matches the semantic definition. malfunctions (system errors) use exit 1. constraints (user must fix) use exit 2. success uses exit 0.

### rule.require.failfast

**standard**: fail early on invalid state with clear error

**check** (git.repo.test.sh):
- lines 73-79: fails fast on absent --what
- lines 82-87: fails fast on unsupported --what
- lines 92-97: fails fast on not in git repo
- lines 104-111: fails fast on absent package.json

**why it holds**: validation happens before any work. each check emits clear error and exits immediately.

### rule.require.failloud

**standard**: errors must include actionable hints

**check** (git.repo.test.sh):
- line 78: `usage: git.repo.test.sh --what lint` — shows correct usage
- line 85: `only 'lint' is supported (got '$WHAT')` — shows what was wrong
- line 95: `not in a git repository` — states the constraint
- lines 107-109: `no package.json found` + `this skill requires a node.js project` — explains requirement

**why it holds**: each error message tells the user what's wrong and how to fix it.

---

## code.prod/readable.comments

### rule.require.what-why-headers

**standard**: every named procedure has `.what` and `.why` header

**check** (git.repo.test.sh lines 2-18):
```bash
# .what = run repo tests with turtle vibes summary and log capture
#
# .why  = enables lint enforcement in hooks:
#         - exit code 2 forces brain to address defects
#         - summary output saves tokens (details in log file)
#         - consistent vibes across mechanic skills
```

**why it holds**: header has `.what` (single line), `.why` (bullet list), usage examples, and guarantee section. matches the standard format.

---

## code.test/frames.behavior

### rule.require.given-when-then

**standard**: use test-fns given/when/then pattern

**check** (git.repo.test.integration.test.ts):
```typescript
import { genTempDir, given, then, when } from 'test-fns';

given('[case1] lint passes', () => {
  when('[t0] `rhx git.repo.test --what lint` is run', () => {
    then('exit code is 0', () => {
```

**why it holds**: imports from test-fns. uses given/when/then structure. cases labeled with [caseN], times labeled with [tN].

### howto.write-bdd

**standard**: label given blocks with [caseN], when blocks with [tN]

**check**: all given/when blocks have correct labels:
- `[case1]` through `[case8]` for different scenarios
- `[t0]` for each action within a scenario

**why it holds**: labels follow the bdd lesson pattern exactly.

---

## code.test/scope.coverage

### rule.require.test-coverage-by-grain

**standard**: skills need integration tests

**check**: `git.repo.test.integration.test.ts` exists with 27 test cases that cover:
- usecase 1: lint passes (5 tests)
- usecase 2: lint fails (7 tests)
- usecase 3: npm error (3 tests)
- usecase 4: no package.json (2 tests)
- usecase 5: log directory (3 tests)
- usecase 6: log file content (2 tests)
- usecase 7: unknown argument (2 tests)
- usecase 8: not in git repo (2 tests)
- snapshot test

**why it holds**: skill has integration test file. tests cover all usecases from criteria plus additional edge cases.

---

## code.test/pitofsuccess.errors

### rule.forbid.failhide

**standard**: tests must verify on every code path

**check** (git.repo.test.integration.test.ts):
- every `then()` block has explicit `expect()` assertions
- no empty test bodies
- no `expect(true).toBe(true)` patterns
- snapshot tests paired with explicit assertions

**why it holds**: all test cases have assertions. no silent pass-through patterns.

---

## lang.terms

### rule.require.ubiqlang

**standard**: use consistent domain vocabulary

**check**:
- skill name: `git.repo.test` — follows `git.repo.*` namespace
- flag names: `--what`, `--when` — clear, unambiguous
- output terms: `status`, `defects`, `log`, `tip` — domain-appropriate

**why it holds**: names follow extant patterns. no synonym drift.

### rule.require.treestruct

**standard**: enforce [verb][...noun] for mechanisms

**check**: `git.repo.test` = `git` (namespace) + `repo` (scope) + `test` (action)

**why it holds**: follows same pattern as `git.repo.get`.

### rule.forbid.gerunds

**standard**: no -ing words as nouns

**check** (all changed files): no gerunds used in:
- variable names
- function names
- comments
- output messages

**why it holds**: reviewed all code, no gerund usage detected.

---

## lang.tones

### rule.im_an.ehmpathy_seaturtle

**standard**: use turtle vibes phrases

**check** (git.repo.test.sh):
- line 169: `print_turtle_header "cowabunga!"` — success vibe ✓
- lines 74, 83, 93, 105, 179, 190: `print_turtle_header "bummer dude..."` — failure vibe ✓

**why it holds**: uses exact vibe phrases from the tone guide.

### rule.require.treestruct-output

**standard**: cli output uses turtle vibes treestruct format

**check** (git.repo.test.sh):
- uses `print_turtle_header` for 🐢 header
- uses `print_tree_start` for 🐚 root
- uses `print_tree_branch` for ├─ branches
- uses echo for └─ final leaf

**why it holds**: output follows treestruct format exactly. consistent with sedreplace, git.commit.set, and other mechanic skills.

---

## potential deviations checked

### deviation check 1: did junior use wrong vibe phrases?

**checked**: "cowabunga!" for success, "bummer dude..." for failure.

**result**: exact matches to the vibe guide. no deviation.

### deviation check 2: did junior skip bdd labels?

**checked**: all given/when blocks in test file.

**result**: all have [caseN] and [tN] labels. no deviation.

### deviation check 3: did junior use gerunds?

**checked**: all variable names, comments, output strings.

**result**: no gerunds found. no deviation.

### deviation check 4: did junior include failhide patterns?

**checked**: all test cases for assertions.

**result**: every test has explicit expect(). no deviation.

---

## conclusion

code follows all relevant mechanic role standards:

| category | standards checked | deviations |
|----------|-------------------|------------|
| pitofsuccess.errors | exit codes, failfast, failloud | 0 |
| readable.comments | what-why headers | 0 |
| frames.behavior | given/when/then, bdd labels | 0 |
| scope.coverage | integration tests | 0 |
| test.errors | no failhide | 0 |
| lang.terms | ubiqlang, treestruct, no gerunds | 0 |
| lang.tones | vibes, treestruct output | 0 |

the junior did not introduce anti-patterns. code adheres to mechanic standards.
