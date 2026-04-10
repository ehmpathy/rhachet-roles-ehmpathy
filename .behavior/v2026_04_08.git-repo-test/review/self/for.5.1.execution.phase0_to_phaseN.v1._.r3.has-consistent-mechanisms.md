# review.self: has-consistent-mechanisms (r3)

## deeper review with concrete evidence

took time to trace through code and verify each claim with actual searches and comparisons.

---

## 1. output utilities: verified reuse

### grep results

searched for output.sh utilities in git.repo.test.sh:
```
grep -E "print_turtle_header|print_tree_start|print_tree_branch" git.repo.test.sh
```

found 28 uses across the skill:
- `print_turtle_header` — used 9 times for status headers
- `print_tree_start` — used 9 times to begin output blocks
- `print_tree_branch` — used 10 times for nested content

### evidence from code

source line 33:
```bash
source "$CLAUDE_TOOLS_DIR/output.sh"
```

sample usage pattern (line 380-388):
```bash
print_turtle_header "cowabunga!"
print_tree_start "git.repo.test $DISPLAY_ARGS"
if [[ -n "$KEYRACK_STATUS" ]]; then
  print_tree_branch "keyrack" "$KEYRACK_STATUS"
fi
print_tree_branch "status" "passed"
```

### conclusion

correctly reuses extant output.sh primitives. no duplication. the skill-specific compositions (`output_success`, `output_failure`, `output_no_tests`) are justified because they encode domain logic (what to show for each outcome), not reinvent output format.

---

## 2. keyrack: fundamentally different purpose

### extant: keyrack.operations.sh

location: `src/domain.roles/mechanic/skills/git.commit/keyrack.operations.sh`

purpose: fetch a specific GitHub token for push/pr operations

key characteristics:
- function: `fetch_github_token`, `require_github_token`
- gets: `EHMPATHY_SEATURTLE_GITHUB_TOKEN`
- env: `prep`
- uses `--prikey ~/.ssh/ehmpath` for SSH auth
- returns the token value as output

code (lines 32-36):
```bash
keyrack_output=$("$repo_root/node_modules/.bin/rhachet" keyrack get \
  --key EHMPATHY_SEATURTLE_GITHUB_TOKEN \
  --env prep \
  --allow-dangerous \
  --json 2>&1) || keyrack_exit=$?
```

### mine: unlock_keyrack

location: `git.repo.test.sh` lines 193-216

purpose: unlock test credentials before test runs

key characteristics:
- function: `unlock_keyrack`
- does NOT fetch any token
- env: `test` (not prep)
- just calls `rhx keyrack unlock --owner ehmpath --env test`
- sets `KEYRACK_STATUS` for display, no return value

code (lines 202-204):
```bash
if unlock_output=$(rhx keyrack unlock --owner ehmpath --env test 2>&1); then
  KEYRACK_STATUS="unlocked ehmpath/test"
  return 0
```

### comparison table

| aspect | keyrack.operations.sh | unlock_keyrack |
|--------|----------------------|----------------|
| operation | get (fetch token) | unlock (enable access) |
| returns | token string | no value |
| env | prep | test |
| key | EHMPATHY_SEATURTLE_GITHUB_TOKEN | (no specific key) |
| purpose | GitHub auth for push/pr | test credentials for jest |

### conclusion

these are fundamentally different operations:
1. keyrack.operations.sh fetches a specific secret for GitHub auth
2. unlock_keyrack enables access to test credentials for jest

not duplications. could not reuse keyrack.operations.sh because:
- wrong env (prep vs test)
- wrong operation (get vs unlock)
- wrong purpose (GitHub token vs test credentials)

---

## 3. jest parse: no extant equivalent

### search results

searched entire skills directory:
```bash
grep -r "Test Suites:" src/domain.roles/mechanic/skills/
grep -r "parse.*jest" src/domain.roles/mechanic/skills/
grep -r "parse.*output" src/domain.roles/mechanic/skills/
```

results:
- `Test Suites:` — only in git.repo.test.sh and its test files
- `parse.*jest` — no matches
- `parse.*output` — only `parse_lint_output` (extant) and `parse_jest_output` (mine)

### extant parse_lint_output

location: git.repo.test.sh lines 260-275

purpose: extract lint error count from npm output

this was in the original code, preserved unchanged.

### mine: parse_jest_output

location: git.repo.test.sh lines 280-325

purpose: extract jest stats (suites, tests passed/failed/skipped, time)

parses patterns like:
- `Test Suites: 3 passed, 0 failed, 3 total`
- `Tests: 12 passed, 1 failed, 2 skipped, 15 total`
- `Time: 2.345 s`

### conclusion

`parse_jest_output` is the first jest stats parser in this codebase. no extant equivalent to reuse. new mechanism is justified.

---

## 4. other mechanisms: all skill-specific

### validate_npm_command (lines 168-186)

checks if `test:${WHAT}` command exists in package.json.

searched for similar patterns:
```bash
grep -r "test:unit" src/domain.roles/mechanic/skills/
grep -r "npm run test" src/domain.roles/mechanic/skills/
```

no extant validation for test commands. other skills that run npm commands (like show.gh.test.errors.sh) do not validate command existence first. this is a pit-of-success enhancement specific to git.repo.test.

### run_single_test (lines 330-370)

executes `npm run test:${TYPE}` with env vars and captures output.

searched for similar patterns:
```bash
grep -r "npm run" src/domain.roles/mechanic/skills/
```

other skills run npm commands differently — they stream output directly. this skill needs to capture for stats parse. the pattern is justified as skill-specific.

---

## final conclusion

all new mechanisms are justified:

| mechanism | verdict | rationale |
|-----------|---------|-----------|
| output functions | reuses extant | 28 uses of output.sh primitives |
| unlock_keyrack | different purpose | test env unlock, not token fetch |
| parse_jest_output | no extant | first jest stats parser |
| validate_npm_command | skill-specific | pit-of-success enhancement |
| run_single_test | skill-specific | needs capture for stats parse |

no duplications found. all new code either reuses extant utilities or fills gaps that did not exist.
