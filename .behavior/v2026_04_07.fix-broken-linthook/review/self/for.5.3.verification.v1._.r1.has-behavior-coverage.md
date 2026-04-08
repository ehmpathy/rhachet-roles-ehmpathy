# self-review r1: has-behavior-coverage

## the question

does the verification checklist show that every behavior from wish/vision has a test?

---

## methodology

i will trace each sentence in the wish to a test assertion, then do the same for vision. for each, i will articulate WHY the test coverage is sufficient.

---

## wish line-by-line trace

### wish line 9: "it doesn't emit an exitCode=2 that forces the brain to address the broken lint issues"

**test coverage**: [case2] line 168 — `expect(result.exitCode).toBe(2);`

**why it holds**: the test explicitly asserts `exitCode` is exactly 2. the test setup uses a lint command that exits 1 (lint failure simulation). the skill detects this as a constraint (not a malfunction) and exits 2. the assertion verifies this semantic exit code.

### wish line 10: "it stdouts all of the lint defects, which is actually too much to be helpful"

**test coverage**: [case1] line 109, [case2] line 189, plus snapshots

**why it holds**: the tests check that stdout contains "cowabunga" (success) or "bummer dude" (failure) — the turtle vibes header. they do NOT contain the raw lint output like "7 problems (3 errors, 4 warnings)". the mock lint command outputs that text, but it goes to the log file, not skill stdout. the snapshot tests capture the exact stdout format, which shows only the summary. this proves the "too much output" problem is solved.

### wish line 15: "we should create a new skill that's run, e.g., `rhx git.repo.test --what lint [--when hook.onStop]`"

**test coverage**: all 8 test cases invoke with `['--what', 'lint']` args

**why it holds**: every test case calls the skill via `runInTempGitRepo({ gitRepoTestArgs: ['--what', 'lint'] })`. this proves the skill accepts and processes the `--what lint` interface. the `--when` flag is explicitly stated as "behavior is identical to without --when" in the criteria, so no separate test is required.

### wish line 16: "it should by default stdout & stderr into `.log/role=mechanic/skill=git.repo.test/$isotime.{stdout,stderr}.log`"

**test coverage**: [case5] lines 323-371, [case6] lines 376-400

**why it holds**: [case5] verifies the log directory structure is created at `.log/role=mechanic/skill=git.repo.test`. [case6] verifies the log file contains the full npm output ("7 problems"). the sanitizeOutput function at line 84 confirms isotime format by matching `\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z`. this proves logs capture raw output with isotime filenames.

### wish line 17: "it should stdout the same vibes as the other mechanic skills"

**test coverage**: [case1] line 109 checks "cowabunga", [case2] line 189 checks "bummer dude"

**why it holds**: "cowabunga!" is the success vibe phrase. "bummer dude..." is the failure vibe phrase. these are the exact phrases used by sedreplace, git.commit.set, and other mechanic skills. the tests verify both phrases appear in the appropriate contexts.

---

## wish behaviors

| behavior from wish | test coverage | test location |
|--------------------|---------------|---------------|
| exit code 2 on lint failure | covered | [case2] line 168 |
| summary only to stdout (not raw lint) | covered | [case1] line 100, [case2] line 180, snapshots verify output format |
| log stdout/stderr to .log/ directory | covered | [case5] line 323, [case6] line 376 |
| turtle vibes output | covered | [case1] line 100 checks "cowabunga", [case2] line 180 checks "bummer dude" |
| `rhx git.repo.test --what lint` command | covered | all cases use --what lint args |
| `--when hook.onStop` context hint | behavior is "identical to without --when" per criteria — no separate test needed |

**why coverage is complete for wish**: each of the three core wishes (exit code 2, log files, summary output) has dedicated test cases. the wish is about enforcement + token save + vibes, and all three are verified.

---

## vision behaviors — detailed trace

### exit code semantics

**exit code 0 on lint pass**: [case1] line 97 — `expect(result.exitCode).toBe(0);`

why it holds: the test uses `testLintScript: 'echo "lint passed"'` which exits 0. the skill sees npm exit 0, emits success summary, and exits 0. the assertion proves this code path.

**exit code 1 on npm malfunction**: [case3] line 280 — `expect(result.exitCode).toBe(1);`

why it holds: the test uses a command that echoes "npm ERR!" to stderr and exits 127 (command not found). the skill detects "npm ERR!" in stderr, recognizes this as a malfunction (not a lint constraint), and exits 1. this distinguishes system errors from user-fix-required errors.

**exit code 2 on constraint**: [case2] line 177, [case4] line 306, [case7] lines 411+429, [case8] line 458

why it holds: four different constraint paths are tested:
- lint defects found (npm exits non-zero without "npm ERR!")
- no package.json (precondition not met)
- --what omitted or unsupported value (invalid input)
- not in git repo (precondition not met)

all exit 2, which signals "user must fix" semantics.

### output format

**stdout shows defect count**: [case2] line 214 — `expect(result.stdout).toContain('defects: 7');`

why it holds: the mock outputs "7 problems" in its text. the skill parses this and includes "defects: 7" in the summary. the test verifies this parsing works.

**stdout shows log path**: [case1] line 134, [case2] line 226

why it holds: both success and failure paths show the log path. the tests verify the path format `.log/role=mechanic/skill=git.repo.test/` and `.stdout.log` suffix appear in stdout.

**stdout shows tip**: [case2] line 240 — `expect(result.stdout).toContain('npm run fix');`

why it holds: the failure summary includes an actionable hint. this helps the user know how to resolve lint defects.

### stderr behavior

**stderr empty on constraint**: [case1] line 149, [case2] line 252 — `expect(result.stderr).toBe('');`

why it holds: constraint errors (lint failed, no package.json, bad args) should not pollute stderr. the summary goes to stdout, raw logs go to files. stderr stays empty.

**stderr has error on malfunction**: [case3] line 292 — `expect(result.stderr).toContain('npm ERR!');`

why it holds: malfunctions are different — the npm error output is piped to stderr so the caller sees what went wrong. this is the "fail loud" pattern for system errors.

### log management

**findsert .gitignore**: [case5] lines 339-370

why it holds: three assertions verify the findsert:
1. log directory exists
2. .gitignore file exists in log directory
3. .gitignore contains "*" (self-ignore pattern)

the findsert is idempotent — the skill checks `if [[ ! -f ... ]]` before create.

**log file contains full npm output**: [case6] line 399

why it holds: the test reads the .stdout.log file and verifies it contains "7 problems" — the raw lint output that was redirected away from skill stdout. this proves the log capture works.

### hook replacement

**not testable in integration test**: verified by read of getMechanicRole.ts lines 107-111

why it holds: the hook replacement is a config change, not a behavior the skill controls. prior session reads confirmed onStop array contains only `rhx git.repo.test --what lint`, and the old `pnpm run --if-present fix` is gone.

---

## vision behaviors

| behavior from vision | test coverage | test location |
|---------------------|---------------|---------------|
| exit code 0 on lint pass | covered | [case1] line 88 |
| exit code 1 on npm malfunction | covered | [case3] line 271 |
| exit code 2 on constraint | covered | [case2] line 168, [case4] line 299, [case7] lines 406+424, [case8] line 444 |
| stdout shows defect count | covered | [case2] line 205 |
| stdout shows log path | covered | [case1] line 125, [case2] line 217 |
| stdout shows tip (npm run fix) | covered | [case2] line 231 |
| stderr empty on constraint | covered | [case1] line 140, [case2] line 243 |
| stderr has error on malfunction | covered | [case3] line 283 |
| findsert .gitignore in log dir | covered | [case5] lines 339, 355 |
| log file contains full npm output | covered | [case6] line 376 |
| hook replacement | not testable in integration test — verified via getMechanicRole.ts read |

**why coverage is complete for vision**: every usecase from the criteria has a test case that matches it. the exit code semantics (0/1/2), output format, log management, and error paths are all verified.

---

## verification checklist alignment

the checklist at `5.3.verification.v1.i1.md` lists 10 behaviors. each maps to a test file and case number. the coverage is exhaustive for testable behaviors.

the hook replacement is a config change in getMechanicRole.ts (lines 107-111) — not testable via the skill's integration tests, but verified by prior reads of that file which confirmed the old `pnpm run --if-present fix` was replaced with `rhx git.repo.test --what lint`.

---

## conclusion

every behavior from wish and vision has test coverage. the checklist accurately reflects this coverage with specific test file and case references.

