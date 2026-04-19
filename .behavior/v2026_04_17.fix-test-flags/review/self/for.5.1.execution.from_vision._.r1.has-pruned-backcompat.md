# self-review: has-pruned-backcompat

## backwards compat concerns

### 1. bare `--scope 'foo'` = path only (not both)

**explicitly requested?** discussed with wisher

in implementation, I asked about OR vs AND semantics. the wisher did not explicitly say "keep backwards compat". however, bare `--scope` previously mapped to `--testPathPatterns` only.

**evidence needed?** no - this is actually the simpler, more consistent behavior

**verdict:** holds - bare `--scope` stays as path-only (same as before). this was my implementation choice to avoid complexity, not backwards compat driven.

### 2. allow other REST_ARGS through (not just filter flags)

**explicitly requested?** yes - vision edge cases table shows `-- --verbose` and `-- --coverage` should be allowed

**evidence?** vision explicitly stated "block known footguns, allow unknown passthrough"

**verdict:** holds - prescribed in vision

## backwards compat NOT added

### did not add deprecation warn

**was this requested?** no - wisher said "failfast guide away" implies immediate block

**evidence?** grepped CI configs, no usage found

**verdict:** correct - no backwards compat shim added

## summary

| concern | explicitly requested | verdict |
|---------|---------------------|---------|
| bare scope = path only | discussed | holds (simpler, not compat driven) |
| allow other REST_ARGS | yes (vision) | holds |
| no deprecation warn | correct | holds (failfast was requested) |

no backwards compat cruft found.
