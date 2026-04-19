# self-review r3: has-preserved-test-intentions

## test file changes

from `git diff HEAD~5 -- src/domain.roles/mechanic/getMechanicRole.test.ts`:

### change 1: hook count 6 → 7

```diff
-      then('onBrain.onTool contains at least 6 hooks', () => {
+      then('onBrain.onTool contains at least 7 hooks', () => {
         expect(
           ROLE_MECHANIC.hooks?.onBrain?.onTool?.length,
-        ).toBeGreaterThanOrEqual(6);
+        ).toBeGreaterThanOrEqual(7);
```

**intention preserved?** yes. the test still verifies "at least N hooks registered". the count increased because we added a hook. this is not a weakened assertion - it's a stricter one.

### change 2: onStop test removed

```diff
-      then('onBrain.onStop contains at least 1 hook', () => {
-        expect(
-          ROLE_MECHANIC.hooks?.onBrain?.onStop?.length,
-        ).toBeGreaterThanOrEqual(1);
-      });
+
+      // .note = onStop removed: lint hook was too expensive (60s block)
+      // .todo = add onStop tests when brain.hooks.onPush lands
```

**intention preserved?** n/a - this change is from a prior commit (see recent commits: "fix(mechanic): remove lint onStop hook (#392)"). not part of this PR. the comment documents the removal reason.

### change 3: new test added

```diff
+      then('forbid-test-background hook is present and targets Bash', () => {
+        const hook = findHook('forbid-test-background');
+        expect(hook).toBeDefined();
+        expect(hook?.filter?.what).toEqual('Bash');
+        expect(hook?.filter?.when).toEqual('before');
+      });
```

**intention preserved?** n/a - new test. verifies the new hook is registered with correct filter.

## why it holds

1. **no extant assertions weakened.** the only assertion change (6 → 7) makes the test stricter, not weaker.

2. **no test cases removed by this PR.** the onStop removal was a prior commit (#392), not this PR.

3. **new test follows extant pattern.** the new test uses the same `findHook` pattern as other hook tests.

4. **no expected values changed to match broken output.** the count change reflects a real addition.

## gaps found

none. all test intentions preserved.
