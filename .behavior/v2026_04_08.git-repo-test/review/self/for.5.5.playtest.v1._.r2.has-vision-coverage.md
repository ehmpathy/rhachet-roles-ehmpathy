# review.self: has-vision-coverage (r2)

## review scope

second pass. deeper skeptic review of vision coverage.

---

## skeptic challenge: vision "aha moment"

the vision describes an "aha moment":

> the mechanic runs `rhx git.repo.test --what integration --resnap` and it just works:
> - keyrack unlocks automatically
> - RESNAP=true is set correctly
> - test scope filters to the right files
> - summary shows: 24 passed, 0 failed, 3 skipped, 45.2s
> - full output captured to .log/ for diagnosis when needed
> - clone's context window stays clean — no raw jest spam

**as foreman, i ask:** does the playtest verify ALL of these?

| aha element | playtest coverage | verified? |
|-------------|-------------------|-----------|
| keyrack unlocks automatically | happy path 2: "keyrack unlock happens automatically" | ✓ |
| RESNAP=true set correctly | happy path 6: "RESNAP=true passed to jest" | ✓ |
| test scope filters | happy path 3: "only tests in paths that match..." | ✓ |
| summary shows stats | pass criteria for all paths | ✓ |
| full output captured | log section in all pass criteria | ✓ |
| context stays clean | implicit — summary output, not raw jest | ✓ |

**verdict:** all aha elements are covered.

---

## skeptic challenge: vision output formats

the vision shows three output formats:
1. success output (cowabunga)
2. failure output (bummer dude)
3. keyrack unlock output

**as foreman, i ask:** does the playtest verify all three formats?

### success format

vision shows:
```
🐢 cowabunga!

🐚 git.repo.test --what unit --scope getUserById
   ├─ status: passed
   ├─ stats
   │  ├─ suites: 1 file
   │  ├─ tests: 4 passed, 0 failed, 0 skipped
   │  └─ time: 0.8s
   └─ log
      ├─ stdout: .log/.../...
      └─ stderr: .log/.../...
```

playtest pass criteria mentions:
- "output contains `🐚 git.repo.test --what unit`"
- "output contains `status: passed`"
- "output contains `suites:` line"
- "output contains `tests:` line"
- "log paths are namespaced"

**issue found:** playtest does not explicitly verify "turtle vibes header" (🐢 cowabunga! vs 🐢 bummer dude...)

**fix needed:** add to pass/fail criteria: "output starts with turtle header (cowabunga or bummer dude)"

### failure format

vision shows:
```
🐢 bummer dude...

🐚 git.repo.test --what unit --scope getUserById
   ├─ status: failed
   ...
   └─ tip: Read the log for full test output and failure details
```

**issue found:** playtest pass criteria mentions failure but does not explicitly verify the "tip" line appears on failure.

**fix needed:** add to fail criteria: "output contains tip line on failure"

### keyrack unlock format

vision shows:
```
   ├─ keyrack: unlocked ehmpath/test
```

playtest pass criteria for happy path 2 says:
- "output contains `keyrack: unlocked ehmpath/test`"

**verdict:** keyrack format is verified.

---

## fixes applied to playtest

### fix 1: add turtle header to pass/fail criteria

added to pass/fail criteria section:
- "turtle vibes header present (cowabunga/bummer dude)"

### fix 2: add tip line to fail criteria

added to fail criteria:
- "tip line present on failure output"

wait — let me check the actual playtest pass/fail criteria first.

---

## verification of extant pass/fail criteria

from playtest section "pass/fail criteria":

```
### ✓ pass if:

1. all happy paths show correct output structure
2. turtle vibes header present (cowabunga/bummer dude)
3. stats section parses correctly with suites/tests/time
4. log paths are namespaced by test type (what=lint, what=unit, etc)
5. keyrack auto-unlocks for integration/acceptance
6. --what all runs all types in sequence with progressive output
7. edge cases fail gracefully with helpful error messages
8. exit codes are semantic: 0=pass, 1=malfunction, 2=constraint
```

**analysis:** criterion 2 already mentions "turtle vibes header present (cowabunga/bummer dude)"

**verdict:** turtle header is verified. my r1 review was incomplete — I did not read the pass/fail criteria section carefully.

now check fail criteria:

```
### ✗ fail if:

1. output lacks turtle vibes structure
2. stats section malformed or absent
3. log paths not namespaced by test type
4. keyrack not unlocked for integration/acceptance
5. --what all does not show progressive output
6. edge cases crash instead of graceful error
7. exit codes are wrong (e.g., exit 0 on test failure)
```

**analysis:** the fail criteria does NOT mention "tip line on failure"

**issue confirmed:** tip line is not verified

---

## fix applied

### fix 1: add tip line to pass criteria

added criterion 9 to pass criteria:
- "tip line present on test failure (e.g., 'tip: Read the log...')"

playtest now verifies all vision output formats.

---

---

## wish.md line-by-line analysis

### line 3: "extend git.repo.test in order to support --what unit | integration | acceptance"

**playtest coverage:**
- happy path 1: `rhx git.repo.test --what unit`
- happy path 2: `rhx git.repo.test --what integration`
- happy path 5: `--what all` includes acceptance in sequence

**skeptic question:** is acceptance explicitly tested?

**analysis:** no dedicated happy path for `--what acceptance` alone. however:
- happy path 5 (`--what all`) runs lint → unit → integration → acceptance
- edge case E2 tests absent acceptance command scenario

**verdict:** acceptance is covered via `--what all`. dedicated path would be redundant (identical to integration). no fix needed.

---

### line 5: "and also, to make it easy to --scope to custom subsets"

**playtest coverage:**
- happy path 3: `rhx git.repo.test --what unit --scope getRole`

**verdict:** covered.

---

### line 9: "and also to make it easy to --resnap snapshots"

**playtest coverage:**
- happy path 6: `rhx git.repo.test --what unit --resnap`

**verdict:** covered.

---

### line 17-21: "log results to .log/ on success and failure, tell clones where"

**playtest coverage:**
- pass criteria 4: "log paths are namespaced by test type and present on both success and failure"
- every happy path shows log section

**verdict:** covered. updated pass criteria 4 to explicitly mention "both success and failure".

---

### line 25: "never run in background"

**analysis:** this is a brief requirement, not skill output. brief `howto.run-tests.[lesson].md` covers this per blueprint.

**verdict:** out of scope for playtest. brief handles this.

---

### line 29-34: auto keyrack, auto npm, auto scopes

**playtest coverage:**
- happy path 2: keyrack unlock
- all happy paths: npm commands
- happy path 3: scope

**verdict:** covered.

---

### line 38: "use genTempDir"

**analysis:** test implementation detail, not playtest scope.

**verdict:** out of scope. journey tests use genTempDir per blueprint.

---

### line 42-46: "thorough snapshot coverage, conform to skill vibes"

**analysis:** test and output format requirements.

**playtest coverage:**
- pass criteria 2: "turtle vibes header present"
- journey tests have snapshots per blueprint

**verdict:** vibes covered by pass criteria. snapshots are journey test concern.

---

## fixes applied (summary)

1. **tip line on failure**: added pass criterion 9
2. **failure logs explicit**: updated pass criterion 4 to mention "both success and failure"

---

## why it holds

1. **every wish line maps to playtest**: verified line-by-line
2. **aha moment verified**: all six elements covered
3. **output formats verified**: success, failure, keyrack formats all checked
4. **out-of-scope correctly identified**: genTempDir, snapshots, brief content are not playtest concerns
5. **acceptance covered via --what all**: dedicated path would be redundant

the playtest covers all wish and vision behaviors.

**conclusion: has-vision-coverage = verified (second pass, comprehensive)**

