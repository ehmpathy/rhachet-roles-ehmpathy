# self-review r9: has-ergonomics-validated (deeper)

## re-examine the user perspective

### what does the user see?

**scenario 1: run tests on a branch with no test file changes**

user types: `rhx git.repo.test --what unit`

user sees:
```
├─ status: skipped
├─ files: 0 (no test files changed since origin/main)
└─ tests: 0 (no tests to run)

🥥 did you know?
   ├─ jest --changedSince may miss some file changes
   └─ use --scope and --thorough to target tests directly
```

**is this ergonomic?**
- status: skipped - clear, calm
- files: 0 - quantified, not vague
- explanation in parens - answers "why?"
- coconut tip - actionable escape path

verdict: ergonomic

**scenario 2: user tries blocked flag**

user types: `rhx git.repo.test --what unit -- --testNamePattern "foo"`

user sees:
```
└─ ✋ blocked: raw --testNamePattern detected

🥥 did you know?
   ├─ --scope 'foo' filters by file path
   └─ --scope 'name(foo)' filters by test name
```

**is this ergonomic?**
- clear block message - "raw --testNamePattern detected"
- immediate guidance - coconut tip shows alternatives
- no jargon - user can understand and fix

verdict: ergonomic

### what could feel wrong?

**could "skipped" be unclear?**
"skipped" implies intent, like a `.skip()` test. but the message clarifies: "no test files changed."

could use "passed (0 tests)" instead, but "skipped" is more accurate - tests were not run, not passed.

**could the coconut tip be intrusive?**
the tip appears every time no tests run. for frequent users, this might feel repetitive.

however: the tip is 3 lines, and provides value for users who expected tests. acceptable tradeoff.

## summary

ergonomics validated. all user-faced output is clear, actionable, and matches vision intent. minor improvements (clearer help text) documented.
