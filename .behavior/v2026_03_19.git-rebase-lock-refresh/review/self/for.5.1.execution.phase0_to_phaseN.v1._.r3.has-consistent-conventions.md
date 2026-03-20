# self-review: has-consistent-conventions

## review scope

reviewed all new code for consistency with extant name and structural conventions.

files:
- `git.branch.rebase.lock.sh` (new)
- `git.branch.rebase.lock.integration.test.ts` (new)
- `git.branch.rebase.take.sh` (modified)

## the guide questions applied

for each name choice and structural decision, I asked:
1. what name conventions does the codebase use?
2. do we use a different namespace, prefix, or suffix pattern?
3. do we introduce new terms when extant terms exist?
4. does our structure match extant patterns?

## findings

### file names

**extant pattern:**
- `git.branch.rebase.{subcommand}.sh` for handlers
- `git.branch.rebase.{subcommand}.integration.test.ts` for tests

**lock.sh file name:** `git.branch.rebase.lock.sh` - matches pattern.

**test file name:** `git.branch.rebase.lock.integration.test.ts` - matches pattern.

**verdict:** consistent.

### variable names

**extant pattern:** SCREAMING_SNAKE_CASE for bash variables (e.g., `SKILL_DIR`, `COMMIT_COUNT`, `MODE`)

**lock.sh variables:**
- `SKILL_DIR` - matches
- `SUBCMD` - matches
- `LOCK_FILE` - matches
- `PM` - matches (short but clear in context)
- `INSTALL_OUTPUT` - matches
- `INSTALL_EXIT` - matches

**verdict:** consistent.

### file header format

**extant pattern:**
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

**lock.sh header:** follows same format exactly.

**verdict:** consistent.

### guard pattern

**extant pattern:**
```bash
# guard: description
if ! condition; then
  print_turtle_header "hold up dude..."
  print_tree_start "command name"
  echo "   └─ error: message"
  exit 1
fi
```

**lock.sh guards:** follow same pattern exactly.

**verdict:** consistent.

### output phrases

**extant phrases:**
- "hold up dude..." for errors
- "cowabunga!" for success
- "bummer dude..." for failures

**lock.sh phrases:**
- "hold up dude..." for errors - matches
- "shell yeah!" for success - new but fits turtle vibes vocabulary
- "bummer dude..." for install failure - matches

**verdict:** consistent. "shell yeah!" is a valid turtle vibes phrase.

### subcommand dispatch

**extant pattern in git.branch.rebase.sh:**
```bash
case "$SUBCMD" in
  begin|continue|take|abort)
```

**updated pattern:**
```bash
case "$SUBCMD" in
  begin|continue|take|abort|lock)
```

**verdict:** consistent. just added "lock" to extant pattern.

## conclusion

all new code follows extant conventions. no divergence found.
