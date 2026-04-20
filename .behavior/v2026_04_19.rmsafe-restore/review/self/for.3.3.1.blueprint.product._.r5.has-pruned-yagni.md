# self-review r5: has-pruned-yagni

deeper pass. re-read blueprint with YAGNI lens.

---

## hardest question: what is the absolute minimum?

if I had to ship this in 10 lines of bash:

```bash
TRASH_DIR="$REPO_ROOT/.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash"
mkdir -p "$TRASH_DIR/$(dirname $REL_PATH)"
cp -rP "$TARGET" "$TRASH_DIR/$REL_PATH"
rm -rf "$TARGET"
echo "🥥 restore: rhx cpsafe $TRASH_DIR/$REL_PATH ./$REL_PATH"
```

what does blueprint add beyond this?

1. ensure_trash_dir() — abstracts mkdir + gitignore
2. print_coconut_hint() — abstracts output format
3. output.sh integration — turtle + shell headers
4. error handler — validate paths
5. test coverage — 5+ test cases

---

## is each addition justified?

### ensure_trash_dir()

**what minimum needs:** mkdir -p
**what blueprint adds:** + gitignore findsert
**was gitignore requested?** yes — wish explicit
**verdict:** not YAGNI — gitignore is requirement

### print_coconut_hint()

**what minimum needs:** echo restore command
**what blueprint adds:** formatted output (turtle structure)
**was format requested?** yes — vision shows exact format
**verdict:** not YAGNI — format is requirement

### output.sh integration

**what minimum needs:** echo results
**what blueprint adds:** turtle + shell structure
**was structure requested?** yes — extant pattern, briefs require treestruct
**verdict:** not YAGNI — follows repo rules

### error handler

**what minimum needs:** none (let bash fail)
**what blueprint adds:** validate paths, clear errors
**was requested?** implicit — robust behavior expected
**verdict:** borderline — but extant code has it, consistency

### test coverage

**what minimum needs:** manual verification
**what blueprint adds:** 5+ automated tests
**was requested?** yes — blueprint stone requires test coverage
**verdict:** not YAGNI — mandatory per stone

---

## truly YAGNI candidates

### could delete: separate ensure_trash_dir()

**if inline:** 3 lines repeated twice
**if function:** 1 function, 2 calls
**verdict:** function is cleaner. but could inline. not a blocker.

### could delete: print_coconut_hint() in output.sh

**if inline in rmsafe.sh:** ~6 lines
**if in output.sh:** reusable
**verdict:** could inline. follows pattern though.

---

## decision

both borderline cases follow extant patterns. to delete would make code inconsistent with repo style. keep both.

---

## found issues

none — all components trace to requirements or follow mandatory patterns.

---

## non-issues (why they hold)

| component | why it's not YAGNI |
|-----------|-------------------|
| ensure_trash_dir() | gitignore requested, DRY |
| print_coconut_hint() | format requested |
| output.sh integration | repo pattern |
| error handler | extant consistency |
| test coverage | stone requirement |

---

## conclusion

blueprint is minimal. no YAGNI to prune. borderline items follow repo patterns.
