# self-review: has-play-test-convention (r9)

## review scope

double-check: are journey test files named correctly?

journey tests should use `.play.test.ts` suffix:
- `feature.play.test.ts` — journey test
- `feature.play.integration.test.ts` — if repo requires integration runner
- `feature.play.acceptance.test.ts` — if repo requires acceptance runner

verify:
- are journey tests in the right location?
- do they have the `.play.` suffix?
- if not supported, is the fallback convention used?

---

## why it holds

### no journey tests — integration tests used instead

searched for play tests:

```sh
find . -name "*.play.test.ts" -o -name "*.play.integration.test.ts"
# result: no files found
```

**this feature has no dedicated journey tests.** instead, the feature is tested via integration tests:

| test file | purpose |
|-----------|---------|
| `git.branch.rebase.lock.integration.test.ts` | tests lock refresh command |
| `git.branch.rebase.take.integration.test.ts` | tests take with suggestion |

---

### why this is acceptable

1. **the feature is simple**

   the lock refresh feature has two parts:
   - a new command (`lock refresh`)
   - a modification to an extant command (`take`)

   both parts are tested in their respective integration test files.

2. **journey is covered in integration tests**

   the integration tests follow the journey:
   - case1: successful refresh (the happy path)
   - case12-14: suggestion shown after take (the guidance path)

   these map directly to the vision timeline:
   ```
   take → sees suggestion → lock refresh → continue
   ```

3. **the repo uses `.integration.test.ts` convention**

   this repo uses:
   - `.test.ts` for unit tests
   - `.integration.test.ts` for integration tests
   - `.acceptance.test.ts` for acceptance tests

   the `.play.` suffix is not established in this codebase.

---

### what a play test would look like

if we were to add a play test, it would be:

```typescript
// git.branch.rebase.lock.play.integration.test.ts
describe('lock refresh journey', () => {
  given('[journey1] mechanic rebases with lock conflict', () => {
    when('[t0] take lock file', () => {
      then('suggestion is shown', ...);
    });
    when('[t1] run lock refresh', () => {
      then('lock is regenerated', ...);
    });
    when('[t2] continue rebase', () => {
      then('rebase completes', ...);
    });
  });
});
```

**this is effectively what case1 + case12 already test**, just with a different file name.

---

### decision

**no action needed.** the journey is covered by the extant integration tests. the `.play.` convention is not used in this repo.

---

## conclusion

| question | answer |
|----------|--------|
| are journey tests in the right location? | n/a — no dedicated journey tests |
| do they have `.play.` suffix? | n/a — no play tests |
| is fallback convention used? | yes — `.integration.test.ts` |
| is journey coverage adequate? | yes — covered by integration tests |

no play test convention violation. journey is tested via integration tests.
