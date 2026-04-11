# review.self: has-pruned-backcompat

## review scope

reviewed git.repo.test.sh for backwards compatibility that was not explicitly requested.

## method

1. identified all backwards-compat concerns in the code
2. cross-referenced each against blueprint section "hook contract compatibility"
3. checked if wisher explicitly requested each compat concern

## findings

### explicitly requested backwards compatibility

per blueprint section "hook contract compatibility":

| concern | explicitly requested? | evidence |
|---------|----------------------|----------|
| exit code 2 on test failure | yes | blueprint: "exit code 2 on test failure — forces brain to address defects" |
| summary output format | yes | blueprint: "summary output — no raw jest stream to terminal" |
| turtle vibes consistent format | yes | blueprint: "consistent format — turtle vibes output, same structure as lint" |
| --what lint behavior unchanged | yes | blueprint: "--what lint behavior unchanged — extant hook usage continues to work" |

### implicitly required backwards compatibility

| concern | rationale |
|---------|-----------|
| `--when` flag preserved | blueprint states skill is "used in hook context (`--when hook.onStop`)". to remove would break hook invocations. implicit requirement from hook contract. |

### not backwards compat concerns

| item | why |
|------|-----|
| new flags | blueprint explicitly says "new flags are additive" |
| namespaced log paths | new behavior, not compat |
| keyrack unlock | new behavior, not compat |

## open question

### `--when` flag

the `--when` flag is preserved but:
- skill does not use it internally
- blueprint only mentions it as invocation context
- it exists "for future use" per help text

**question for wisher**: should `--when` remain? it's currently a no-op that hooks pass but the skill ignores. options:
1. keep as-is (current state) — hooks continue to work, flag available for future
2. remove if not needed — simplify interface

**recommendation**: keep as-is. the flag is harmless and preserves hook compatibility. to remove requires coordination with hook definitions.

## conclusion

all backwards compatibility in the implementation is either:
1. explicitly requested in blueprint, or
2. implicitly required for hook contract

no unnecessary backwards compat shims detected.
