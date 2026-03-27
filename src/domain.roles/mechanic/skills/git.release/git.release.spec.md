# git.release

## purpose

`git.release` automates the release cycle from feature branch to production. it handles PR status, CI checks, automerge, and tag workflows — so mechanics can push and release without a context switch to the browser.

## design

the skill follows a **plan/apply pattern** (like terraform):

- **plan** (default): show status, no mutations, safe to run anytime
- **apply** (`--mode apply` or `--apply`): enable automerge, watch until complete, advance through the release path
- **watch**: poll CI without automerge (observe only)

three release paths exist:

| from | into | entities |
|------|------|----------|
| feature branch | main | feature PR |
| main | prod | release PR → tag workflows |
| feature branch | prod | feature PR → release PR → tag workflows |

## usecases

### 1. check PR status (plan)

after push, see where things stand:

```bash
rhx git.release
```

```
🐢 heres the wave...

🐚 git.release --into main --mode plan

🌊 release: feat(auth): add oauth provider
   ├─ 👌 all checks passed
   ├─ 🌴 automerge unfound (use --mode apply to add)
   └─ [2mhint: use --mode apply to enable automerge and watch[0m
```

### 2. watch CI (no automerge)

poll until checks complete without automerge:

```bash
rhx git.release --watch
```

```
🐢 heres the wave...

🐚 git.release --into main --watch

🌊 release: feat(auth): add oauth provider
   ├─ 👌 all checks passed
   ├─ 🌴 automerge unfound (use --mode apply to add)
   └─ 🥥 let's watch
      ├─ 👌 all checks passed
      └─ [2mhint: use --mode apply to add automerge[0m
```

### 3. release to main (apply)

enable automerge and watch until merged:

```bash
rhx git.release --mode apply
```

```
🐢 cowabunga!

🐚 git.release --into main --mode apply

🌊 release: feat(auth): add oauth provider
   ├─ 🐢 2 check(s) in progress
   ├─ 🌴 automerge enabled [found]
   └─ 🥥 let's watch
      ├─ 💤 2 left, Xs in action, Xs watched
      ├─ 💤 1 left, Xs in action, Xs watched
      └─ ✨ done! Xs in action, Xs watched
```

### 4. release to prod (apply)

full release cycle — merge to main, then prod, then watch tag workflows:

```bash
rhx git.release --into prod --mode apply
```

```
🐢 radical!

🐚 git.release --into prod --mode apply

🌊 release: feat(auth): add oauth provider
   ├─ 👌 all checks passed
   └─ 🌴 already merged

🫧 and then...
   └─ ✨ found it! Xs in action, Xs watched

🌊 release: chore(release): v1.2.3 🎉
   ├─ 👌 all checks passed
   ├─ 🌴 automerge enabled [added] -> and merged already
   └─ 🥥 let's watch
      └─ ✨ done! Xs in action, Xs watched

🫧 and then...
   └─ ✨ found it! Xs in action, Xs watched

🌊 release: v1.2.3
   └─ 🥥 let's watch
      ├─ 🫧 no runs inflight
      └─ ✨ done! publish.yml, Xs in action, Xs watched
```

### 5. release to prod from main (--from main)

release main → prod from any branch (skips feature branch requirement):

```bash
rhx git.release --from main --into prod --mode apply
```

```
🐢 radical!

🐚 git.release --into prod --mode apply

🌊 release: chore(release): v1.32.0 🎉
   ├─ 👌 all checks passed
   ├─ 🌴 automerge enabled [added] -> and merged already
   └─ 🥥 let's watch
      └─ ✨ done! Xs in action, Xs watched

🫧 and then...
   └─ ✨ found it! Xs in action, Xs watched

🌊 release: v1.32.0
   └─ 🥥 let's watch
      ├─ 🫧 no runs inflight
      └─ ✨ done! publish.yml, Xs in action, Xs watched
```

### 6. failure → retry → success

when CI fails, retry failed workflows, then watch:

```bash
rhx git.release --mode apply
```

```
🐢 bummer dude...

🐚 git.release --into main --mode apply

🌊 release: feat(auth): add oauth provider
   ├─ ⚓ 1 check(s) failed
   │  ├─ 🔴 test-unit
   │  │     ├─ https://github.com/test/repo/actions/runs/123
   │  │     └─ failed after Xm Ys
   ├─ [2mhint: use --retry to rerun failed workflows[0m
   └─ [2mhint: use rhx show.gh.test.errors to see test output[0m
```

```bash
rhx git.release --retry
```

```
🐢 heres the wave...

🐚 git.release --into main --retry

🌊 release: feat(auth): add oauth provider
   ├─ ⚓ 1 check(s) failed
   │  ├─ 🔴 test-unit
   │  │     ├─ https://github.com/test/repo/actions/runs/123
   │  │     ├─ failed after Xm Ys
   │  │     └─ 👌 rerun triggered
   └─ [2mhint: use --watch to monitor rerun progress[0m
```

```bash
rhx git.release --watch
```

```
🐢 heres the wave...

🐚 git.release --into main --watch

🌊 release: feat(auth): add oauth provider
   ├─ 🐢 1 check(s) in progress
   ├─ 🌴 automerge unfound (use --mode apply to add)
   └─ 🥥 let's watch
      ├─ 👌 all checks passed
      └─ [2mhint: use --mode apply to add automerge[0m
```

### 7. handle rebase needed

when branch is behind main:

```bash
rhx git.release
```

```
🐢 hold up dude...

🐚 git.release --into main

🌊 release: feat(auth): add oauth provider
   ├─ 👌 all checks passed
   ├─ 🐚 needs rebase
   │  └─ [2mhint: rhx git.branch.rebase begin[0m
   └─ 🌴 automerge unfound (use --mode apply to add)
```

## exit codes

| code | semantics | examples |
|------|-----------|----------|
| 0 | success | merged, passed, plan ok |
| 1 | malfunction | gh error, network, timeout |
| 2 | constraint | failed, rebase, no PR, dirty |

## reference

for complete state matrices and flag combinations:
- [git.release.spec.matrix.md](./git.release.spec.matrix.md)

for visual flow diagrams:
- [git.release.spec.diagram.md](./git.release.spec.diagram.md)
