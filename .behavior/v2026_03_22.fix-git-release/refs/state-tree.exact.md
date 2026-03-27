# state-tree.exact

## sequential dependency

the three transports are processed in sequence:
1. feat PR (if goal.from = feat)
2. release PR (if goal.into = prod)
3. release-tag workflows (if goal.into = prod)

you can only reach transport N+1 if transport N is merged. non-merged states are terminal — they exit and never reach subsequent transports.

---

## transport states

### PR transports (feat-branch, release-branch)

| state | description | terminal? |
|-------|-------------|-----------|
| unfound | no open PR for branch | yes |
| inflight:wout | checks in progress, automerge not enabled | yes |
| inflight:with | checks in progress, automerge enabled | yes |
| passed:wout | checks passed, automerge not enabled | yes |
| passed:with | checks passed, automerge enabled, await merge | yes |
| failed | checks failed | yes |
| rebase:behind | PR behind base branch | yes |
| rebase:dirty | PR has merge conflicts | yes |
| merged | PR merged | no (continue) |

**count: 8 states for PRs, 7 terminal + 1 continue**

### tag transport (release-tag)

| state | description | terminal? |
|-------|-------------|-----------|
| unfound | no tag workflows found | yes |
| inflight | workflows in progress | yes |
| passed | workflows completed | yes |
| failed | workflows failed | yes |

**count: 4 states for tags, all terminal**

---

## scene state counts (from spec.matrix.md)

### scene.1: feat → main

**source: "to main, from feat" matrix**

| # | feat PR state |
|---|---------------|
| 1 | unfound |
| 2 | inflight:wout |
| 3 | inflight:with |
| 4 | passed:wout |
| 5 | passed:with |
| 6 | failed |
| 7 | rebase:behind |
| 8 | merged |

**state rows: 8**
**× 3 modes (plan/watch/apply) = 24 snapshots**

---

### scene.2: feat → prod

**source: "to prod, from feat" matrix (includes rebase rows)**

the sequential dependency creates a tree, not a cross product:

```
feat PR
├─ unfound         → row 1
├─ inflight:wout   → row 2
├─ inflight:with   → row 3
├─ passed:wout     → row 4
├─ passed:with     → row 5
├─ failed          → row 6
├─ rebase:behind   → row 7
└─ merged          → release PR
                     ├─ unfound         → row 8
                     ├─ inflight:wout   → row 9
                     ├─ inflight:with   → row 10
                     ├─ passed:wout     → row 11
                     ├─ passed:with     → row 12
                     ├─ failed          → row 13
                     ├─ rebase:behind   → row 14
                     └─ merged          → tags
                                          ├─ unfound  → row 15
                                          ├─ inflight → row 16
                                          ├─ passed   → row 17
                                          └─ failed   → row 18
```

**derivation**: 7 feat terminals + 7 release terminals + 4 tag terminals = 18

**state rows: 18**
**× 3 modes (plan/watch/apply) = 54 snapshots**

---

### scene.3: --from main → prod

**source: "to prod, from main" matrix (includes rebase rows)**

skips feat PR, starts at release PR:

| # | release PR | tags | notes |
|---|------------|------|-------|
| 1 | unfound | — | no release PR |
| 2 | inflight:wout | — | pending |
| 3 | inflight:with | — | pending with automerge |
| 4 | passed:wout | — | ready |
| 5 | passed:with | — | ready with automerge |
| 6 | failed | — | blocked |
| 7 | rebase:behind | — | needs rebase |
| 8 | rebase:dirty | — | conflicts |
| 9 | merged | unfound | no tag workflows |
| 10 | merged | inflight | tag active |
| 11 | merged | passed | tag done |
| 12 | merged | failed | tag failed |

**derivation**: 8 release states + 4 tag states when release merged, but release:merged is not a terminal snapshot (it shows tags). so 7 release terminals + 4 tag terminals + 3 additional release:merged × tag-not-unfound = wait, let me recalculate.

actually: the matrix rows are the observable states. each row = one snapshot.
- release PR non-merged: 7 states (unfound through rebase:dirty, excluding merged)
- release PR merged: 1 state × 4 tag states = 4 rows
- but "release merged + tag unfound" is one row, not two separate rows

let me count from spec matrix: "to prod, from main" = 12 rows, +2 rebase = 14 rows.

**state rows: 14**
**× 3 modes (plan/watch/apply) = 42 snapshots**

---

### scene.4: --from main --into main

**ConstraintError case**

| # | condition |
|---|-----------|
| 1 | from=main, into=main → error |

**state rows: 1**
**× 1 mode (error, no watch/apply) = 1 snapshot**

---

### scene.5: on main branch, no flags

**same as scene.3** (inferred --from main --into prod)

**state rows: 14**
**× 3 modes = 42 snapshots**

---

### scene.6: on main, --into main

**ConstraintError case** (on main branch with explicit --into main flag)

| # | condition |
|---|-----------|
| 1 | on main, --into main → error (can't merge main into main) |

**state rows: 1**
**× 1 mode (error, no watch/apply) = 1 snapshot**

---

### scene.7: on main, --from feat-branch

**same as scene.1** (releases specific feat branch to main)

**state rows: 8**
**× 3 modes = 24 snapshots**

---

## totals

| scene | state rows | modes | snapshots |
|-------|------------|-------|-----------|
| scene.1: feat → main | 8 | 3 | 24 |
| scene.2: feat → prod | 18 | 3 | 54 |
| scene.3: on feat, --from main | 14 | 3 | 42 |
| scene.4: on feat, --from main --into main (error) | 1 | 1 | 1 |
| scene.5: on main, no flags | 14 | 3 | 42 |
| scene.6: on main, --into main (error) | 1 | 1 | 1 |
| scene.7: on main, --from feat | 8 | 3 | 24 |
| **base total** | **64** | — | **188** |

### retry variants

retry only applies to failed states. each scene with failed states gets additional snapshots:

| scene | failed rows | retry modes | retry snapshots |
|-------|-------------|-------------|-----------------|
| scene.1 | 1 (failed) | 3 | 3 |
| scene.2 | 3 (feat failed, release failed, tag failed) | 3 | 9 |
| scene.3 | 2 (release failed, tag failed) | 3 | 6 |
| scene.5 | 2 (release failed, tag failed) | 3 | 6 |
| scene.7 | 1 (failed) | 3 | 3 |
| **retry total** | **9** | | **27** |

### grand total

**base snapshots: 188**
**retry snapshots: 27**
**grand total: 215 snapshots**

---

## file organization

| file | scenes | snapshots |
|------|--------|-----------|
| `on_main.into_prod` | 5 | 48 |
| `on_main.from_feat` | 7 | 27 |
| `on_main.into_main` | 6 | 1 |
| `on_feat.into_main` | 1 | 27 |
| `on_feat.into_prod` | 2 | 63 |
| `on_feat.from_main` | 3, 4 | 49 |
| **total** | **7 scenes** | **215** |

---

## test structure

6 files organized by context:

```
git.release.p3.scenes.on_main.into_prod.integration.test.ts  # scene 5 (48)
git.release.p3.scenes.on_main.from_feat.integration.test.ts  # scene 7 (27)
git.release.p3.scenes.on_main.into_main.integration.test.ts  # scene 6 (1)
git.release.p3.scenes.on_feat.into_main.integration.test.ts  # scene 1 (27)
git.release.p3.scenes.on_feat.into_prod.integration.test.ts  # scene 2 (63)
git.release.p3.scenes.on_feat.from_main.integration.test.ts  # scenes 3,4 (49)
```

example structure:

```typescript
// git.release.p3.scenes.on_feat.into_main.integration.test.ts
describe('git.release.p3.scenes.on_feat.into_main', () => {
  given('scene.1: on feat branch, into main', () => {
    given('flags: plan mode', () => {
      given('feat PR: unfound', () => {
        when('rhx git.release', () => {
          then('shows no PR message', async () => {
            expect(stdout).toMatchSnapshot();
          });
        });
      });
      given('feat PR: inflight:wout', () => { /* ... */ });
      // ... 8 states
    });
    given('flags: watch mode', () => { /* ... 8 states */ });
    given('flags: apply mode', () => { /* ... 8 states */ });
  });
});
```
