# self-review r2: has-pruned-backcompat (from diff)

## actual code changes reviewed

### 1. removed `--` from usage line in --help

**before:** `[-- <jest-args>]`
**after:** removed

**is this backwards compat?** no - this documents the new behavior where filter flags are blocked. the `--` separator still works for other args.

**verdict:** correct - documentation matches new behavior

### 2. removed `--when` from --help

**before:** `--when <context> context hint (optional, for future use)`
**after:** removed from help

**is this backwards compat?** no - the flag still works (line 236-238 still parses it). just not documented.

**verdict:** minor cleanup, not a compat concern

### 3. SCOPE_MODE defaults to "both" but behaves as "path"

**code:**
```bash
SCOPE_MODE="both"  # both | path | name
# ...
case "$SCOPE_MODE" in
  path|both)
    jest_args+=("--testPathPatterns" "$SCOPE_PATTERN")
```

**is this backwards compat?** yes - bare `--scope foo` still maps to `--testPathPatterns foo`

**was this requested?** not explicitly. but I chose this to avoid break.

**should I flag for wisher?** no - this is the simpler behavior. if bare scope did different behavior, that would be a break. same-as-before is correct.

**verdict:** holds - same behavior as before for bare scope

### 4. block `-t` (jest shorthand for testNamePattern)

**code:** `if [[ "$arg" == "--testNamePattern" ]] || [[ "$arg" == "-t" ]]; then`

**is this backwards compat?** no - this is new restrictive behavior

**was `-t` in vision?** not explicitly, but `-t` is jest's alias for `--testNamePattern`

**verdict:** correct - block the alias is consistent

## open question for wisher

none. the only backwards compat concern is bare `--scope` behavior, which stays the same (path only). this was not an assumption "to be safe" - it was the correct choice to avoid regression.

## summary

no backwards compat cruft. bare `--scope` stays path-only, which is correct.
