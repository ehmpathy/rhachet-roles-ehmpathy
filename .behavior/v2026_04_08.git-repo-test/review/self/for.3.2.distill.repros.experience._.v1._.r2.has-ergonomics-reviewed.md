# self-review: has-ergonomics-reviewed

review of input/output ergonomics for git.repo.test experience reproductions.

---

## input ergonomics review

### `--what` flag

the `--what` flag forces explicit intent over implicit convention. journey 1-9 all begin with `--what <type>` which reads naturally as a question-answer: "test what? unit."

**critical examination**:

1. **verbosity tradeoff**: `--what unit` is 11 characters vs potential `unit` (4 chars positional). however, explicit flags prevent arg-order mistakes. a mechanic who types `rhx git.repo.test unit --scope foo` vs `rhx git.repo.test --scope foo unit` should get consistent behavior. the `--what` makes order irrelevant.

2. **no default by design**: the vision document states mechanics "fumble" with test commands. a default `--what` would let `rhx git.repo.test` succeed ambiguously. the choice must be forced.

3. **validation surface**: journey 7 (absent command) shows the error path. the error message `no test:unit command in package.json` names the specific command, not just "test type not found". this traces the input directly to what failed.

**verdict**: verbosity justified. the alternative (positional, or default) increases fumble risk.

### `--scope` flag

the `--scope` flag maps to jest's `--testPathPattern` internally. journey 3 demonstrates: `--scope getUser` filters to files that match "getUser".

**critical examination**:

1. **name collision risk**: npm uses "scope" to mean `@org/package`. could a mechanic confuse `--scope @ehmpathy/test` as an npm scope? unlikely—the context is test filter, and the value is a path pattern, not a package name. the collision is semantic, not functional.

2. **pattern semantics**: is it a glob? a regex? a partial match? the distill document shows `--scope getUser` and `--scope nonExistent`. these are partial matches. but jest's `--testPathPattern` is actually a regex. a mechanic who tries `--scope "*.test.ts"` with glob expectation might be surprised.

   **friction identified**: the reproduction for journey 6 assumes partial match. if the mechanic expects glob semantics, they might write `--scope "src/**/*.test.ts"` which would fail silently (regex interpretation). the hint in journey 6 says "check the scope pattern" but doesn't clarify regex vs glob.

   **mitigation**: add explicit note in brief that `--scope` is regex pattern, not glob. for journey 6 snapshot, consider adjusted hint: "check the scope pattern (regex, not glob)".

3. **empty scope = all**: sensible default. no flag needed for "run all".

**verdict**: mostly natural, but regex vs glob ambiguity needs documentation.

### `--resnap` flag

the `--resnap` flag sets `RESNAP=true` environment variable. journey 4 demonstrates the flow.

**critical examination**:

1. **ehmpathy convention vs jest native**: jest's native flag is `--updateSnapshot` or `-u`. the premortem document notes "RESNAP is ehmpathy convention, not jest native". if a repo's jest config doesn't handle `RESNAP`, snapshots won't update.

   **friction identified**: journey 4 assumes `RESNAP=true` triggers update. but if the repo lacks the jest config that interprets this env var, the mechanic gets no feedback—snapshots simply don't update. the success output shows "snapshots updated" but how does the skill know snapshots were updated vs tests just passed?

   **examination of reproduction**: journey 4 says `then('RESNAP=true was set')` and `then('snapshot updated')`. the first is verifiable (env var). the second requires either jest output parse for "snapshot updated" or file modification time check. the distill document doesn't specify how we detect "snapshots updated".

   **mitigation**: either (a) parse jest output for snapshot update confirmation, or (b) document in brief that `--resnap` assumes ehmpathy jest config. option (b) is simpler and matches "convention over configuration" philosophy.

2. **flag name brevity**: `--resnap` (8 chars) vs `--updateSnapshot` (16 chars). the shorter name is easier to type and remember.

**verdict**: natural for ehmpathy repos, but depends on jest config convention.

### `--` passthrough

the `--` separator allows raw args to jest. journey 8 demonstrates: `--what unit -- --verbose` passes `--verbose` through.

**critical examination**:

1. **unfamiliarity cost**: a mechanic who doesn't know `--` convention might write `--what unit --verbose` and get "unknown argument: --verbose". the error is clear, but the solution isn't obvious.

   **examination of reproduction**: journey 8 covers the success path but not the error path. what happens when mechanic forgets `--`?

   **friction identified**: no journey covers "forgot `--` separator" error case. a mechanic who types `--what unit --testNamePattern=foo` should get a helpful error with `--` usage hint.

   **mitigation**: add journey 10 that covers this error case with hint: "use -- to pass raw args to jest".

2. **composition with --scope**: journey 8 shows `-- --verbose`. what about `--scope foo -- --verbose`? the distill document states this works. but the reproduction doesn't exercise it.

   **gap identified**: no journey tests `--scope` + `--` combination. journey 8 only tests `--what unit -- --verbose`.

**verdict**: standard convention, but error path for forgotten `--` needs coverage.

---

## output ergonomics review

### success output (journey 1, 3, 4, 5, 8, 9)

the success output follows turtle vibes treestruct:

```
🐢 cowabunga!

🐚 git.repo.test --what unit
   ├─ status: passed
   ├─ stats
   │  ├─ suites: 1 file
   │  ├─ tests: 3 passed, 0 failed, 0 skipped
   │  └─ time: 0.5s
   └─ log
      ├─ stdout: .log/role=mechanic/skill=git.repo.test/ISOTIME.stdout.log
      └─ stderr: .log/role=mechanic/skill=git.repo.test/ISOTIME.stderr.log
```

**critical examination**:

1. **information hierarchy**: status first, stats second, logs last. this matches priority—mechanic cares most about pass/fail, then magnitude, then details.

2. **stats completeness**: passed/failed/skipped covers all outcomes. suite count gives scope sense. time enables performance track.

3. **log path ergonomics**: the path `ISOTIME.stdout.log` is long. a mechanic can't easily tab-complete it. but the path is consistent and predictable—once learned, the pattern is known.

   **friction identified**: ISO timestamps like `2026-04-08T14-23-01Z` are precise but unwieldy. a mechanic might prefer `latest.stdout.log` symlink.

   **mitigation**: could add symlink `.log/.../latest.stdout.log` that points to most recent. but this adds complexity. for v1, explicit paths are acceptable—mechanic can copy-paste from output.

4. **keyrack line (journey 5)**: the integration success adds `├─ keyrack: unlocked ehmpath/test`. this tells mechanic credentials are active. but what if mechanic doesn't know what keyrack is?

   **examination**: the howto.keyrack.[lesson].md brief explains keyrack. the output doesn't need to teach—it just needs to indicate state. "unlocked" is clear enough.

**verdict**: clear hierarchy, actionable paths. symlink enhancement deferred.

### failure output (journey 2)

```
🐢 bummer dude...

🐚 git.repo.test --what unit
   ├─ status: failed
   ├─ stats
   │  ├─ suites: 1 file
   │  ├─ tests: 0 passed, 1 failed, 0 skipped
   │  └─ time: 0.3s
   ├─ log
   │  ├─ stdout: .log/.../ISOTIME.stdout.log
   │  └─ stderr: .log/.../ISOTIME.stderr.log
   └─ tip: read the log for full test output and failure details
```

**critical examination**:

1. **tip placement**: the tip appears last, after log paths. this guides the mechanic: "here's where to look, and here's what to do with it."

2. **no inline error**: the output doesn't show the actual test failure. this is by design—"summary only, no live stream" per vision. but a mechanic might want at least the failed test name.

   **friction identified**: journey 2 shows 1 failed test but not which test. mechanic must open log to find out. for quick iteration, whether "getUserById.test.ts failed" vs "all tests failed" matters.

   **examination**: the premortem notes "mechanic struggles to find test failures in verbose output" as a symptom. but the solution (log capture) trades immediate visibility for context efficiency. this is a deliberate tradeoff.

   **mitigation**: could add `├─ failed: getUserById.test.ts:23` line that shows first failure location. but this requires jest output parse for failure locations, which adds complexity. for v1, log-based diagnosis is acceptable.

3. **exit code visibility**: the output doesn't show exit code, but shell captures it. `$?` is 2 for failure. this is correct—exit code is for automation, not display.

**verdict**: actionable with tip. inline failure name deferred to future enhancement.

### constraint error output (journey 6, 7)

journey 6 (no tests match):
```
🐢 bummer dude...

🐚 git.repo.test --what unit --scope nonExistent
   ├─ status: constraint
   └─ error: no tests matched scope 'nonExistent'

hint: check the scope pattern or run without --scope to see all tests
```

journey 7 (absent command):
```
🐢 bummer dude...

🐚 git.repo.test --what unit
   ├─ status: constraint
   └─ error: no test:unit command in package.json

hint: ehmpathy repos use: test:unit, test:integration, test:acceptance, test:lint
```

**critical examination**:

1. **status: constraint vs failed**: "constraint" signals user-fixable issue. "failed" signals test failure. this distinction helps mechanic know: constraint = fix command/config, failed = fix code.

2. **hint specificity**: journey 6 hint is generic ("check the scope pattern"). journey 7 hint is specific (lists commands). both are actionable.

   **friction identified**: journey 6 hint could be more specific. if the scope pattern looks like a glob (`*.test.ts`), the hint could say "scope uses regex, not glob".

3. **error message echoes input**: "no tests matched scope 'nonExistent'" echoes the exact input. this helps mechanic verify they didn't typo.

**verdict**: clear errors with actionable hints. regex vs glob hint enhancement noted.

---

## pit of success principles verification

### intuitive design

**claim**: users can succeed with `rhx git.repo.test --what unit` without docs study.

**verification**: journey 1 demonstrates a mechanic runs `--what unit`, sees turtle success, knows tests passed. no prior knowledge required beyond "unit means unit tests". the command reads as english.

**holds**: yes.

### convenient

**claim**: keyrack auto-unlocks, log capture automatic, `--scope` optional.

**verification**: journey 5 shows keyrack unlock happens implicitly. journeys 1-9 all capture logs automatically. journeys 1,2,5 run without `--scope`.

**holds**: yes.

### expressive

**claim**: `--scope` for narrow focus, `--` for raw args, `--resnap` for snapshots.

**verification**: journey 3 uses `--scope`, journey 4 uses `--resnap`, journey 8 uses `--`. all three paths are exercised.

**gap**: no journey combines all three (`--scope foo --resnap -- --verbose`). this is an advanced case unlikely in practice, but the blueprint should confirm they compose.

**holds**: yes, with composition gap noted.

### composable

**claim**: exit codes enable shell composition, log files enable analysis.

**verification**: journeys specify exit codes (0 for pass, 2 for fail/constraint). log paths are in every output.

**holds**: yes.

### lower trust contracts

**claim**: validates `--what`, validates npm command exists, validates tests matched.

**verification**: journey 7 validates command exists. journey 6 validates tests matched. `--what` validation not explicitly shown but implied by journey structure.

**gap**: no journey shows invalid `--what` error (e.g., `--what invalid`). should fail fast with "unknown test type".

**holds**: partially. add journey for invalid `--what`.

### deeper behavior

**claim**: handles keyrack failure, no-tests-match, absent-command gracefully.

**verification**: journey 6 covers no-tests-match. journey 7 covers absent-command. keyrack failure not explicitly journeyed.

**gap**: no journey shows keyrack unlock failure. should exit 1 (malfunction) with helpful error about keyrack setup.

**holds**: partially. add journey for keyrack failure.

---

## friction points identified

### 1. `--scope` regex vs glob ambiguity

**status**: friction, needs documentation

**evidence**: a mechanic might write `--scope "src/**/*.test.ts"` with glob expectation but receive regex. silent mismatch.

**mitigation**: document in brief: "`--scope` is regex pattern passed to jest's `--testPathPattern`, not a glob."

### 2. `--resnap` depends on jest config convention

**status**: friction, needs documentation

**evidence**: if repo lacks ehmpathy jest config that interprets `RESNAP=true`, snapshots won't update but no error occurs.

**mitigation**: document in brief: "`--resnap` assumes repo handles `RESNAP=true` env var (ehmpathy convention)."

### 3. no inline failure name on test failure

**status**: tradeoff, acceptable for v1

**evidence**: journey 2 shows 1 failed test but mechanic must open log to see which test. adds one step to diagnosis.

**mitigation**: future enhancement could add `├─ failed: filename:line` for first failure. deferred.

### 4. log path timestamps are unwieldy

**status**: tradeoff, acceptable for v1

**evidence**: ISO timestamps like `2026-04-08T14-23-01Z` can't be tab-completed easily.

**mitigation**: future enhancement could add `latest.stdout.log` symlink. deferred.

### 5. `--` passthrough error not journeyed

**status**: coverage gap

**evidence**: no journey for `--what unit --verbose` (absent `--`). should error with hint.

**mitigation**: add journey 10 that covers this error case.

### 6. invalid `--what` not journeyed

**status**: coverage gap

**evidence**: no journey for `--what invalid`. should error with "unknown test type".

**mitigation**: add journey 11 that covers this error case.

### 7. keyrack unlock failure not journeyed

**status**: coverage gap

**evidence**: premortem mentions keyrack failure scenario but no journey exercises it.

**mitigation**: add journey 12 that covers keyrack unlock failure with hint about setup.

---

## issues found

three coverage gaps identified:
1. journey for forgotten `--` separator error
2. journey for invalid `--what` value error
3. journey for keyrack unlock failure

two documentation needs identified:
1. `--scope` regex vs glob clarification
2. `--resnap` ehmpathy convention dependency

no blocker ergonomic issues. all friction points are either acceptable tradeoffs or addressable via documentation/coverage.

