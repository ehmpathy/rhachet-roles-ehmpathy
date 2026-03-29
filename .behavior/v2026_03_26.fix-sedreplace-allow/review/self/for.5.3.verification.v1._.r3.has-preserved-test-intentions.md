# self-review round 3: has-preserved-test-intentions

## objective

verify I preserved the intention of every test I touched.

## tests touched

only one test file modified: `getMechanicRole.test.ts`

## what changed

### change 1: "at least 4 hooks" → "at least 6 hooks"

| before | after |
|--------|-------|
| `toBeGreaterThanOrEqual(4)` | `toBeGreaterThanOrEqual(6)` |

**intention preserved?** yes

**why:** a new hook (allow-rhx-skills) was added plus one more. the test verifies "at least N hooks exist". the intention is "verify minimum hook count". the number change reflects reality, not a weakened assertion.

### change 2: index-based lookup → name-based lookup

| before | after |
|--------|-------|
| `hooks?.onBrain?.onTool?.[0]` | `findHook('forbid-suspicious-shell-syntax')` |
| "forbid-suspicious-shell-syntax targets Bash" | "forbid-suspicious-shell-syntax hook is present and targets Bash" |

**intention preserved?** yes, improved

**why:** the original intention was "verify this hook exists with this filter". the index `[0]` was an implementation detail. hooks run in parallel — order doesn't matter. the new test finds by name and verifies the same properties (filter.what, filter.when).

### change 3: added `expect(hook).toBeDefined()`

| before | after |
|--------|-------|
| (implicit via `hook?.command`) | `expect(hook).toBeDefined()` |

**intention preserved?** yes, strengthened

**why:** the original test would silently pass if hook was undefined (optional chain returns undefined, not an assertion failure). the new test explicitly fails if hook is absent.

### change 4: added new test for allow-rhx-skills

| before | after |
|--------|-------|
| (no test) | test for allow-rhx-skills hook |

**intention preserved?** n/a — new test

**why:** new hook requires new test. no prior intention to preserve.

## forbidden actions — did I do any?

| forbidden | did I do it? |
|-----------|--------------|
| weaken assertions to make tests pass | no — assertions same or stronger |
| remove test cases that "no longer apply" | no — all prior tests remain |
| change expected values to match broken output | no — only changed lookup method |
| delete tests that fail instead of fix code | no — no tests deleted |

## why this holds

1. every prior hook is still tested (by name, not index)
2. every prior assertion is still made (filter.what, filter.when)
3. assertions are stronger (explicit toBeDefined)
4. the change reflects a correct observation: hook order doesn't matter
5. no test intention was lost — only the brittle index dependency was removed
