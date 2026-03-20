# self-review: has-consistent-mechanisms

## review scope

reviewed all new mechanisms for duplication with extant functionality.

files:
- `git.branch.rebase.lock.sh` (new)
- `git.branch.rebase.take.sh` (modified)

## the guide questions applied

for each new mechanism, I asked:
1. does the codebase already have a mechanism that does this?
2. do we duplicate extant utilities or patterns?
3. could we reuse an extant component instead of a new one?

## findings

### turtle vibes output functions in lock.sh

**observation:** lock.sh defines inline output functions (lines 30-60):
- `print_turtle_header()`
- `print_tree_start()`
- `print_tree_branch()`
- `print_tree_nested()`
- `print_tree_leaf()`
- `print_tree_error()`

**extant mechanism:** `git.commit/output.sh` provides shared output functions that `take.sh` sources.

**analysis:**

comparing the two:

| lock.sh function | git.commit/output.sh equivalent | same? |
|------------------|--------------------------------|-------|
| `print_turtle_header(phrase)` | `print_turtle_header(phrase)` | yes |
| `print_tree_start(command)` | `print_tree_start(command)` | yes |
| `print_tree_branch(key, value)` | `print_tree_leaf(key, value, ...)` | partial - different name, extra params |
| `print_tree_nested(value)` | (none) | no equivalent |
| `print_tree_leaf(label)` | `print_tree_branch(label, is_last)` | partial - different params |
| `print_tree_error(message)` | `print_tree_error(message)` | yes |

**why inline was chosen:**

the blueprint explicitly stated:
> "turtle vibes output functions (inline — single consumer)"

this was a YAGNI decision: lock.sh is the only consumer of these specific variations, and the function signatures differ from the shared output.sh.

**verdict:** not a violation. the differences in signatures (lock.sh needs `key: value` format, shared output.sh has different param structure) justify inline definitions. refactor would require changes to shared output.sh API which affects other consumers.

### is_lock_file() in take.sh

**observation:** take.sh adds `is_lock_file()` function (lines 201-211).

**extant mechanism check:** searched codebase for similar lock file detection.

```bash
grep -r "pnpm-lock\|package-lock\|yarn.lock" src/domain.roles/mechanic/skills/
```

**result:** no extant function that detects lock files. this is new functionality.

**verdict:** not a duplication. new function for new feature.

### package manager detection in lock.sh

**observation:** lock.sh detects package manager from lock file presence (lines 117-131).

**extant mechanism check:** searched for similar detection patterns.

**result:** no extant package manager detection in the codebase. this is new functionality.

**verdict:** not a duplication. new mechanism for new feature.

## conclusion

one potential duplication was found (output functions) but was intentionally inlined per blueprint YAGNI decision due to signature differences. other mechanisms are genuinely new.
