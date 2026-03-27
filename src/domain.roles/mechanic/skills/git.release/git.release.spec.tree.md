# git.release.spec.tree

## sequential dependency model

the three entities are processed in sequence, not in parallel. you can only reach entity N+1 if entity N is merged. this eliminates the cross product.

## state tree

```
feat PR (8 states)
├─ unfound       → exit 2 (release PR never reached)
├─ inflight      → watch → exit per result (release PR never reached)
├─ passed:wout   → exit 0 or apply (release PR never reached unless --into prod)
├─ passed:with   → watch → merge → continue to release PR (if --into prod)
├─ failed        → exit 2 (release PR never reached)
├─ rebase:behind → exit 2 (release PR never reached)
├─ rebase:dirty  → exit 2 (release PR never reached)
└─ merged        → release PR (8 states) when --into prod
                   ├─ unfound       → exit 0 (no release PR found, report only)
                   ├─ inflight      → watch → exit per result
                   ├─ passed:wout   → exit 0 or apply
                   ├─ passed:with   → watch → merge → continue to tags
                   ├─ failed        → exit 2
                   ├─ rebase:behind → exit 2
                   ├─ rebase:dirty  → exit 2
                   └─ merged        → tags (4 states)
                                      ├─ unfound  → exit 0 (no tag workflows)
                                      ├─ inflight → watch → exit per result
                                      ├─ passed   → exit 0
                                      └─ failed   → exit 2 (or 0 in plan mode)
```

## state enumeration

### scene.1: on feat, --into main (default)

| row | feat PR state | mode | expected exit | expected output |
|-----|---------------|------|---------------|-----------------|
| 1 | unfound | plan | 2 | crickets, hint push |
| 2 | unfound | watch | 2 | crickets, hint push |
| 3 | unfound | apply | 2 | crickets, hint push |
| 4 | inflight | plan | 0 | in progress |
| 5 | inflight | watch | 0→2 or 0 | watch cycles → result |
| 6 | inflight | apply | 0→0 | watch cycles → merged |
| 7 | passed:wout | plan | 0 | passed, hint apply |
| 8 | passed:wout | watch | 0 | passed (no watch needed) |
| 9 | passed:wout | apply | 0 | automerge added → merged |
| 10 | passed:with | plan | 0 | passed, automerge found |
| 11 | passed:with | watch | 0 | watch → merged |
| 12 | passed:with | apply | 0 | automerge found → merged |
| 13 | failed | plan | 2 | failed, hint retry |
| 14 | failed | watch | 2 | failed, hint retry |
| 15 | failed | apply | 2 | failed, hint retry |
| 16 | failed+retry | plan | 0 | rerun triggered |
| 17 | failed+retry | watch | 0→? | rerun → watch |
| 18 | failed+retry | apply | 0→? | rerun → watch → merge |
| 19 | rebase:behind | plan | 2 | needs rebase |
| 20 | rebase:behind | watch | 2 | needs rebase |
| 21 | rebase:behind | apply | 2 | needs rebase |
| 22 | rebase:dirty | plan | 2 | needs rebase+conflicts |
| 23 | rebase:dirty | watch | 2 | needs rebase+conflicts |
| 24 | rebase:dirty | apply | 2 | needs rebase+conflicts |
| 25 | merged | plan | 0 | already merged |
| 26 | merged | watch | 0 | already merged |
| 27 | merged | apply | 0 | already merged |

**total: 27 rows**

### scene.5: on main, --into prod (default)

this is release-branch + tags only (no feat PR).

| row | release PR state | tag state | mode | expected exit |
|-----|------------------|-----------|------|---------------|
| 1 | unfound | - | plan | 0 (no release PR) |
| 2 | unfound | - | watch | 0 |
| 3 | unfound | - | apply | 0 |
| 4 | inflight | - | plan | 0 |
| 5 | inflight | - | watch | 0→? |
| 6 | inflight | - | apply | 0→? |
| 7 | passed:wout | - | plan | 0 |
| 8 | passed:wout | - | watch | 0 |
| 9 | passed:wout | - | apply | 0 (merge) |
| 10 | passed:with | - | plan | 0 |
| 11 | passed:with | - | watch | 0→merge→tags |
| 12 | passed:with | - | apply | 0→merge→tags |
| 13 | failed | - | plan | 2 |
| 14 | failed | - | watch | 2 |
| 15 | failed | - | apply | 2 |
| 16 | rebase:behind | - | plan | 2 |
| 17 | rebase:behind | - | watch | 2 |
| 18 | rebase:behind | - | apply | 2 |
| 19 | rebase:dirty | - | plan | 2 |
| 20 | rebase:dirty | - | watch | 2 |
| 21 | rebase:dirty | - | apply | 2 |
| 22 | merged | unfound | plan | 0 |
| 23 | merged | unfound | watch | 0 |
| 24 | merged | unfound | apply | 0 |
| 25 | merged | inflight | plan | 0 |
| 26 | merged | inflight | watch | 0→? |
| 27 | merged | inflight | apply | 0→? |
| 28 | merged | passed | plan | 0 |
| 29 | merged | passed | watch | 0 |
| 30 | merged | passed | apply | 0 |
| 31 | merged | failed | plan | 0 (informational) |
| 32 | merged | failed | watch | 2 |
| 33 | merged | failed | apply | 2 |

**total: 33 base rows** (+ retry variants)

### scene.2: on feat, --into prod

combines feat PR → release PR → tags.

| row | feat PR | release PR | tags | mode | expected |
|-----|---------|------------|------|------|----------|
| 1-8 | terminal states | - | - | plan/watch/apply | exit per feat |
| 9+ | merged | terminal states | - | plan/watch/apply | exit per release |
| 17+ | merged | merged | terminal | plan/watch/apply | exit per tag |

**total: 63 rows** (8 feat × + release transitions + tag transitions)

## notes

- `transitions: true` enables counter-based state progression in mocks
- watch cycles must show at least 3 poll iterations per the wish
- retry variants add ~27 additional snapshots across all scenes
