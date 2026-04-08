# self-review r6: behavior-declaration-adherance

## fresh eyes pass

paused. cleared mental state. re-read each behavior artifact. compared line-by-line to implementation with skepticism: "did the junior deviate?"

## methodology

for each requirement, i will:
1. quote the spec (vision/criteria/blueprint)
2. quote the implementation
3. compare: does it match exactly?
4. articulate WHY it holds (or fix if it deviates)

---

## vision adherance

### requirement 1: "exit code 2 that forces brain to address broken lint issues"

**spec quote** (vision):
> "exit code 2. brain sees constraint error. mechanic runs the fix, retries, passes."

**implementation quote** (git.repo.test.sh:196):
```bash
exit 2
```

**comparison**: exact match.

**why it holds**: the vision specifically calls for exit code 2 to signal a constraint. the implementation uses exactly `exit 2` on the lint failure path (line 196). this is the semantic exit code for "constraint — user must fix" as documented in our exit code conventions. the brain will see exit 2, recognize it cannot proceed, and must address the defects.

### requirement 2: "stdout summary only, not raw lint output"

**spec quote** (vision):
> "the hook actually *blocks* me now. and i can see the log if i need details, but the summary tells me what i need to know."

**implementation quote** (git.repo.test.sh:138):
```bash
npm run test:lint > "$STDOUT_LOG" 2> "$STDERR_LOG" || NPM_EXIT_CODE=$?
```

**comparison**: raw output goes to log files. skill stdout only emits summary via print_tree_* functions.

**why it holds**: the vision explicitly wants token efficiency — summary in stdout, details in log file. the implementation achieves this by redirect of both stdout and stderr from npm to log files (line 138), then constructs a summary output via turtle vibes functions (lines 169-196). the skill never echoes raw lint output to stdout. summary is 5-7 lines; raw eslint can be 100+ lines. token savings verified.

### requirement 3: "consistent vibes"

**spec quote** (vision):
> "terminal shows: 🐢 bummer dude..."

**implementation quote** (git.repo.test.sh:169):
```bash
print_turtle_header "cowabunga!"
```

and (git.repo.test.sh:190):
```bash
print_turtle_header "bummer dude..."
```

**comparison**: uses exact vibe phrases from vision.

**why it holds**: the vision shows specific turtle vibes output format. the implementation uses the shared output.sh functions (print_turtle_header, print_tree_start, print_tree_branch) which are used by all mechanic skills. the vibe phrases "cowabunga!" and "bummer dude..." are exact matches to the vision mock output. consistent with sedreplace, git.commit.set, and other mechanic skills.

---

## criteria adherance

### usecase.1: lint check passes

**spec quote** (criteria):
```
given([case1] repo with lint that passes)
  when([t0] `rhx git.repo.test --what lint` is run)
    then(exit code is 0)
    then(stdout shows turtle success summary)
    then(stdout shows "status: passed")
    then(stdout shows log path)
    then(stderr is empty)
```

**implementation verification**:

| criterion | location | code | holds? |
|-----------|----------|------|--------|
| exit code 0 | line 173 | `exit 0` | ✓ |
| turtle success | line 169 | `print_turtle_header "cowabunga!"` | ✓ |
| status: passed | line 171 | `print_tree_branch "status" "passed"` | ✓ |
| log path | line 172 | `echo "   └─ log: $REL_STDOUT_LOG"` | ✓ |
| stderr empty | — | no output to stderr in success path | ✓ |

**why it holds**: the implementation follows the criteria exactly. on npm exit 0, the skill emits success header, status passed, log path, then exits 0. no stderr output occurs in this path because the only `>&2` redirect is in the malfunction path (line 186).

### usecase.2: lint check fails

**spec quote** (criteria):
```
given([case1] repo with lint defects)
  when([t0] `rhx git.repo.test --what lint` is run)
    then(exit code is 2)
    then(stdout shows turtle failure summary)
    then(stdout shows "status: failed")
    then(stdout shows defect count)
    then(stdout shows log path)
    then(stdout shows tip to try `npm run fix`)
    then(stderr is empty)
```

**implementation verification**:

| criterion | location | code | holds? |
|-----------|----------|------|--------|
| exit code 2 | line 196 | `exit 2` | ✓ |
| turtle failure | line 190 | `print_turtle_header "bummer dude..."` | ✓ |
| status: failed | line 192 | `print_tree_branch "status" "failed"` | ✓ |
| defect count | line 193 | `print_tree_branch "defects" "$DEFECT_COUNT"` | ✓ |
| log path | line 194 | `print_tree_branch "log" "$REL_STDOUT_LOG"` | ✓ |
| npm run fix tip | line 195 | `echo "   └─ 💡 tip: try \`npm run fix\`..."` | ✓ |
| stderr empty | — | no `>&2` in constraint path | ✓ |

**why it holds**: the else branch at line 188 handles lint failure (constraint). it checks for "npm ERR!" to distinguish malfunction from constraint. when no npm ERR!, it's a lint failure: emits failure header, status failed, defect count, log path, tip, then exit 2. stderr stays empty because the only `cat ... >&2` is in the malfunction branch.

### usecase.3: npm error (malfunction)

**spec quote** (criteria):
```
given([case1] repo where `npm run test:lint` errors out)
  when([t0] `rhx git.repo.test --what lint` is run)
    then(exit code is 1)
    then(stderr captures the npm error)
```

**implementation verification**:

| criterion | location | code | holds? |
|-----------|----------|------|--------|
| exit code 1 | line 187 | `exit 1` | ✓ |
| stderr has error | line 186 | `cat "$STDERR_LOG" >&2` | ✓ |

**why it holds**: when npm fails with "npm ERR!" in stderr (e.g., command not found, syntax error), the skill detects this via grep (line 177), outputs stderr log to skill stderr (line 186), and exits 1. this distinguishes malfunction (system broke) from constraint (lint found defects).

### usecase.4: no package.json

**spec quote** (criteria):
```
given([case1] directory without package.json)
  when([t0] `rhx git.repo.test --what lint` is run)
    then(exit code is 2)
    then(stdout explains absent package.json)
```

**implementation verification**:

| criterion | location | code | holds? |
|-----------|----------|------|--------|
| exit code 2 | line 110 | `exit 2` | ✓ |
| explains | lines 107-109 | error message with "no package.json found" | ✓ |

**why it holds**: the criteria specifies exit 2 for this case. why 2 and not 1? because absent package.json is a constraint (user must add one), not a malfunction. the implementation correctly uses exit 2 (line 110) and explains the issue (line 107: "error: no package.json found").

### usecase.5: log directory findsert

**spec quote** (criteria):
```
given([case1] repo where .log/role=mechanic/skill=git.repo.test/ does not exist)
  when([t0] `rhx git.repo.test --what lint` is run)
    then(log directory is created)
    then(.gitignore is created in log directory)
    then(.gitignore contains self-ignore pattern)
```

**implementation verification**:

| criterion | location | code | holds? |
|-----------|----------|------|--------|
| dir created | line 117 | `mkdir -p "$LOG_PATH"` | ✓ |
| .gitignore created | lines 119-123 | findsert pattern | ✓ |
| self-ignore | line 122 | `echo "*"` | ✓ |

**why it holds**: the implementation uses `mkdir -p` for idempotent directory creation (line 117). the .gitignore findsert uses `if [[ ! -f ... ]]; then ... fi` pattern (lines 120-123) which creates only if absent. the self-ignore pattern `*` (line 122) ignores all files in the directory, which includes the .gitignore itself and all log files.

### usecase.6: --when context hint

**spec quote** (criteria):
```
given([case1] any repo state)
  when([t0] `rhx git.repo.test --what lint --when hook.onStop` is run)
    then(behavior is identical to without --when)
```

**implementation verification**:

**code** (lines 48-50):
```bash
--when)
  WHEN="$2"
  shift 2
```

**why it holds**: the skill parses --when into $WHEN but never uses it. the variable is set (line 49) but never referenced in the logic. this means --when has zero effect on behavior, which is exactly what the criteria specifies. the flag exists for future use (context hints for different behaviors based on invocation context).

### usecase.7: log file content

**spec quote** (criteria):
```
given([case1] repo with lint defects)
  when([t0] `rhx git.repo.test --what lint` is run)
    then(log file contains full npm stdout)
    then(log file contains full npm stderr)
    then(log filename includes isotime)
```

**implementation verification**:

| criterion | location | code | holds? |
|-----------|----------|------|--------|
| stdout log | line 138 | `> "$STDOUT_LOG"` | ✓ |
| stderr log | line 138 | `2> "$STDERR_LOG"` | ✓ |
| isotime | line 129 | `STDOUT_LOG="$LOG_PATH/${ISOTIME}.stdout.log"` | ✓ |

**why it holds**: the npm command redirects stdout to STDOUT_LOG and stderr to STDERR_LOG (line 138). both files include the isotime in their name (line 128: `ISOTIME=$(date -u +"%Y-%m-%dT%H-%M-%SZ")`). the isotime format uses hyphens instead of colons for filesystem safety.

---

## blueprint adherance

### file locations

**spec quote** (blueprint filediff):
```
├─ [+] git.repo.test.sh              # main skill entry
└─ [+] git.repo.test.integration.test.ts  # integration tests
```

**actual files**:
- `src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.sh` — created
- `src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.integration.test.ts` — created

**why it holds**: files are in exactly the locations specified by the blueprint. the skill follows the single-file pattern like git.repo.get (not the multi-file pattern like git.commit).

### hook replacement

**spec quote** (blueprint):
> "replace `pnpm run --if-present fix` with `rhx git.repo.test --what lint`"

**actual** (getMechanicRole.ts lines 107-111):
```typescript
onStop: [
  {
    command: './node_modules/.bin/rhx git.repo.test --what lint',
    timeout: 'PT60S',
  },
],
```

**why it holds**: the old hook is gone. the new hook is the only entry in onStop. this is a replacement, not an addition. verified: there is no `pnpm run --if-present fix` anywhere in the hooks config.

### permissions

**spec quote** (blueprint):
```jsonc
"Bash(npx rhachet run --skill git.repo.test:*)",
"Bash(rhx git.repo.test:*)"
```

**actual** (init.claude.permissions.jsonc lines 223-225):
```jsonc
// git.repo.test - run lint check
"Bash(npx rhachet run --skill git.repo.test:*)",
"Bash(rhx git.repo.test:*)",
```

**why it holds**: both permission patterns are added exactly as specified. the comment matches the skill's purpose. both the long form (npx rhachet run) and short form (rhx) are covered.

---

## potential deviations checked

### deviation check 1: did junior use wrong exit codes?

checked all exit statements:
- line 65: `exit 2` (unknown arg) — correct, constraint
- line 79: `exit 2` (no --what) — correct, constraint
- line 86: `exit 2` (wrong --what) — correct, constraint
- line 96: `exit 2` (not in git repo) — correct, constraint
- line 110: `exit 2` (no package.json) — correct, constraint
- line 173: `exit 0` (lint passed) — correct, success
- line 187: `exit 1` (npm error) — correct, malfunction
- line 196: `exit 2` (lint failed) — correct, constraint

all exit codes match semantic conventions. no deviation.

### deviation check 2: did junior output to wrong stream?

checked all output:
- lines 169-172, 179-184, 190-195: stdout via echo/print_* — correct
- line 186: stderr via `cat ... >&2` — correct (malfunction path only)

no deviation. summary to stdout, npm error to stderr.

### deviation check 3: did junior forget log file gitignore?

checked findsert pattern (lines 119-123):
- creates only if absent (`if [[ ! -f ... ]]`)
- content is `*` which ignores all files

no deviation. gitignore is findserted correctly.

---

## conclusion

every requirement from vision, criteria, and blueprint is implemented correctly:

| category | items checked | deviations |
|----------|---------------|------------|
| vision | 3 requirements | 0 |
| criteria | 7 usecases | 0 |
| blueprint | 4 components | 0 |
| exit codes | 8 statements | 0 |
| streams | all output | 0 |

the junior did not deviate from the spec. implementation matches behavior declaration exactly.
