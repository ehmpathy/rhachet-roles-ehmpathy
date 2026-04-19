# self-review: has-questioned-questions (triage)

## questions from vision

### 1. is `--filter` the right term? or `--name`?

**can answer via logic?** yes.

`--scope` filters by file path. what's the parallel for test name?
- `--filter`: generic, could mean many things
- `--name`: explicit - "the name of the test"
- `--match`: jest-adjacent term
- `--test`: conflicts with `--what` concept

logic: `--name` pairs better with `--scope`:
- `--scope` = where (file path)
- `--name` = what (test name)

**verdict:** [answered] use `--name` for clarity. `--filter` is too generic.

### 2. should we block immediately or deprecate gradually?

**can answer via logic?** partially.

immediate block:
- simpler to implement
- forces migration
- could break CI (if used there)

gradual deprecation:
- gentler migration
- more complex (warn vs block modes)
- delays the cleanup

**can answer via code?** yes - grepped for `testNamePattern` in CI configs. no matches found.

**verdict:** [answered] immediate block is safe. CI does not use this pattern.

### 3. are there legitimate use cases for raw `--testNamePattern` we'd break?

**can answer via logic?** yes.

legitimate use cases for `--testNamePattern`:
- run specific describe blocks in large files
- debug a single test case by name
- CI matrix that runs subsets by test name

all of these are served by `--name` flag. no loss of capability.

raw `--` passthrough for OTHER jest flags (like `--verbose`) is separate concern.

**verdict:** [answered] no legitimate use case lost. `--name` covers all.

### 4. should we block all `--` or just `--testNamePattern`?

**can answer via logic?** yes.

block all `--`:
- simpler mental model
- more restrictive
- blocks legitimate uses like `-- --verbose`

block only `--testNamePattern`:
- targeted
- preserves other passthrough
- inconsistent (why block one but not others?)

**third option:** block pattern-related flags (`--testNamePattern`, `--testPathPattern`) but allow others.

**verdict:** [answered] block only filter-related flags. allow other passthrough. add specific flags (`--name`, `--verbose` etc) as needed.

## updated questions for vision

| question | status | resolution |
|----------|--------|------------|
| `--filter` vs `--name` | [answered] | use `--name` |
| block vs deprecate | [answered] | immediate block (no CI usage) |
| legitimate use cases | [answered] | none lost - `--name` covers all |
| block all `--` vs selective | [answered] | selective - only filter flags |

## questions left for wisher

none. all questions answered via logic and code inspection.

## revision to vision

should update:
1. rename `--filter` to `--name` throughout
2. remove deprecation question (answered: immediate block)
3. clarify selective block scope
