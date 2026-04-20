# self-review r8: has-consistent-conventions

review for name and pattern conventions.

---

## extant conventions found

### function names

**rmsafe.sh:**
- `is_glob_pattern()` — verb_noun with underscore

**output.sh:**
- `print_turtle_header()`
- `print_tree_start()`
- `print_tree_branch()`
- `print_tree_leaf()`
- `print_tree_file_line()`

**pattern:** `verb_noun()` with underscores

### variable names

**rmsafe.sh:**
- `SKILL_DIR`, `TARGET`, `RECURSIVE`, `REPO_ROOT`, `FILES`, `FILE_COUNT`

**pattern:** UPPER_SNAKE_CASE

---

## blueprint conventions

### new function names

| blueprint name | convention | verdict |
|----------------|------------|---------|
| `ensure_trash_dir()` | verb_noun | holds |
| `print_coconut_hint()` | verb_noun | holds |

### new variable names

| blueprint name | convention | verdict |
|----------------|------------|---------|
| `TRASH_DIR` | UPPER_SNAKE | holds |
| `TARGET_REL` | UPPER_SNAKE | holds |

---

## namespace analysis

### output.sh print_ prefix

extant: `print_turtle_*`, `print_tree_*`
new: `print_coconut_hint()`

**question:** should it be `print_coconut_*` to match pattern?

**analysis:** turtle and tree are structural elements. coconut is a semantic section (hint/tip). the function is `print_coconut_hint` which is specific enough.

**verdict:** holds — follows verb_noun, semantic scope appropriate

### rmsafe.sh internal functions

extant: `is_glob_pattern()`
new: `ensure_trash_dir()`

**question:** different verb prefixes ok?

**analysis:** 
- `is_*` = predicate (returns boolean)
- `ensure_*` = action with idempotent guarantee

different verbs serve different purposes. not a namespace, just descriptive.

**verdict:** holds — verb describes function purpose

---

## found issues

none — all names follow extant conventions.

---

## non-issues (why they hold)

| name | why consistent |
|------|---------------|
| ensure_trash_dir | verb_noun pattern |
| print_coconut_hint | verb_noun, matches output.sh |
| TRASH_DIR | UPPER_SNAKE_CASE |
| TARGET_REL | UPPER_SNAKE_CASE |

---

## conclusion

blueprint follows extant conventions:
- function names: verb_noun with underscores
- variable names: UPPER_SNAKE_CASE
- no namespace conflicts
