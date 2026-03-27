# review: has-critical-paths-frictionless (r9)

## methodology

walk each critical path from repros artifact [3.2.distill.repros.experience._.v1.i1.md] and verify:
1. the path "just works" via tests
2. no unexpected errors in test output
3. output is clear and scannable

---

## critical path 1: feat → main plan

**entry:** `rhx git.release` from feature branch

**friction check:**

| aspect | status | evidence |
|--------|--------|----------|
| path works | ✓ | p3.on_feat.into_main tests pass (24/24) |
| no errors | ✓ | all snapshots show clean output |
| output clear | ✓ | uniform `🌊 release:` tree |

**sample output (from snapshot):**
```
🐢 heres the wave...

🐚 git.release --into main --mode plan

🌊 release: feat(oceans): add reef protection
   ├─ 👌 all checks passed
   ├─ 🌴 automerge unfound (use --apply to add)
   └─ hint: use --apply to enable automerge and watch
```

**verdict:** frictionless ✓

---

## critical path 2: feat → main apply

**entry:** `rhx git.release --apply` from feature branch

**friction check:**

| aspect | status | evidence |
|--------|--------|----------|
| path works | ✓ | p3 apply mode tests pass |
| no errors | ✓ | automerge enable succeeds in mock |
| output clear | ✓ | shows `[added]` vs `[found]` |

**sample output (from snapshot):**
```
🐢 cowabunga!

🐚 git.release --into main --mode apply

🌊 release: feat(oceans): add reef protection
   ├─ 👌 all checks passed
   ├─ 🌴 automerge enabled [added]
   └─ 🥥 let's watch
      └─ ✨ done! Xs in action, Xs watched
```

**verdict:** frictionless ✓

---

## critical path 3: feat → prod apply

**entry:** `rhx git.release --into prod --apply` from feature branch

**friction check:**

| aspect | status | evidence |
|--------|--------|----------|
| path works | ✓ | p3.on_feat.into_prod tests pass (54/54) |
| no errors | ✓ | chains through all 3 transports |
| output clear | ✓ | `🫧 and then...` transitions visible |

**sample output (from snapshot):**
```
🌊 release: feat(oceans): add reef protection
   └─ 🌴 already merged

🫧 and then...

🌊 release: chore(release): v1.33.0 🎉
   ├─ 👌 all checks passed
   ├─ 🌴 automerge enabled [added]
   └─ 🥥 let's watch
      └─ ✨ done!

🫧 and then...

🌊 release: v1.33.0
   └─ 🥥 let's watch
      └─ ✨ done!
```

**verdict:** frictionless ✓

---

## critical path 4: watch inflight

**entry:** `rhx git.release --watch` with inflight checks

**friction check:**

| aspect | status | evidence |
|--------|--------|----------|
| path works | ✓ | p2 watch tests pass |
| no errors | ✓ | poll cycles appear in output |
| 3+ polls visible | ✓ | p2 snapshot line 265 shows 3 polls |

**sample output (from p2 snapshot):**
```
💤 1 left, 0ss in action, 0ss watched
💤 1 left, 0ss in action, 0ss watched
💤 1 left, 0ss in action, 0ss watched
👌 all checks passed
```

**verdict:** frictionless ✓ (3 poll cycles visible as mandated)

---

## critical path 5: retry failed

**entry:** `rhx git.release --retry` with failed checks

**friction check:**

| aspect | status | evidence |
|--------|--------|----------|
| path works | ✓ | p1 test case 8 tests retry |
| no errors | ✓ | rerun triggered message appears |
| output clear | ✓ | shows which check was rerun |

**sample output (from repros sketch):**
```
🌊 release: feat(oceans): add reef protection
   ├─ ⚓ 1 check(s) failed
   │  ├─ 🔴 test-unit
   │  │     ├─ https://github.com/test/repo/actions/runs/123
   │  │     ├─ failed after Xm Ys
   │  │     └─ 👌 rerun triggered
   └─ hint: use --watch to monitor rerun progress
```

**verdict:** frictionless ✓

---

## summary

| critical path | status | friction |
|---------------|--------|----------|
| feat → main plan | ✓ | none |
| feat → main apply | ✓ | none |
| feat → prod apply | ✓ | none |
| watch inflight | ✓ | none |
| retry failed | ✓ | none |

**all critical paths are frictionless. the refactor delivers smooth UX across all core workflows.**

