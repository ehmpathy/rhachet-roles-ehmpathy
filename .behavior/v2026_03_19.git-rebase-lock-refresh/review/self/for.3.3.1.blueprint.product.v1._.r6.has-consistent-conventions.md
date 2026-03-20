# self-review: has-consistent-conventions

## the question

for each name, pattern, and convention in the blueprint, ask:
- does it follow extant conventions in the codebase?
- is it consistent with sibling files?
- does it use the same verbs, structures, and formats?

---

## codebase search

before review, searched for related codepaths:

| search | result |
|--------|--------|
| `git.branch.rebase/*.sh` | 6 files: abort, begin, continue, take, operations, main dispatcher |
| `git.branch.rebase/*.test.ts` | 6 files: abort, begin, continue, take, journey, main integration |
| dispatcher pattern | line 118: `exec "$SKILL_DIR/git.branch.rebase.$SUBCMD.sh"` |
| error format | tree-embedded: `echo "   └─ error: {msg}"` |
| output source | take.sh sources from `../git.commit/output.sh` |

---

## convention review

### 1. dispatcher pattern — ISSUE FOUND

**extant pattern (git.branch.rebase.sh line 118):**
```bash
exec "$SKILL_DIR/git.branch.rebase.$SUBCMD.sh" "${ARGS[@]}"
```

**extant case validation (line 101-102):**
```bash
case "$SUBCMD" in
  begin|continue|take|abort)
```

**blueprint proposes:**
- case: `lock)` added to validation
- dispatch to: `git.branch.rebase.lock.refresh.sh`

**the problem:**
dispatcher builds filename as `git.branch.rebase.$SUBCMD.sh`. if SUBCMD is "lock", it looks for `git.branch.rebase.lock.sh` — but blueprint names file `git.branch.rebase.lock.refresh.sh`.

the nested `lock refresh` structure breaks the extant dispatch pattern.

**options:**
| option | change | trade-off |
|--------|--------|-----------|
| A | rename file to `git.branch.rebase.lock.sh`, handle "refresh" internally | adds sub-dispatcher complexity |
| B | change command to `refresh-lock` (flat, single word) | loses extensibility for future `lock` commands |
| C | special-case `lock` in dispatcher to handle two-word command | dispatcher becomes inconsistent |

**decision:** option A is correct — matches extant pattern while preserving `lock refresh` command structure.

**fix required:**
1. rename `git.branch.rebase.lock.refresh.sh` → `git.branch.rebase.lock.sh`
2. `lock.sh` handles `refresh` as first positional arg
3. case validation becomes `begin|continue|take|abort|lock`

**lesson:** read the dispatcher code before designing subcommand structure. the filename pattern is derived from the dispatch logic, not arbitrary.

---

### 2. test file name — UPDATE REQUIRED

**extant pattern:** `{skill-name}.integration.test.ts`

**what I found:**
- `git.branch.rebase.take.integration.test.ts`
- `git.branch.rebase.begin.integration.test.ts`
- `git.branch.rebase.continue.integration.test.ts`
- `git.branch.rebase.abort.integration.test.ts`

**blueprint name:** `git.branch.rebase.lock.refresh.integration.test.ts`

**after issue #1 fix:** rename to `git.branch.rebase.lock.integration.test.ts`

**why it holds after fix:**
- follows `{skill-name}.integration.test.ts` pattern
- mirrors `git.branch.rebase.lock.sh` skill name
- consistent with extant test files

**lesson:** test files mirror skill names — when skill name changes, test name must change too.

---

### 3. command verb: `refresh`

**extant verbs in git.branch.rebase:**
- `begin` — start rebase
- `continue` — resume after conflicts
- `take` — settle conflicts
- `abort` — cancel rebase

**blueprint verb:** `refresh` (as second word in `lock refresh`)

**why it holds:**
- `refresh` follows the pattern of imperative verbs
- semantics: regenerate lock to match current state
- distinct from extant verbs (no collision)
- alternatives considered: `regenerate` (too long), `fix` (too vague), `update` (unclear)

**lesson:** verbs should be imperative, distinct, and describe the action.

---

### 4. subcommand structure: `lock refresh` (nested)

**extant structure:** flat subcommands (`begin`, `continue`, `take`, `abort`)

**blueprint structure:** nested subcommand (`lock refresh`)

**why nested is acceptable:**
- `lock` is a noun group, `refresh` is the verb
- pattern matches `git remote add`, `git stash push` (git convention)
- creates space for future `lock` commands if needed

**implementation via issue #1 fix:**
- `lock.sh` becomes the handler for all `lock *` subcommands
- first positional arg determines action: `refresh`
- scales to future `lock check`, `lock status`, etc.

**lesson:** nested commands need a sub-dispatcher file.

---

### 5. dispatcher case: `lock)` — CONSISTENT AFTER FIX

**extant pattern (line 101-102, 118):**
```bash
case "$SUBCMD" in
  begin|continue|take|abort)
    ;;
esac
exec "$SKILL_DIR/git.branch.rebase.$SUBCMD.sh" "${ARGS[@]}"
```

**blueprint after fix:**
- add `lock` to case: `begin|continue|take|abort|lock`
- dispatch to: `git.branch.rebase.lock.sh` (not lock.refresh.sh)

**why it holds after fix:**
- follows exact extant dispatch pattern
- `$SUBCMD` maps directly to filename
- no special-case logic needed

**lesson:** match the exact dispatch pattern. don't invent variations.

---

### 6. output format: turtle vibes tree

**extant format in git.branch.rebase.take.sh (lines 206-214):**
```
print_turtle_header "righteous!"
print_tree_start "git.branch.rebase take"
echo "   ├─ whos: $WHOS"
...
echo "   └─ done"
```

**blueprint format:** same structure with inline output functions

**why it holds:**
- matches extant turtle vibes pattern
- uses same tree characters (`├─`, `└─`, `│`)
- follows skill-name-as-header convention
- done marker at end

**lesson:** output format is a convention. match sibling skills exactly.

---

### 7. error message format — REVIEW FINDING

**extant error format in git.branch.rebase.take.sh (line 82-85):**
```bash
print_turtle_header "hold up dude..."
print_tree_start "git.branch.rebase take"
echo "   └─ error: no rebase in progress"
exit 1
```

**note:** errors are embedded in the tree structure, not sent to stderr with `>&2`.

**blueprint should match:**
- use `print_turtle_header "hold up dude..."`
- use `print_tree_start "git.branch.rebase lock"`
- use `echo "   └─ error: {message}"`
- exit 1

**why it holds:**
- error output goes to stdout in tree format
- consistent with sibling skills
- turtle header shows "hold up dude..." for errors

**lesson:** check actual error output in sibling files. the pattern may differ from expectations.

---

### 8. function name conventions

**extant functions in git.branch.rebase.operations.sh:**
- `is_rebase_in_progress()`
- `get_git_dir()`
- `get_conflict_files()`

**blueprint functions (inline in lock.sh):**
- `detect_lock_file()`
- `detect_package_manager()`
- `is_pm_installed()`
- `run_install()`

**why it holds:**
- uses snake_case (extant convention)
- verb-first for actions (`detect_`, `run_`)
- `is_` prefix for boolean checks
- `get_` prefix for retrieval

**lesson:** function names use snake_case with verb prefixes.

---

## issues found and fixed

### issue 1: filename breaks dispatcher pattern

**problem:** blueprint named file `git.branch.rebase.lock.refresh.sh` but dispatcher builds `git.branch.rebase.$SUBCMD.sh`

**fix applied:**
- renamed to `git.branch.rebase.lock.sh` in filediff tree
- added subcommand parse step to codepath tree: `lock.sh` handles `refresh` as first positional arg
- renamed test file in filediff tree and test coverage section

**blueprint sections updated:**
- filediff tree: line 16 `git.branch.rebase.lock.sh`, line 17 `git.branch.rebase.lock.integration.test.ts`
- codepath tree: line 37-42 now shows subcommand parse for "refresh"
- test coverage: line 80 now shows `git.branch.rebase.lock.integration.test.ts`
- operations decomposition: lines 154, 161 reference `lock.sh` not `lock.refresh.sh`

**lesson:** always verify dispatcher pattern before designing nested subcommands. the filename is derived from dispatch logic.

---

## summary

| convention | blueprint (after fix) | extant | match? |
|------------|----------------------|--------|--------|
| skill file name | `.lock.sh` | `.{cmd}.sh` | yes |
| test file name | `.lock.integration.test.ts` | `{skill}.integration.test.ts` | yes |
| command verb | `refresh` | imperative | yes |
| nested structure | `lock refresh` | handled via sub-dispatch | yes |
| dispatcher case | `lock)` | match | yes |
| output format | turtle tree | turtle tree | yes |
| error format | tree-embedded | tree-embedded | yes |
| function names | snake_case | snake_case | yes |

**result:** 2 issues found and fixed in blueprint. all conventions now match extant patterns.

