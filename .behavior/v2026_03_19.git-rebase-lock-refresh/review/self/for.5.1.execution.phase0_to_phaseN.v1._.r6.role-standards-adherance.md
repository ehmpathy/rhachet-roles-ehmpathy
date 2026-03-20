# self-review: role-standards-adherance

## review scope

check changed code against mechanic role standards from briefs directories.

---

## briefs directories to check

| directory | relevance |
|-----------|-----------|
| code.prod/readable.comments | .what/.why headers |
| code.prod/readable.narrative | guard clause structure |
| code.prod/pitofsuccess.errors | fail-fast patterns |
| code.prod/evolvable.procedures | function patterns |
| lang.terms | forbidden terms, naming |
| lang.tones | turtle vibes, lowercase |

---

## file: git.branch.rebase.lock.sh (new, 209 lines)

### readable.comments: .what/.why headers

**rule says:** require .what and .why comments for procedures

**check:**
- lines 2-19: file header has `.what =` and `.why =` sections
- `.what = lock file operations for mid-rebase state`
- `.why = regenerate lock files mid-rebase to prevent CI failures:`
- includes `usage:` and `guarantee:` sections

**verdict:** adheres ✓

---

### readable.narrative: guard clause structure

**rule says:** use early returns, no nested branches

**check:**
- lines 90-103: guard for subcommand, early exit 1
- lines 108-113: guard for rebase in progress, early exit 1
- lines 134-139: guard for lock file extant, early exit 1
- lines 146-160: guards for package manager availability, early exit 1
- lines 182-192: guard for install success, early exit 1
- no nested if/else structures
- all guards follow `if (condition); then exit; fi` pattern

**verdict:** adheres ✓

---

### pitofsuccess.errors: fail-fast patterns

**rule says:** fail fast with descriptive errors

**check:**
- line 93: `print_tree_error "subcommand required (try: refresh)"`
- line 101: `print_tree_error "unknown lock subcommand: $SUBCMD"`
- line 111: `print_tree_error "no rebase in progress"`
- line 137: `print_tree_error "no lock file found"`
- line 150: `print_tree_error "pnpm not found, install pnpm or use npm"`
- line 157: `print_tree_error "yarn not found, install yarn"`
- line 187: `echo "   └─ error: install failed"` with output shown

all error paths exit immediately with descriptive messages.

**verdict:** adheres ✓

---

### evolvable.procedures: function patterns

**rule says:** use arrow functions, (input, context) pattern

**note:** this is a shell file, not TypeScript. shell functions use different conventions.

**check:**
- lines 30-60: output functions use standard bash function syntax
- each function takes positional args (standard for bash)
- functions are short and single-purpose

**verdict:** adheres (shell convention) ✓

---

### lang.terms: forbidden terms

**rule says:** no gerunds, no term "hlprs" (alternate for operations), no term "nrmlz" (use asX pattern)

**check lines 1-209:**
- no "xstng" (would be "extant") — uses "extant" correctly on line 134-139
- no "hlprs" (would be "operations") — not used
- no gerunds found in variable names or comments
- line 28 comment: "turtle vibes output functions (inline — single consumer)" — correct

**verdict:** adheres ✓

---

### lang.terms: naming conventions

**rule says:** [noun][state] order, SCREAMING_SNAKE_CASE for vars

**check:**
- line 65: `SUBCMD=""` — SCREAMING_SNAKE_CASE ✓
- line 118: `LOCK_FILE=""` — SCREAMING_SNAKE_CASE ✓
- line 119: `PM=""` — SCREAMING_SNAKE_CASE ✓
- line 166: `INSTALL_OUTPUT=""` — SCREAMING_SNAKE_CASE ✓
- line 167: `INSTALL_EXIT=0` — SCREAMING_SNAKE_CASE ✓
- function names: `print_turtle_header`, `print_tree_branch` — snake_case ✓

**verdict:** adheres ✓

---

### lang.tones: turtle vibes

**rule says:** use turtle vibes phrases

**check:**
- line 91: `"hold up dude..."` — error phrase ✓
- line 99: `"hold up dude..."` — error phrase ✓
- line 109: `"hold up dude..."` — error phrase ✓
- line 135: `"hold up dude..."` — error phrase ✓
- line 148: `"hold up dude..."` — error phrase ✓
- line 155: `"hold up dude..."` — error phrase ✓
- line 183: `"bummer dude..."` — failure phrase ✓
- line 202: `"shell yeah!"` — success phrase ✓

all phrases match turtle vibes vocabulary.

**verdict:** adheres ✓

---

### lang.tones: lowercase

**rule says:** prefer lowercase in comments and prose

**check:**
- line 3: `# .what = lock file operations for mid-rebase state` — lowercase ✓
- line 5: `# .why  = regenerate lock files mid-rebase to prevent CI failures:` — lowercase ✓
- all comments use lowercase start (except proper nouns)

**verdict:** adheres ✓

---

## file: git.branch.rebase.sh (dispatcher changes)

### check changes

**line 41:** `echo "   │  ├─ lock       lock file operations (refresh)"`
- lowercase description ✓
- follows extant help format ✓

**line 48:** `echo "      ├─ rhx git.branch.rebase lock refresh"`
- follows extant example format ✓

**line 104:** `begin|continue|take|abort|lock)`
- "lock" added to case statement ✓
- follows extant pattern ✓

**verdict:** adheres ✓

---

## file: git.branch.rebase.take.sh (suggestion changes)

### is_lock_file function (lines 201-211)

**check:**
- function name: `is_lock_file` — snake_case, `is_*` predicate pattern ✓
- uses `local file="$1"` — standard bash ✓
- returns 0/1 for boolean — standard bash ✓
- no gerunds in function name ✓

**verdict:** adheres ✓

---

### LOCK_FILE_SETTLED tracking (lines 213-219)

**check:**
- variable name: `LOCK_FILE_SETTLED` — SCREAMING_SNAKE_CASE ✓
- [noun][state] order: LOCK_FILE_SETTLED (lock file + settled state) ✓
- uses `break` for early exit — efficient ✓

**verdict:** adheres ✓

---

### suggestion output (lines 254-258)

**check:**
- lines 256-257:
  ```
  echo "   ├─ lock taken, refresh it with: ⚡"
  echo "   │  └─ rhx git.branch.rebase lock refresh"
  ```
- lowercase prose ✓
- turtle vibes emoji (⚡) ✓
- follows tree output pattern ✓

**verdict:** adheres ✓

---

## summary

| file | check | result |
|------|-------|--------|
| lock.sh | .what/.why headers | ✓ |
| lock.sh | guard clause structure | ✓ |
| lock.sh | fail-fast errors | ✓ |
| lock.sh | function patterns (shell) | ✓ |
| lock.sh | forbidden terms | ✓ |
| lock.sh | naming conventions | ✓ |
| lock.sh | turtle vibes | ✓ |
| lock.sh | lowercase | ✓ |
| dispatcher | help format | ✓ |
| dispatcher | case pattern | ✓ |
| take.sh | function naming | ✓ |
| take.sh | variable naming | ✓ |
| take.sh | output format | ✓ |

no violations found. code follows mechanic role standards.

