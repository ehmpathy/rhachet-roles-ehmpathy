# review.self: role-standards-adherance (r7)

## review scope

fresh review of implementation against mechanic role standards. line by line verification with fresh eyes.

---

## rule directories checked

| directory | relevance |
|-----------|-----------|
| lang.terms/ | variable names, function names, file names |
| lang.tones/ | turtle vibes, lowercase, emojis |
| code.prod/evolvable.procedures/ | function patterns, input/context |
| code.prod/pitofsuccess.errors/ | exit codes, fail-fast |
| code.prod/readable.comments/ | docblock headers |
| code.prod/readable.narrative/ | no else branches |
| code.test/frames.behavior/ | given/when/then, useThen |
| code.test/pitofsuccess.errors/ | failfast, failloud |

---

## issue found and fixed

### issue 1: else/elif branches in git.repo.test.sh

**rule violated:** rule.forbid.else-branches

**location:** lines 629-643 (before fix)

**original code:**
```bash
if [[ $NPM_EXIT_CODE -ne 0 ]]; then
  # check if npm error or test failure
  if grep -q "npm ERR!" "$TEMP_STDERR"; then
    HAS_ERRORS=true
    IS_MALFUNCTION=true
  else
    HAS_ERRORS=true
  fi
elif [[ "$WHAT" == "lint" ]]; then
  # for lint, check error count
  ERROR_COUNT=$(parse_lint_output "$TEMP_STDOUT")
  if [[ "$ERROR_COUNT" -gt 0 ]]; then
    HAS_ERRORS=true
  fi
fi
```

**problem:**
- line 634: `else` branch
- line 637: `elif` branch

both violate rule.forbid.else-branches which requires explicit ifs with early returns, not else blocks.

**fix applied:**
```bash
# check for npm failure
if [[ $NPM_EXIT_CODE -ne 0 ]]; then
  HAS_ERRORS=true
  # check if malfunction (npm ERR!) vs test failure
  if grep -q "npm ERR!" "$TEMP_STDERR"; then
    IS_MALFUNCTION=true
  fi
fi

# for lint on success, double-check output for errors
if [[ "$HAS_ERRORS" == "false" ]] && [[ "$WHAT" == "lint" ]]; then
  ERROR_COUNT=$(parse_lint_output "$TEMP_STDOUT")
  if [[ "$ERROR_COUNT" -gt 0 ]]; then
    HAS_ERRORS=true
  fi
fi
```

**why fix is correct:**
- removed else: HAS_ERRORS=true was set in both branches, factored out
- removed elif: converted to second independent if that checks state
- logic preserved: lint error count still checked only when npm succeeded
- follows narrative flow: each if block is independent paragraph

**verification:** all 58 tests pass after fix.

---

## verified standards (no issues)

### lang.terms standards

**rule.require.treestruct:** function names follow [verb][...noun] pattern

| function name | pattern | verdict |
|---------------|---------|---------|
| `validate_npm_command` | verb_noun_noun | pass |
| `unlock_keyrack` | verb_noun | pass |
| `parse_lint_output` | verb_noun_noun | pass |
| `parse_jest_output` | verb_noun_noun | pass |
| `run_single_test` | verb_adj_noun | pass |
| `output_success` | verb_noun | pass |
| `output_failure` | verb_noun | pass |
| `output_no_tests` | verb_noun_noun | pass |

**rule.forbid.gerunds:** no -ing words as nouns

checked all 670 lines. no gerunds found in variable names, function names, comments, or output strings.

### lang.tones standards

**rule.im_an.ehmpathy_seaturtle:** turtle vibes present

| element | location | verdict |
|---------|----------|---------|
| turtle emoji | via print_turtle_header | pass |
| "cowabunga!" | line 380 | pass |
| "bummer dude..." | lines 109, 124, 143, 206, 417, 465, 484 | pass |
| "heres the wave..." | line 484 | pass |

**rule.prefer.lowercase:** all comments and output lowercase

verified all comments and echo statements use lowercase.

### code.prod/pitofsuccess.errors standards

**rule.require.exit-code-semantics:**

| code | semantic | implementation | verdict |
|------|----------|----------------|---------|
| 0 | success | line 655 after output_success | pass |
| 1 | malfunction | line 664 after npm error | pass |
| 2 | constraint | line 667 after test failure | pass |

**rule.require.failfast:** early exit on constraint

- line 116: exits immediately if --what absent
- line 131: exits immediately if --what invalid
- line 147: exits immediately if not in git repo
- line 163: exits immediately if no package.json
- line 180: exits immediately if npm command absent
- line 214: exits immediately if keyrack fails

### code.prod/readable.comments standards

**rule.require.what-why-headers:**

header docblock present (lines 2-26) with .what and .why sections.

### code.prod/readable.narrative standards

**rule.forbid.else-branches:**

after fix: no else or elif keywords remain. all conditionals use explicit ifs.

verified via: `grep -E '\belse\b|\belif\b' git.repo.test.sh` returns empty.

### code.test standards

**rule.require.given-when-then:**

verified each journey uses given(), when(), then() structure with [caseN] and [tN] labels:

| journey | given label | when label | structure |
|---------|-------------|------------|-----------|
| 1 | [case1] repo with tests that pass | [t0] --what unit is called | pass |
| 2 | [case2] repo with tests that fail | [t0] --what unit is called | pass |
| 3 | [case3] repo with multiple test files | [t0] --what unit --scope is called | pass |
| 4 | [case4] repo with snapshot to update | [t0] --what unit --resnap is called | pass |
| 5 | [case5] repo with integration tests | [t0] --what integration is called | pass |
| 6 | [case6] repo with no matched tests | [t0] --what unit --scope with no matches | pass |
| 7 | [case7] repo without test command | [t0] --what unit is called | pass |
| 8 | [case8] repo with tests that need extra args | [t0] --what unit -- --verbose is called | pass |
| 9 | [case9] repo with lint command | [t0] --what lint --scope --resnap | pass |
| 10 | [case10] repo with acceptance tests | [t0] --what acceptance is called | pass |
| 11 | [case11] repo with all test commands | [t0] and [t1] for all pass and lint fail | pass |
| 12 | [case12] repo with tests to run thorough | [t0] --what unit --thorough is called | pass |
| 13 | [case13] repo with unit tests | [t0] --what unit creates namespaced log | pass |

**rule.require.useThen:**

verified all 13 journeys use useThen for shared results:

```typescript
// journey 1 (line 131)
const result = useThen('skill executes', () => { ... });

// journey 2 (line 185)
const result = useThen('skill executes', () => { ... });

// journey 3 (line 239)
const result = useThen('skill executes', () => { ... });

// etc. - all journeys follow same pattern
```

no let declarations for test results found. verified via scan for `let result` pattern.

**rule.require.snapshots:**

6 snapshots verified to cover key output paths:

| snapshot | journey | what it captures |
|----------|---------|------------------|
| 1 | case1 | success output with stats |
| 2 | case2 | failure output with tip |
| 3 | case3 | scoped test output |
| 4 | case5 | integration output with keyrack |
| 5 | case6 | constraint error for no matches |
| 6 | case7 | constraint error for absent command |

**rule.forbid.redundant-expensive-operations:**

verified each journey calls operation once via useThen, then asserts on shared result:

```typescript
// example from journey 1
const result = useThen('skill executes', () => { ... }); // single call
then('exit code is 0', () => { expect(result.exitCode).toBe(0); }); // reuses
then('output shows cowabunga', () => { expect(result.stderr).toContain('cowabunga!'); }); // reuses
```

no redundant expensive operations detected.

**code.prod/readable.comments in test file:**

verified .what/.why headers present:

```typescript
// line 6-9
/**
 * .what = journey tests for git.repo.test skill
 * .why  = verifies all test types, flags, and edge cases work correctly
 */
describe('git.repo.test', () => {

// line 13-15
/**
 * .what = run git.repo.test skill in a temp directory
 */
const runGitRepoTest = (args: { ... }) => { ... };

// line 34-36
/**
 * .what = create a fixture repo with test infrastructure
 */
const setupFixture = (config: { ... }) => { ... };

// line 111-113
/**
 * .what = sanitize output for stable snapshots
 */
const sanitizeOutput = (output: string): string => { ... };
```

---

## file 3: howto.run-tests.[lesson].md (131 lines)

### lang.tones standards

**rule.prefer.lowercase:**

checked all headings and body text:

| line | content | verdict |
|------|---------|---------|
| 1 | `# howto: run tests with git.repo.test` | lowercase pass |
| 3 | `## .what` | lowercase pass |
| 7 | `## .critical` | lowercase pass |
| 11 | `## .commands` | lowercase pass |
| 25 | `## .flags` | lowercase pass |
| 35 | `## .auto behaviors` | lowercase pass |

all text uses lowercase per standard.

**rule.require.treestruct-output:**

example output (lines 83-95) uses correct treestruct format:

```
🐢 cowabunga!

🐚 git.repo.test --what unit
   ├─ status: passed
   ├─ stats
   │  ├─ suites: 3 files
   │  ├─ tests: 12 passed, 0 failed, 0 skipped
   │  └─ time: 2.4s
   └─ log
      ├─ stdout: ...
      └─ stderr: ...
```

matches skill output format. turtle vibes present.

**rule.forbid.gerunds:**

scanned all 131 lines. no gerunds in:
- headings
- body text
- code examples

verified: "auto behaviors" uses noun "behaviors" not gerund.

---

## conclusion

found 1 violation (else/elif branches in git.repo.test.sh). fixed via refactor to independent if blocks.

implementation now adheres to all mechanic role standards:

- **lang.terms**: function names verb-first snake_case, no gerunds
- **lang.tones**: turtle vibes, lowercase, no shouts
- **code.prod**: fail-fast, exit codes, narrative flow, no else branches
- **code.test**: given/when/then, useThen, snapshots, no redundant operations
- **brief**: lowercase, treestruct output examples, no gerunds

all 58 tests pass after fix.
