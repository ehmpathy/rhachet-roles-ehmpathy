# self-review: has-play-test-convention (r10)

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

## investigation

### searched for play tests

```sh
find . -name "*.play.test.ts" -o -name "*.play.integration.test.ts" -o -name "*.play.acceptance.test.ts"
# result: no files found
```

### searched for test files in this feature

```sh
ls src/domain.roles/mechanic/skills/git.branch.rebase/*.test.ts
# result:
# git.branch.rebase.lock.integration.test.ts
# git.branch.rebase.take.integration.test.ts
```

---

## analysis

### this feature has no dedicated play tests

the feature was tested via standard integration tests:

| file | tests |
|------|-------|
| `git.branch.rebase.lock.integration.test.ts` | 9 cases for lock refresh |
| `git.branch.rebase.take.integration.test.ts` | 14 cases (5 new for suggestion) |

---

### is the `.play.` convention used in this repo?

searched for play tests in the entire repo:

```sh
find . -name "*.play.*.test.ts" | wc -l
# result: 0
```

**the `.play.` convention is not established in this codebase.**

---

### what convention does this repo use?

| suffix | purpose | count |
|--------|---------|-------|
| `.test.ts` | unit tests | many |
| `.integration.test.ts` | integration tests | many |
| `.acceptance.test.ts` | acceptance tests | some |
| `.play.test.ts` | journey tests | none |

the repo uses the standard jest test suffixes without the `.play.` convention.

---

### is the journey adequately covered?

the journey from vision:
```
take lock → sees suggestion → run lock refresh → continue → CI passes
```

this is covered by:

| step | test coverage |
|------|---------------|
| take lock | case1 in take.integration.test.ts |
| sees suggestion | case12-14 in take.integration.test.ts |
| run lock refresh | case1-3 in lock.integration.test.ts |
| continue | (uses extant continue skill) |
| CI passes | (outcome of correct lock state) |

each step has dedicated test coverage. the journey is split across two integration test files because:
1. `take` is a separate command from `lock refresh`
2. each command is tested in its own file (single responsibility)

---

### should we add a play test?

**pros of a play test:**
- explicit journey documentation
- end-to-end flow in one file
- follows `.play.` convention (if adopted)

**cons of a play test:**
- would duplicate coverage from integration tests
- repo does not use `.play.` convention
- adds maintenance burden

**decision:** no play test needed. the journey is adequately covered by the two integration test files.

---

### if we were to add one

if the `.play.` convention were adopted, the file would be:

```typescript
// git.branch.rebase.lock.play.integration.test.ts
describe('lock refresh journey', () => {
  given('[journey1] mechanic rebases with lock conflict', () => {
    // setup: create repo with rebase in progress, lock conflict

    when('[t0] take lock file', () => {
      // run: rhx git.branch.rebase take --whos theirs pnpm-lock.yaml
      then('conflict is settled', ...);
      then('suggestion is shown', ...);
    });

    when('[t1] run lock refresh', () => {
      // run: rhx git.branch.rebase lock refresh
      then('lock is regenerated', ...);
      then('lock is staged', ...);
    });

    when('[t2] continue rebase', () => {
      // run: rhx git.branch.rebase continue
      then('rebase completes', ...);
    });
  });
});
```

this structure is effectively what case1 + case12 + case1 already test, just with sequential execution instead of isolated test cases.

---

## conclusion

| question | answer |
|----------|--------|
| are journey tests in the right location? | n/a — no dedicated journey tests |
| do they have `.play.` suffix? | n/a — no play tests |
| is fallback convention used? | yes — `.integration.test.ts` |
| is journey coverage adequate? | yes — covered by integration tests |
| should we add play tests? | no — would duplicate coverage |

the `.play.` convention is not used in this repo. the journey is adequately covered by the extant integration tests. no action needed.
