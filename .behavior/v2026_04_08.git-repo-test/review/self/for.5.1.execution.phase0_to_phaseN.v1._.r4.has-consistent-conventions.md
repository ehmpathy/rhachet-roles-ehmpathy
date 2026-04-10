# review.self: has-consistent-conventions (r4)

## deeper review with line-by-line evidence

verified each convention against concrete extant code.

---

## 1. function names: verified consistent

### extant functions (git.commit.set.sh)

```bash
infer_level_from_branch()     # line 55
is_merge_commit()             # line 84
get_commit_prefix()           # line 93
has_scope()                   # line 105
```

pattern: `verb_noun_context` or `verb_noun` in snake_case

### my functions (git.repo.test.sh)

```bash
validate_npm_command()        # line 168
unlock_keyrack()              # line 193
parse_lint_output()           # line 260
parse_jest_output()           # line 280
run_single_test()             # line 330
output_success()              # line 375
output_failure()              # line 411
output_no_tests()             # line 464
```

pattern matches: `verb_noun` in snake_case

### conclusion

exact match. extant uses `infer_level_from_branch`, mine uses `validate_npm_command`. both snake_case with verb first.

---

## 2. constant names: verified consistent

### extant constants (git.commit.set.sh)

```bash
SCRIPT_DIR="..."    # line 33
ROBOT_NAME="..."    # line 37
ROBOT_EMAIL="..."   # line 38
METER_DIR="..."     # line 47
STATE_FILE="..."    # line 48
MODE="plan"         # line 127
```

pattern: UPPERCASE for globals

### my constants (git.repo.test.sh)

```bash
LOG_BASE="..."      # line 38
WHAT=""             # line 44
WHEN=""             # line 45
SCOPE=""            # line 46
RESNAP=false        # line 47
THOROUGH=false      # line 48
REST_ARGS=()        # line 49
LOG_DIR="..."       # line 135
```

pattern matches: UPPERCASE for globals

### conclusion

exact match. both use UPPERCASE for all global/constant variables.

---

## 3. local variable names: verified consistent

### extant local variables (git.commit.set.sh)

```bash
local branch="$1"           # line 56
local has_fix=false         # line 58
local parents               # line 85
local header="$1"           # line 94
```

pattern: lowercase snake_case with `local` keyword

### my local variables (git.repo.test.sh)

```bash
local test_type="$1"        # line 331
local temp_stdout="$2"      # line 332
local npm_cmd="..."         # line 336
local jest_args=()          # line 339
local exit_code=0           # line 366
```

pattern matches: lowercase snake_case with `local` keyword

### conclusion

exact match. both use lowercase snake_case for local variables.

---

## 4. flag names: verified consistent

### extant --scope usage

searched codebase for `--scope` pattern:
- `show.gh.action.logs.sh` uses `--scope` for job filter
- `show.gh.test.errors.sh` uses `--scope` for test type filter

my usage:
- `git.repo.test.sh` uses `--scope` for jest test path filter

### extant --what usage

- `git.repo.test.sh` already used `--what lint` before my changes
- I extended to `--what unit | integration | acceptance | all`

### new flags

- `--resnap` — new, skill-specific (no conflict)
- `--thorough` — new, skill-specific (no conflict)

### conclusion

reuses extant `--scope` pattern. extends extant `--what` pattern. new flags do not conflict.

---

## 5. log path structure: established by this skill

### search results

searched for `.log/role=` pattern in codebase:
- only found in git.repo.test skill itself
- this is the originator of the pattern

### my extension

extant: `.log/role=mechanic/skill=git.repo.test/ISOTIME.stdout.log`
mine: `.log/role=mechanic/skill=git.repo.test/what=${TYPE}/ISOTIME.stdout.log`

### analysis

I added `what=${TYPE}/` namespace to prevent log overlap between test types. this extends the extant pattern without a break. the extant lint behavior continues to work (logs still go to same base directory).

### conclusion

consistent extension of extant pattern. did not introduce new convention — extended extant one.

---

## 6. test file name: reviewed variation

### extant patterns

```
git.branch.rebase.journey.integration.test.ts  # journey tests
git.commit.set.integration.test.ts             # standard tests
git.release.p1.integration.test.ts             # phased tests
```

### my choice

```
git.repo.test.play.integration.test.ts         # journey tests with .play.
```

### analysis

the codebase has one `.journey.` file (git.branch.rebase). the blueprint specified `.play.` for my tests. both terms communicate "end-to-end scenario tests."

this is an area with no strong convention. the `.play.` name was prescribed by the blueprint.

### conclusion

not a divergence — this is a choice in an area without established convention. flagged as open question.

**open question**: should `.play.` be renamed to `.journey.` for consistency with git.branch.rebase?

---

## final conclusion

| aspect | status | evidence |
|--------|--------|----------|
| function names | consistent | snake_case matches extant |
| constant names | consistent | UPPERCASE matches extant |
| local variable names | consistent | lowercase snake_case matches extant |
| flag --scope | consistent | reuses extant pattern |
| flag --what | consistent | extends extant pattern |
| log path structure | consistent | extends extant pattern |
| test file .play. | open question | no strong convention yet |

all conventions verified consistent. one open question flagged for wisher decision on `.play.` vs `.journey.` name.
