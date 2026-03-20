# self-review: has-consistent-conventions

## review scope

reviewed all new code for consistency with extant name and structural conventions.

files reviewed:
- `git.branch.rebase.lock.sh` (new, 209 lines)
- `git.branch.rebase.take.sh` (modified, added lines 201-258)
- `git.branch.rebase.sh` (modified, line 104 and lines 41, 48)

extant reference files examined:
- `git.branch.rebase.begin.sh` (298 lines)
- `git.branch.rebase.continue.sh`
- `git.branch.rebase.operations.sh`
- `git.commit/output.sh`

## the guide questions applied

for each name choice and structural decision, I asked:
1. what name conventions does the codebase use?
2. do we use a different namespace, prefix, or suffix pattern?
3. do we introduce new terms when extant terms exist?
4. does our structure match extant patterns?

---

## results

### 1. file name convention

**extant pattern from directory:**
```
git.branch.rebase.sh           # dispatcher
git.branch.rebase.begin.sh     # subcommand handler
git.branch.rebase.continue.sh  # subcommand handler
git.branch.rebase.take.sh      # subcommand handler
git.branch.rebase.abort.sh     # subcommand handler
git.branch.rebase.operations.sh # shared domain operations
```

**new file:** `git.branch.rebase.lock.sh`

**analysis:**
- follows `git.branch.rebase.{subcommand}.sh` pattern exactly
- "lock" is a subcommand like "begin", "continue", "take", "abort"
- file is a handler dispatched from `git.branch.rebase.sh`

**verdict:** consistent ✓

---

### 2. shebang and set options

**extant pattern (from begin.sh line 1, 22):**
```bash
#!/usr/bin/env bash
set -euo pipefail
```

**lock.sh (lines 1, 20):**
```bash
#!/usr/bin/env bash
set -euo pipefail
```

**verdict:** identical ✓

---

### 3. SKILL_DIR declaration

**extant pattern (begin.sh lines 23-25):**
```bash
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"
```

**lock.sh (lines 22, 24-25):**
```bash
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# source shared operations
source "$SKILL_DIR/git.branch.rebase.operations.sh"
```

**analysis:**
- lock.sh declares `SKILL_DIR` identically
- lock.sh does NOT declare `COMMIT_SKILL_DIR` because it doesn't source git.commit/output.sh
- instead, lock.sh has inline output functions (justified in has-consistent-mechanisms review)

**verdict:** consistent — only declares what it uses ✓

---

### 4. file header format

**extant pattern (begin.sh lines 2-20):**
```bash
######################################################################
# .what = ...
#
# .why  = ...
#
# usage:
#   ...
#
# guarantee:
#   ...
######################################################################
```

**lock.sh (lines 2-19):**
```bash
######################################################################
# .what = lock file operations for mid-rebase state
#
# .why  = regenerate lock files mid-rebase to prevent CI failures:
#         - after `take` on pnpm-lock.yaml, lock is stale
#         - install regenerates for current package.json
#         - stages lock so rebase can continue cleanly
#
# usage:
#   rhx git.branch.rebase lock refresh
#
# guarantee:
#   - requires rebase in progress
#   - detects package manager from lock file
#   - runs correct install command
#   - stages regenerated lock file
#   - fail-fast on errors
######################################################################
```

**analysis:**
- uses same `######...` delimiter (70 #'s)
- has `.what =` and `.why =` sections
- has `usage:` and `guarantee:` sections
- `.why` uses bullet list format (same as begin.sh)

**verdict:** consistent ✓

---

### 5. variable name conventions

**extant pattern (begin.sh):**
- `MODE` (line 40) - single word
- `SKILL_DIR` (line 23) - compound with underscore
- `METER_DIR` (line 34) - compound with underscore
- `STATE_FILE` (line 35) - compound with underscore
- `COMMIT_COUNT` (line 167) - compound with underscore
- `USES`, `PUSH_ALLOWED` (lines 83-84)
- all SCREAMING_SNAKE_CASE

**lock.sh variables:**
- `SKILL_DIR` (line 22) - matches
- `SUBCMD` (line 65) - matches begin.sh line 55
- `LOCK_FILE` (line 118) - compound with underscore, matches pattern
- `PM` (line 119) - single word abbreviation (package manager)
- `INSTALL_OUTPUT` (line 166) - compound with underscore
- `INSTALL_EXIT` (line 167) - compound with underscore

**analysis:**
- `PM` is short but contextually clear (defined immediately before use)
- all variables follow SCREAMING_SNAKE_CASE
- compounds use underscore separation

**verdict:** consistent ✓

---

### 6. guard clause structure

**extant pattern (begin.sh lines 108-114):**
```bash
# guard: cannot rebase main/master
if is_base_branch; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase begin"
  echo "   └─ error: cannot rebase main/master"
  exit 1
fi
```

**lock.sh guards (lines 106-113):**
```bash
######################################################################
# guard: rebase in progress
######################################################################
if ! is_rebase_in_progress; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase lock refresh"
  print_tree_error "no rebase in progress"
  exit 1
fi
```

**analysis:**
- uses `######...` section header (like begin.sh major sections)
- uses `print_turtle_header "hold up dude..."` (exact phrase)
- uses `print_tree_start` with full command path
- uses error message format: `print_tree_error` or `echo "   └─ error: ..."`
- exits with code 1

**verdict:** consistent ✓

---

### 7. output phrases vocabulary

**extant turtle vibes phrases observed:**
- "hold up dude..." — errors (begin.sh line 73)
- "heres the wave..." — help/usage (begin.sh line 194)
- "righteous!" — success (begin.sh line 246)
- "cowabunga!" — success variants
- "bummer dude..." — failures

**lock.sh phrases:**
- "hold up dude..." — errors (line 91, 99, 109, etc.) ✓
- "shell yeah!" — success (line 202)
- "bummer dude..." — install failure (line 183)

**analysis:**
- "shell yeah!" is new but fits turtle vibes vocabulary
- follows pattern of punny, surfer-turtle expressions
- turtle vibes vocabulary is extensible (not fixed set)

**verdict:** consistent — "shell yeah!" is a valid extension ✓

---

### 8. subcommand dispatch pattern

**extant pattern (git.branch.rebase.sh line 103-106):**
```bash
case "$SUBCMD" in
  begin|continue|take|abort)
    # valid - proceed to dispatch
    ;;
```

**updated pattern (line 104):**
```bash
  begin|continue|take|abort|lock)
```

**analysis:**
- "lock" appended to extant list
- alphabetical order not maintained (abort|begin|continue|lock|take)
- however, extant order was not alphabetical either (begin|continue|take|abort)
- order follows temporal usage: begin → continue → take → abort → lock

**verdict:** consistent — added to extant pattern ✓

---

### 9. help text structure

**extant pattern (git.branch.rebase.sh lines 36-50):**
```bash
  echo "   ├─ subcommands"
  echo "   │  ├─ begin      start rebase onto origin/main"
  echo "   │  ├─ continue   continue after conflicts settled"
  echo "   │  ├─ take       settle conflicts via ours or theirs"
  echo "   │  └─ abort      abandon rebase, restore pre-rebase state"
```

**updated (lines 41-42, 48):**
```bash
  echo "   │  ├─ lock       lock file operations (refresh)"
  ...
  echo "      ├─ rhx git.branch.rebase lock refresh"
```

**analysis:**
- "lock" entry follows same format: verb + description
- example added in examples section
- uses same tree characters: `├─`, `│`, `└─`

**verdict:** consistent ✓

---

### 10. take.sh suggestion output

**extant output pattern (take.sh lines 241-252):**
```bash
if [[ $HAS_SUCCESS -gt 0 ]]; then
  echo "   ├─ settled"
  i=0
  for file in "${FILES_SUCCESS[@]}"; do
    ...
    echo "   │  └─ $file ✓"
```

**new suggestion output (take.sh lines 254-258):**
```bash
# print lock file refresh suggestion (once, after all settled files)
if [[ "$LOCK_FILE_SETTLED" == "true" ]]; then
  echo "   ├─ lock taken, refresh it with: ⚡"
  echo "   │  └─ rhx git.branch.rebase lock refresh"
fi
```

**analysis:**
- follows tree output pattern with `├─` and `│  └─`
- uses ⚡ emoji (consistent with turtle vibes emoji usage)
- positioned after settled files, before skipped/failed sections
- single suggestion regardless of how many lock files (as specified)

**verdict:** consistent ✓

---

### 11. function name conventions in take.sh

**extant function names in operations.sh:**
- `is_rebase_in_progress`
- `get_conflict_files`
- `get_git_dir`

**new function in take.sh (lines 201-211):**
```bash
is_lock_file() {
  local file="$1"
  case "$file" in
    pnpm-lock.yaml|package-lock.json|yarn.lock)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}
```

**analysis:**
- follows `is_*` predicate convention (returns 0/1)
- uses `local` for function variables
- uses snake_case for function name

**verdict:** consistent ✓

---

## conclusion

all new code follows extant conventions. reviewed 11 specific areas:

| area | result |
|------|--------|
| file names | matches `git.branch.rebase.{subcommand}.sh` |
| shebang/set | identical to extant |
| SKILL_DIR | same pattern |
| file header | same format |
| variable names | SCREAMING_SNAKE_CASE |
| guard clauses | same structure |
| output phrases | extant + valid extension |
| subcommand dispatch | appended to extant |
| help text | same format |
| suggestion output | follows tree pattern |
| function names | `is_*` predicate pattern |

no divergence found. no action required.
