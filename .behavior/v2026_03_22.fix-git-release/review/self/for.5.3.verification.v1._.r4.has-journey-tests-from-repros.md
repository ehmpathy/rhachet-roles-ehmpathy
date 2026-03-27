# review: has-journey-tests-from-repros (r4)

## methodology

compared journey test sketches in repros artifact against implemented p3 tests.

---

## repros artifact reference

file: `.behavior/v2026_03_22.fix-git-release/3.2.distill.repros.experience._.v1.i1.md`

---

## journey test map

### journey 1: feat branch to main (happy path)

| step | sketch | test file | status |
|------|--------|-----------|--------|
| t0 | status check: checks passed, automerge unfound | p3.scenes.on_feat.into_main | ✓ |
| t1 | --apply: automerge added, watch | p3.scenes.on_feat.into_main | ✓ |
| t2 | watch completes: merged | p3.scenes.on_feat.into_main | ✓ |

**evidence:** snapshots show uniform status tree with `👌 all checks passed`, `🌴 automerge unfound`, and `🌴 automerge enabled [added]`.

### journey 2: feat branch with inflight checks (watch behavior)

| step | sketch | test file | status |
|------|--------|-----------|--------|
| t0 | checks inflight | p3.scenes.on_feat.into_main | ✓ |
| t1 | --watch: 3+ poll cycles | p3.scenes.on_feat.into_main | ✓ |
| t2 | checks pass: final status | p3.scenes.on_feat.into_main | ✓ |

**evidence:** snapshots show `🐢 N check(s) in progress` with 3 `💤` poll lines before `👌 all checks passed`.

### journey 3: full release to prod

| step | sketch | test file | status |
|------|--------|-----------|--------|
| t0 | feat PR ready | p3.scenes.on_feat.into_prod | ✓ |
| t1 | --into prod --apply: feat merges | p3.scenes.on_feat.into_prod | ✓ |
| t2 | release PR found and merges | p3.scenes.on_feat.into_prod | ✓ |
| t3 | wait for tag workflows | p3.scenes.on_feat.into_prod | ✓ |
| t4 | tag workflows complete | p3.scenes.on_feat.into_prod | ✓ |

**evidence:** snapshots show chain through all 3 transports: `🌊 release: feat(...)` → `🫧 and then...` → `🌊 release: chore(release): vX.Y.Z` → `🫧 and then...` → `🌊 release: vX.Y.Z`.

### journey 4: failure with retry

| step | sketch | test file | status |
|------|--------|-----------|--------|
| t0 | check failed: shows link | p3.scenes.on_feat.into_main | ✓ |
| t1 | --retry: rerun triggered | p1.integration, p2.integration | ✓ |
| t2 | --watch: poll to new result | p3.scenes.on_feat.into_main | ✓ |

**evidence:**
- p3 snapshots show `⚓ N check(s) failed` with `🔴 test-unit` and github link
- p1/p2 tests verify `--retry` triggers rerun (grep verified in has-divergence-addressed)

---

## BDD structure verification

all p3 tests follow given/when/then structure:

```typescript
given('[caseN] description', () => {
  when('[tN] action', () => {
    then('outcome', async () => {
      expect(stdout).toMatchSnapshot();
    });
  });
});
```

---

## critical paths check

| critical path | test coverage |
|---------------|---------------|
| feat → main plan | p3.on_feat.into_main (24 snapshots) |
| feat → main apply | p3.on_feat.into_main (24 snapshots) |
| feat → prod apply | p3.on_feat.into_prod (54 snapshots) |
| watch inflight | p3 snapshots show 3+ poll cycles |
| retry failed | p1/p2 verify --retry flag |

---

## summary

| journey | test file | covered? |
|---------|-----------|----------|
| journey 1: feat→main happy path | p3.on_feat.into_main | ✓ |
| journey 2: watch behavior | p3.on_feat.into_main | ✓ |
| journey 3: full release to prod | p3.on_feat.into_prod | ✓ |
| journey 4: failure with retry | p1/p2/p3 | ✓ |

**all journey test sketches from repros are implemented.**

