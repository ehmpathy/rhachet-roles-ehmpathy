# self-review: has-pruned-backcompat

## review scope

checked all changes for backwards compatibility concerns:
- `git.branch.rebase.lock.sh` (new)
- `git.branch.rebase.take.sh` (modified)
- `git.branch.rebase.sh` (modified)

## findings

### no backwards-compat hacks found

all changes are purely additive:

| change | type | breaks extant? |
|--------|------|------------------|
| add "lock" subcommand to dispatcher | additive | no |
| add help text for lock | additive | no |
| add `is_lock_file()` in take.sh | additive | no |
| add suggestion output in take.sh | additive | no |
| new lock.sh file | additive | no |

### specifically checked for

- no `// removed` comments
- no renamed `_unused` variables
- no re-exports for old paths
- no shims for deprecated behavior
- no fallbacks "just in case"

### why no backcompat needed

this is a new feature. no extant behavior is modified:
- `take` still works exactly as before (new output is appended)
- other subcommands (begin, continue, abort) unchanged
- no extant API contracts affected

## conclusion

no backwards-compat concerns. all changes are additive.
