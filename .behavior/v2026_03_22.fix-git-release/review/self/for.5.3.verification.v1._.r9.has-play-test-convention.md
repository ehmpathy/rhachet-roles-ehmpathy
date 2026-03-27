# review: has-play-test-convention (r9)

## methodology

checked if journey tests use `.play.test.ts` suffix or an acceptable fallback convention.

---

## file inventory

```
src/domain.roles/mechanic/skills/git.release/
├── git.release.p1.integration.test.ts           # phase 1: basic tests
├── git.release.p2.integration.test.ts           # phase 2: complex tests
├── git.release.p3.scenes.on_feat.from_main.integration.test.ts  # journey
├── git.release.p3.scenes.on_feat.into_main.integration.test.ts  # journey
├── git.release.p3.scenes.on_feat.into_prod.integration.test.ts  # journey
├── git.release.p3.scenes.on_main.from_feat.integration.test.ts  # journey
├── git.release.p3.scenes.on_main.into_main.integration.test.ts  # journey
└── git.release.p3.scenes.on_main.into_prod.integration.test.ts  # journey
```

---

## does this repo use `.play.test.ts`?

searched for `.play.test.ts` or `.play.integration.test.ts` files — none found.

**conclusion:** this repo does not use the `.play.` convention.

---

## fallback convention analysis

the repo uses `.p3.scenes.` prefix for journey tests:

| component | definition |
|-----------|------------|
| `p3` | phase 3 (end-to-end scenarios) |
| `scenes` | scenario-based test structure |
| `on_feat.into_main` | specific journey: feature branch to main |
| `.integration.test.ts` | test runner classification |

**is this acceptable?**

yes, because:

1. **clear distinction**: `p3.scenes` clearly separates journey tests from `p1` and `p2` unit/integration tests

2. **semantic clarity**: the `scenes` keyword explicitly signals scenario-based tests

3. **runner compatibility**: `.integration.test.ts` suffix works with the test runner

4. **consistency**: all 6 journey test files follow the same pattern

---

## verification checklist

| check | status |
|-------|--------|
| journey tests in right location? | ✓ — collocated with skill source |
| do they have `.play.` suffix? | ✗ — not supported in this repo |
| fallback convention used? | ✓ — `.p3.scenes.` |
| fallback is consistent? | ✓ — all 6 files match pattern |
| fallback is semantic? | ✓ — `p3.scenes` communicates purpose |

---

## summary

this repo uses `.p3.scenes.*.integration.test.ts` as the fallback convention for journey tests. this is acceptable because:

1. the pattern clearly communicates "phase 3 scenario tests"
2. all journey tests follow the same convention
3. the test runner recognizes `.integration.test.ts` suffix

**no issue found.**

