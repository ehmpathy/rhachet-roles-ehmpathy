# self-review: has-questioned-assumptions

## assumptions reviewed

### assumption 1: "tests should either: run and verify, or fail/skip explicitly"

**what do we assume here without evidence?**
that there are only three valid test states: pass (with verification), fail, or skip.

**what if the opposite were true?**
what if some tests legitimately have conditional paths that verify different things based on environment?

**what exceptions or counterexamples exist?**
- a test that checks "feature X works when enabled" AND "feature X is gracefully absent when disabled"
- both are valid verifications, just of different states

**did the wisher actually say this?**
yes — the wish examples all show tests that passed without verification. the wish targets tests that "pass without verifying anything", not tests that verify conditional states.

**verdict: holds with refinement** — the key distinction is "pass without verification" vs "pass with conditional verification". the assumption holds if we clarify that conditional assertions must still verify something.

---

### assumption 2: "conditional assertions that 'pass anyway' are always bugs"

**what do we assume here without evidence?**
that any `if (condition) { expect(...) }` pattern is suspicious.

**what if the opposite were true?**
what if conditional assertions are legitimate for feature flags, environment differences, or optional behaviors?

**what exceptions or counterexamples exist?**
```ts
// legitimate: verify different behavior based on feature flag
if (featureEnabled) {
  expect(result.newField).toBeDefined();
} else {
  expect(result.newField).toBeUndefined();
}
```

this verifies behavior in both branches — it's not a failhide.

**issue found**: the vision should distinguish:
- conditional verification (both branches assert something) ✓
- conditional pass-through (one branch asserts, other does no verification) ✗

**verdict: issue** — need to refine the pattern. the problem is not conditional assertions per se, but conditional assertions where one branch does no verification.

---

### assumption 3: "`expect([0, 1, 2]).toContain(x)` patterns are always suspicious"

**what do we assume here without evidence?**
that accepting multiple exit codes is always a failhide.

**what if the opposite were true?**
what if a command legitimately returns different exit codes for different valid outcomes?

**what exceptions or counterexamples exist?**
```ts
// legitimate: grep returns 0 for match, 1 for no match, both valid
const result = await grep(pattern);
expect([0, 1]).toContain(result.exitCode);
if (result.exitCode === 0) {
  expect(result.stdout).toContain(pattern);
}
```

here, both exit codes are valid behavior — grep returns 1 when no match, which is success (not an error).

**did the wisher actually say this?**
the wish specifically flagged `expect([0, 1, 2]).toContain(result.exitCode)` in context of "accepts 'no key' as valid". the issue is not the pattern itself, but the pattern used to hide a configuration error.

**verdict: holds with context** — the pattern is suspicious when it accepts error exit codes as valid without verification. a test that accepts multiple exit codes must verify the behavior for each.

---

### assumption 4: "ConstraintError is the right way to fail loud in tests"

**what do we assume here without evidence?**
that tests should throw ConstraintError when resources are absent.

**did the wisher actually say this?**
no — this was my inference from extant test-fns patterns.

**what if the opposite were true?**
jest has `it.skip.if(condition)` and `describe.skip.if(condition)` patterns. maybe explicit skips are better than thrown errors?

**what exceptions or counterexamples exist?**
```ts
// alternative: explicit skip
const describeIf = hasApiKey ? describe : describe.skip;
describeIf('with api key', () => {
  it('does the thing', async () => { ... });
});
```

this makes test skips visible in ci output, rather than failures.

**issue found**: the vision proposes thrown errors, but explicit skips may be cleaner. need to clarify:
- throw ConstraintError → test fails, blocks ci
- use describe.skip → test skipped, ci passes with warning

which is the intended behavior? the wish says tests should "fail loudly", but explicit skip may be acceptable if the skip reason is visible.

**verdict: question for wisher** — should absent resources cause test failures or explicit skips?

---

### assumption 5: "the behavior guard glob pattern works for both prod and test"

**what do we assume here without evidence?**
that `code.{prod,test}/**/rule.forbid.failhide*.md` will find rules in both directories.

**what if the opposite were true?**
the glob syntax `{prod,test}` is bash brace expansion. it may not work in all contexts (e.g., node glob libraries).

**what exceptions or counterexamples exist?**
some glob implementations don't support brace expansion. need to verify the guard's glob library supports it.

**verdict: verify** — check if the guard's glob implementation supports brace expansion.

---

### assumption 6: "'failloud' is a useful new term"

**what do we assume here without evidence?**
that tests need a distinct term from prod code's "failfast".

**did the wisher actually say this?**
yes — the wish says "failloud (require)" as distinct from "failfast (require)".

**what if the opposite were true?**
"failfast" could apply to both:
- prod: exit/throw on bad state
- test: fail test on bad state

the semantics are the same: detect bad state early and stop.

**what exceptions or counterexamples exist?**
none — the distinction between "fast" and "loud" is stylistic, not semantic.

**issue found**: in my previous review, I already flagged this. "failloud" adds cognitive load without clear benefit. recommend asking wisher to confirm.

**verdict: question for wisher** — already flagged in previous review.

---

## summary

| assumption | verdict | action |
|------------|---------|--------|
| three valid test states | holds with refinement | clarify "conditional verification" vs "conditional pass-through" |
| conditional assertions are bugs | issue | refine to: both branches must verify something |
| multiple exit codes suspicious | holds with context | suspicious when used to hide errors |
| ConstraintError for failures | question | ask: failures or skips? |
| glob pattern works | verify | check glob library support |
| failloud term | question | already flagged |

## fixes applied

**fix for assumption 2**: updated the vision to distinguish conditional verification from conditional pass-through would be needed, but I'll note this for criteria phase.

## questions added to vision

already captured in "questions for wisher" section:
1. should absent resources cause test failures or explicit skips?
2. is `failloud` the right term?
