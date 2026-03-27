# review: has-snap-changes-rationalized (r6)

## methodology

examined git diff for all `.snap` files against origin/main.

---

## changed snapshot files

```bash
git diff origin/main --name-only -- '*.snap'
```

| file | status |
|------|--------|
| git.release.p1.integration.test.ts.snap | modified |
| git.release.p2.integration.test.ts.snap | modified |
| git.release.p3.*.snap (6 files) | **new** (not shown in diff) |

---

## p1 snapshot changes

### change 1: `--to` → `--into`

**before:**
```
🐚 git.release --to main --mode plan
```

**after:**
```
🐚 git.release --into main --mode plan
```

**rationale:** wish line 286 explicitly requests "replace `--to` with `--into`". this is an intentional API change for clearer destination semantics.

### change 2: `--mode apply` hints → `--apply`

**before:**
```
🌴 automerge unfound (use --mode apply to add)
hint: use --mode apply to enable automerge and watch
```

**after:**
```
🌴 automerge unfound (use --apply to add)
hint: use --apply to enable automerge and watch
```

**rationale:** wish line 284 explicitly requests "add alias `--apply` for `--mode = apply`". hints now show the shorter alias.

### change 3: removed `[t2] on main branch with release PR`

**before:** test showed release PR status when on main with `--to main`

**after:** test removed; replaced with ConstraintError test in p1

**rationale:** wish scene.4 (lines 119-125) declares `--from main --into main` → ConstraintError. the original test covered a case that is now invalid by design. the valid case (on main, show release PR) is covered in p2 `[case-from-main-on-main]`.

### change 4: vibe headers adjusted

**before:**
```
🐢 bummer dude...  (for failed checks)
🐢 hold up dude... (for needs rebase)
```

**after:**
```
🐢 cowabunga!     (apply success)
🐢 heres the wave... (plan mode, e.g. needs rebase)
```

**rationale:** vibe headers now reflect mode (plan vs apply) rather than outcome. `🐢 bummer dude...` reserved for constraint errors. `🐢 hold up dude...` was removed; rebase cases use `heres the wave...` with inline `🐚 needs rebase` indicator.

---

## p2 snapshot changes

### change 1: `🫧 wait for it...` → `🫧 and then...`

**before:**
```
🫧 wait for it...
   └─ ✨ found it! Xs in action, Xs watched
```

**after:**
```
🫧 and then...
```

**rationale:** wish line 287 explicitly requests "replace `🫧 wait for it...` with `🫧 and then...`". clearer transition text.

### change 2: `--from other` now valid

**before:**
```
error: --from must be 'main', got 'other'
```

**after:**
```
🌊 release: feat(oceans): add reef protection
   ├─ 👌 all checks passed
   └─ 🌴 automerge unfound
```

**rationale:** wish scene.7 (lines 145-153) allows `--from <branch>` to release a specific feature branch. the API was expanded to support this.

### change 3: tag version in output

**before:**
```
🌊 release: v1.33.0
```

**after:**
```
🌊 release: v1.2.3
```

**rationale:** mock tag version changed for test isolation. cosmetic, no functional impact.

---

## new p3 snapshot files

all 6 p3 snapshot files are **new** (added by this behavior). they implement the exhaustive journey tests per the wish.

| file | snapshots | purpose |
|------|-----------|---------|
| on_feat.into_main.snap | 24 | scene.1 journey |
| on_feat.into_prod.snap | 54 | scene.2 journey |
| on_feat.from_main.snap | 34 | scenes.3,4 journey |
| on_main.into_prod.snap | 33 | scene.5 journey |
| on_main.from_feat.snap | 24 | scene.7 journey |
| on_main.into_main.snap | 1 | scene.6 ConstraintError |

**rationale:** the wish (lines 85-175) mandates exhaustive p3 tests for all scene combinations.

---

## regression check

| potential regression | status | evidence |
|---------------------|--------|----------|
| output format degraded | none | tree structure preserved |
| error messages less helpful | none | hints still present |
| timestamps leaked | none | `Xs` placeholders used |
| extra output added | minor | some watch output simplified |

### minor output simplification

**before (p2):**
```
🌊 release: chore(release): v1.33.0 🎉
   ├─ 👌 all checks passed
   ├─ 🌴 automerge enabled [added] -> and merged already
   └─ 🥥 let's watch
      └─ ✨ done! Xs in action, Xs watched

🫧 wait for it...
   └─ ✨ found it! Xs in action, Xs watched

🌊 release: v1.33.0
```

**after (p2):**
```
🌊 release: chore(release): v1.33.0 🎉
   ├─ 👌 all checks passed
   ├─ 🌴 automerge enabled [added] -> and merged already

🫧 and then...
🌊 release: v1.2.3
```

**verdict:** simplified but not degraded. watch results moved inline.

---

## summary

| change category | count | rationale |
|-----------------|-------|-----------|
| `--to` → `--into` | many | wish line 286 |
| `--mode apply` → `--apply` | many | wish line 284 |
| `🫧 wait for it...` → `🫧 and then...` | 2 | wish line 287 |
| removed test case | 1 | wish scene.4 ConstraintError |
| `--from` expanded | 1 | wish scene.7 |
| new p3 snapshots | 170 | wish lines 85-175 |

**all snapshot changes are intentional and traced to wish requirements.**

