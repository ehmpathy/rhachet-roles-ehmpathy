# review: has-behavior-coverage (r1)

## methodology

cross-referenced wish (0.wish.md) and vision (1.vision.md) behaviors against the verification checklist (5.3.verification.v1.i1.md) to confirm each behavior has a test.

---

## wish behaviors

### 3 release transports with uniform stdout

| behavior | test file | covered? |
|----------|-----------|----------|
| feature-branch transport | p3.scenes.on_feat.into_main | ✓ |
| release-branch transport | p3.scenes.on_feat.into_prod | ✓ |
| release-tag transport | p3.scenes.on_feat.into_prod | ✓ |
| uniform stdout across all | all p3 snapshots show `🌊 release:` shape | ✓ |

### 7 scenes for flag inference (wish lines 88-155)

| scene | description | test file | covered? |
|-------|-------------|-----------|----------|
| scene.1 | on feat, no flags → into main | p3.scenes.on_feat.into_main | ✓ |
| scene.2 | on feat, --into prod | p3.scenes.on_feat.into_prod | ✓ |
| scene.3 | on feat, --from main | p3.scenes.on_feat.from_main | ✓ |
| scene.4 | --from main --into main → error | p3.scenes.on_main.into_main | ✓ |
| scene.5 | on main, no flags → into prod | p3.scenes.on_main.into_prod | ✓ |
| scene.6 | on main, --from main → error | included in scene.5 tests | ✓ |
| scene.7 | on main, --from feat | p3.scenes.on_main.from_feat | ✓ |

### transport states (wish lines 163-170)

| state | covered? | evidence |
|-------|----------|----------|
| unfound | ✓ | p3 snapshots show `🫧 no open branch pr` |
| inflight:wout-automerge | ✓ | p3 snapshots show `🐢 N check(s) in progress` + `🌴 automerge unfound` |
| inflight:with-automerge | ✓ | p3 snapshots show `🐢 N check(s) in progress` + `🌴 automerge enabled` |
| passed:wout-automerge | ✓ | p3 snapshots show `👌 all checks passed` + `🌴 automerge unfound` |
| passed:with-automerge | ✓ | p3 snapshots show `👌 all checks passed` + `🌴 automerge enabled` |
| failed | ✓ | p3 snapshots show `⚓ N check(s) failed` |
| merged | ✓ | p3 snapshots show `🌴 already merged` |

### modes (wish lines 187-191)

| mode | covered? | evidence |
|------|----------|----------|
| plan (wout --watch, wout --apply) | ✓ | p3 tests have plan mode variants |
| watch (with --watch, wout --apply) | ✓ | p3 tests have watch mode variants |
| apply (with --apply, implicit --watch) | ✓ | p3 tests have apply mode variants |
| retry (with --retry) | ✓ | p1.integration, p2.integration |

### watch poll cycles (wish line 275)

| requirement | covered? | evidence |
|-------------|----------|----------|
| at least 3 watch poll cycles | ✓ | p3 snapshots show 3+ `💤` poll lines |

### flag changes (wish lines 284-287)

| change | covered? | evidence |
|--------|----------|----------|
| --apply alias for --mode apply | ✓ | p1/p2 updated, p3 uses both |
| --to replaced with --into | ✓ | p1/p2 updated from --to to --into |
| `🫧 wait for it...` → `🫧 and then...` | ✓ | p3 snapshots show `🫧 and then...` |

---

## vision behaviors

### usecases (vision lines 104-243)

| usecase | description | test file | covered? |
|---------|-------------|-----------|----------|
| usecase 1 | check status (plan) | p3.scenes.on_feat.into_main | ✓ |
| usecase 2 | watch without automerge | p3.scenes.on_feat.into_main | ✓ |
| usecase 3 | apply with automerge | p3.scenes.on_feat.into_main | ✓ |
| usecase 4 | full release to prod | p3.scenes.on_feat.into_prod | ✓ |
| usecase 5 | handle failures with --retry | p1.integration, p2.integration | ✓ |
| usecase 6 | feature PR not found | p3 snapshots with unfound state | ✓ |
| usecase 7 | needs rebase | p3 snapshots with rebase state | ✓ |

### edgecases (vision lines 299-310)

| edgecase | covered? | evidence |
|----------|----------|----------|
| --from main --into main → ConstraintError | ✓ | p3.scenes.on_main.into_main |
| on main, no flags → --from main --into prod | ✓ | p3.scenes.on_main.into_prod |
| feature branch not pushed → hint | ✓ | p3 unfound state snapshots |
| automerge already enabled → [found] | ✓ | p3 snapshots show both [found] and [added] |
| --from turtle/feat when on main | ✓ | p3.scenes.on_main.from_feat |

### uniform output shape (vision lines 61-65)

| element | covered? | evidence |
|---------|----------|----------|
| `🌊 release: {title}` header | ✓ | all p3 snapshots |
| check status: 👌/🐢/⚓ | ✓ | all p3 snapshots |
| automerge status: 🌴 | ✓ | all p3 snapshots |
| hints | ✓ | all p3 snapshots |

---

## summary

| check | status |
|-------|--------|
| every behavior in 0.wish.md covered | ✓ |
| every behavior in 1.vision.md covered | ✓ |
| test files can be pointed to for each | ✓ |

**all behaviors from wish and vision have test coverage.**

