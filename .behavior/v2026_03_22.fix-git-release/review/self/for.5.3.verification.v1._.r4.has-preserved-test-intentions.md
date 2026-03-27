# review: has-preserved-test-intentions (r4)

## methodology

r3 identified one test that was intentionally changed. r4 asks: could there be hidden test intention loss?

---

## skeptical re-examination

### could other tests have been silently weakened?

searched for changes to assertions in p1/p2:

| file | assertion changes | status |
|------|-------------------|--------|
| p1.integration.test.ts | only flag rename `--to` → `--into` | ✓ unchanged |
| p2.integration.test.ts | only flag rename `--to` → `--into` | ✓ unchanged |

**verification:** ran `git diff origin/main -- *.test.ts | grep -E 'expect.*toEqual|expect.*toContain|expect.*toMatch'` — all assertions unchanged except for the one documented case.

### could snapshot updates hide intention loss?

snapshots were updated to reflect `--into` instead of `--to`. this is purely cosmetic:

```diff
-🐚 git.release --to main
+🐚 git.release --into main
```

the output structure, assertions, and test behavior are unchanged.

### the changed test: deeper analysis

**original test (p1 line 278):**
```typescript
when('[t2] on main branch with release PR', () => {
  then('shows release PR status', () => {
    // mock: returns PR 99 as release PR
    const result = runSkill(['--to', 'main'], { tempDir, fakeBinDir });
    expect(result.stdout).toMatchSnapshot();
    expect(result.status).toEqual(0);
  });
});
```

**intent:** when on main and asked to release to main, show the release PR status.

**new test:**
```typescript
when('[t2] on main branch with --into main', () => {
  then('ConstraintError: cannot merge main into main', () => {
    const result = runSkill(['--into', 'main'], { tempDir, fakeBinDir });
    expect(result.stderr).toContain('--from main --into main is invalid');
    expect(result.status).toEqual(2);
  });
});
```

**new intent:** when on main and asked to release to main, error because main → main is nonsensical.

**why this is not intent loss:**

1. **the original intent was ambiguous** — "release to main" from main could mean:
   - release the current branch (main) to main → nonsensical
   - release to prod via the release PR → this is what the test actually did

2. **the wish clarified the intent** — scene.4 explicitly declares `--from main --into main` → ConstraintError

3. **the valid behavior is covered elsewhere** — p2 line 1748 tests "on main, show release PR status" with explicit `--into prod`

---

## hostile reviewer questions

**Q: did you lose the "on main, show release PR" test?**

A: no. the test moved to p2 line 1748 with explicit `--into prod`. the original p1 test covered an edge case that is now invalid.

**Q: why didn't you keep both tests?**

A: the original test used `--to main` which now means "release to main". from main, this is `--from main --into main` which is invalid. the test covered the wrong case.

**Q: could this be malicious deception?**

A: the change is documented in the wish (scene.4), the new behavior is explicit (ConstraintError with clear message), and the original valid behavior is covered in p2. this is a requirements change, not deception.

---

## intent preservation summary

| original test | original intent | preserved? | where? |
|---------------|-----------------|------------|--------|
| "on main with release PR" | show release PR status | ✓ | p2 line 1748 |
| flag `--to main` | release to main target | ✓ | renamed to `--into main` |

**no test intentions were lost. one test was changed per requirements.**

---

## summary

| check | status |
|-------|--------|
| no assertions silently weakened | ✓ |
| snapshot updates are cosmetic only | ✓ |
| changed test has documented requirement | ✓ |
| original valid behavior still covered | ✓ |

**test intentions preserved. requirements change documented in wish.**

