# self-review: has-edgecase-coverage (r3)

## review scope

double-check: are edge cases covered?
- what could go wrong?
- what inputs are unusual but valid?
- are boundaries tested?

---

## examined: playtest step 4 (no rebase in progress)

### the setup

```sh
cd ..
mkdir playtest-no-rebase && cd playtest-no-rebase
git init
rhx git.branch.rebase lock refresh
```

### why this edge case matters

a mechanic might run `lock refresh` in the wrong directory or after the rebase is complete. without proper guard, the command might:
- crash with cryptic git error
- silently exit without action
- run install in a non-rebase context

### what the playtest verifies

- `🐢 hold up dude...` — turtle vibes error header
- `└─ error: no rebase in progress` — actionable message

### cross-reference to implementation

from git.branch.rebase.lock.sh, the guard check:
```bash
if ! is_rebase_in_progress; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase lock"
  print_tree_leaf "error" "no rebase in progress"
  exit 1
fi
```

the playtest verifies the guard works and the message is clear.

---

## examined: playtest step 5 (no lock file extant)

### the setup

```sh
cd ..
mkdir playtest-no-lock && cd playtest-no-lock
git init
echo 'console.log("hello")' > index.js
git add -A && git commit -m "initial"
git checkout -b feature
echo 'console.log("world")' > index.js
git add -A && git commit -m "feature"
git checkout main
echo 'console.log("main")' > index.js
git add -A && git commit -m "main"
git checkout feature
git rebase main
```

this creates a rebase conflict on `index.js` — a non-lock file.

### why this edge case matters

not all repos have package managers. a repo with only shell scripts or a rust project might have rebase conflicts without any lock file. the command should not:
- crash with "file not found"
- try to run `pnpm install` in a repo without package.json
- produce a confusing message

### what the playtest verifies

- `🐢 hold up dude...` — turtle vibes error header
- `└─ error: no lock file found` — actionable message

### cross-reference to vision

from 1.vision.md pit of success edgecases:

> | edgecase | action |
> |----------|--------|
> | no lock file extant | error: "no lock file found" |

the playtest verifies this exact behavior.

---

## examined: playtest step 6 (non-lock file shows no suggestion)

### the setup

continues from step 5, with rebase conflict on index.js:

```sh
rhx git.branch.rebase take --whos theirs index.js
```

### why this edge case matters

the suggestion should only appear for lock files. if it appeared for every file, it would be noise. the mechanic would see:

```
├─ settled
│  └─ index.js ✓
│     └─ lock taken, refresh it with: ⚡    # wrong! this is not a lock
```

this would confuse mechanics and erode trust in the suggestions.

### what the playtest verifies

- output shows `├─ settled` with `index.js ✓`
- output does NOT show `lock taken, refresh it with: ⚡`
- output goes directly to `└─ done`

### cross-reference to criteria blackbox

from 2.1.criteria.blackbox.md usecase.2:

> given a rebase in progress
>   given a non-lock file has conflicts
>     when `rhx git.branch.rebase take --whos theirs some-other-file.ts` is run
>       then the conflict is settled
>       then no lock refresh suggestion is shown
>         sothat mechanics are not confused by irrelevant suggestions

the playtest verifies this exact episode.

---

## edge cases NOT in playtest (by design)

### npm variant (case2)

**why not in playtest:** same code path as pnpm, just different pm detection. the detection logic is:
```bash
if [[ -f "$LOCK_FILE" && "$LOCK_FILE" == *"pnpm-lock"* ]]; then
  PM="pnpm"
elif [[ -f "$LOCK_FILE" && "$LOCK_FILE" == *"package-lock"* ]]; then
  PM="npm"
```

the playtest verifies the pattern works. integration tests verify each branch.

### yarn variant (case3)

**why not in playtest:** same logic as npm. integration tests cover.

### install failure (case9)

**why not in playtest:** requires malformed package.json. hard to set up manually without errors. integration test uses:
```typescript
fs.writeFileSync(path.join(tempDir, 'package.json'), 'not valid json');
```

### pm not installed (case6, case7)

**why not in playtest:** requires environment manipulation (removing pnpm/yarn from PATH). integration tests mock this by creating temp repos without the pm.

---

## boundary analysis

| boundary | tested by | coverage |
|----------|-----------|----------|
| rebase: in progress | steps 1-3 | ✓ |
| rebase: not in progress | step 4 | ✓ |
| lock: extant | steps 1-3 | ✓ |
| lock: not extant | step 5 | ✓ |
| file: is lock | step 1 | ✓ |
| file: is not lock | step 6 | ✓ |
| pm: pnpm | steps 1-3 | ✓ |
| pm: npm | integration case2 | ✓ |
| pm: yarn | integration case3 | ✓ |

every boundary is tested. the playtest covers the boundaries that a human can easily verify. integration tests cover boundaries that require programmatic setup.

---

## conclusion

| check | result |
|-------|--------|
| what could go wrong? | 3 failure modes in playtest, 4 in integration |
| unusual but valid inputs? | fresh repo, no-lock repo, non-lock file |
| boundaries tested? | all boundaries covered between playtest and tests |

the edge case coverage is complete. the split between manual playtest and automated tests is correct: playtest covers what a human can verify, tests cover what requires programmatic setup.

