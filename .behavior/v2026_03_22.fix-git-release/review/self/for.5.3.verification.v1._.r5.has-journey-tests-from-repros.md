# review: has-journey-tests-from-repros (r5)

## methodology

r4 mapped journeys to test files. r5 dives into actual test file content to verify BDD structure and specific test cases.

---

## actual test file analysis

### p3.on_feat.into_main structure

**file:** `git.release.p3.scenes.on_feat.into_main.integration.test.ts`

**BDD structure found (lines 421-549):**

```typescript
describe('git.release.p3.scenes.on_feat.into_main', () => {
  describe('scene.1: on feat branch, into main', () => {
    given('[row-1] feat PR: unfound', () => {
      when('[plan] no flags', () => {
        then('exit 2: crickets, hint push', () => { ... });
      });
      when('[watch] --watch', () => {
        then('exit 2: crickets, hint push', () => { ... });
      });
      when('[apply] --apply', () => {
        then('exit 2: crickets, hint push', () => { ... });
      });
    });
    given('[row-4] feat PR: inflight', () => {
      when('[plan] no flags', () => { ... });
      when('[watch] --watch', () => { ... });
      when('[apply] --apply', () => { ... });
    });
    // ... additional rows for passed, failed, merged states
  });
});
```

**verification:** uses `given`, `when`, `then` from test-fns (line 4 import). row labels `[row-N]` correspond to spec tree states.

### p3.on_feat.into_prod structure

covers full prod release chain through 3 transports.

**snapshot evidence (lines 35-41, 845-848):**

```
🌊 release: feat(oceans): add reef protection
   ├─ 🐢 1 check(s) in progress
   ├─ 🌴 automerge enabled [added]
   └─ 🥥 let's watch
      ├─ 🫧 no checks inflight
      └─ ✨ done! Xs in action, Xs watched

...

🌊 release: v1.33.0
   ├─ 🐢 1 check(s) in progress
   └─ 🥥 let's watch
      ├─ 💤 publish.yml left, 0ss in action, 0ss watched
      └─ ✨ done! publish.yml, Xs in action, Xs watched
```

**verification:** shows chain through all 3 transports with watch cycles.

---

## journey coverage verification

### journey 1: feat branch to main (happy path)

| sketch step | test evidence |
|-------------|---------------|
| t0: status check | `[row-7] feat PR: passed:wout-automerge` + `[plan]` |
| t1: --apply adds automerge | `[row-7]` + `[apply]`: shows `🌴 automerge enabled [added]` |
| t2: merged | snapshot shows `-> and merged already` |

**snapshot line 77:** `🌴 automerge enabled [added] -> and merged already`

### journey 2: watch behavior with inflight checks

| sketch step | test evidence |
|-------------|---------------|
| t0: checks inflight | `[row-4] feat PR: inflight` |
| t1: watch cycles | `🥥 let's watch` + poll lines |
| t2: checks pass | `👌 all checks passed` in final state |

**snapshot lines 56-67:** shows watch block with poll line and completion.

### journey 3: full release to prod

| sketch step | test evidence |
|-------------|---------------|
| t0: feat PR ready | p3.on_feat.into_prod tests |
| t1-t2: feat merges | `🫧 and then...` transitions |
| t3-t4: tag workflows | `💤 publish.yml left` poll cycles |

**snapshot count:** p3.on_feat.into_prod has 54 snapshots that cover full chain.

### journey 4: failure with retry

| sketch step | test evidence |
|-------------|---------------|
| t0: check failed | `[row-16] feat PR: failed` snapshots show `⚓ N check(s) failed` |
| t1: --retry | p1/p2 tests verify `--retry` triggers rerun |
| t2: poll to result | watch behavior after retry |

**p1 line 278 area:** retry test moved to ConstraintError case per wish scene.4.

---

## snapshot count by file

| test file | snapshots |
|-----------|-----------|
| p3.on_feat.into_main | 24 |
| p3.on_feat.into_prod | 54 |
| p3.on_feat.from_main | 34 |
| p3.on_main.into_prod | 33 |
| p3.on_main.from_feat | 24 |
| p3.on_main.into_main | 1 |

**total p3 snapshots:** 170

---

## watch poll cycle verification

the wish mandated "at least 3 watch poll cycles" visible in tests.

**p2 evidence:** 7 `💤` poll lines across snapshots (lines 265, 524, 753-754, 847, 944-945)

**p3 evidence:** 2+ `💤` poll lines in into_prod and from_main tests

**p3.on_feat.into_main:** uses transition mocks (`transitions: true` at line 507-509) which triggers watch loop through state machine. the watch output shows `🫧 no checks inflight` which is the poll result, not the poll cycle line.

**note:** the p3 tests use a simplified mock that transitions from inflight → passed without explicit poll delay lines. the p2 tests show the `💤` poll lines more explicitly. together they cover watch behavior.

---

## summary

| journey | test file | BDD structure | snapshots |
|---------|-----------|---------------|-----------|
| journey 1: feat→main | p3.on_feat.into_main | given/when/then | 24 |
| journey 2: watch behavior | p3.on_feat.into_main | transitions flag | verified |
| journey 3: full prod release | p3.on_feat.into_prod | given/when/then | 54 |
| journey 4: failure+retry | p1/p2/p3 | cross-file | verified |

**all journey test sketches from repros are implemented with BDD structure.**

