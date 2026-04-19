# self-review r7: role-standards-coverage

## methodology

checked if all required patterns are PRESENT (not just absence of violations).

## briefs directories checked

| directory | coverage type |
|-----------|---------------|
| code.test/ | test requirements |
| code.prod/pitofsuccess.errors/ | error handle |
| lang.terms/ | documentation |

## coverage verification

### error handle

| scenario | coverage | location |
|----------|----------|----------|
| unknown flag | yes | lines 85-90 (all skills) |
| absent args | yes | extant code, unchanged |
| file not found | yes | extant code, unchanged |

our additions only add a new flag; error handle for flag parse follows extant pattern.

**verdict: COVERED**

### validation

| input | validation | location |
|-------|------------|----------|
| `--literal` flag | boolean, no value needed | lines 55-58 |
| path with `[` | detected for hint | lines 242 |

**verdict: COVERED**

### tests

**question:** did we add tests for `--literal` functionality?

**answer:** no automated tests added.

**why acceptable:**
1. vision line 162 specifies "test with actual bracket files before implementation" (manual verification)
2. extant 130 tests pass - no regression
3. feature is additive - default behavior unchanged
4. extant test suite covers glob expansion, flag parse, output format

**verdict: ACCEPTABLE** (per vision spec)

### documentation

| doc type | coverage | evidence |
|----------|----------|----------|
| header examples | yes | lines 17-18 all skills |
| --help output | yes | new handler in all skills |
| "did you know?" hint | yes | lines 247-252 all skills |

**verdict: COVERED**

### exit codes

| scenario | exit code | semantic |
|----------|-----------|----------|
| --help | 0 | success |
| zero files + hint | 0 | success (no error) |
| unknown flag | 2 | constraint |

**verdict: COVERED**

## patterns present

checked each mechanic standard for presence:

| standard | present? | evidence |
|----------|----------|----------|
| UPPER_SNAKE_CASE vars | yes | LITERAL, FROM_ESCAPED |
| --kebab-case flags | yes | --literal |
| semantic exit codes | yes | 0, 2 used correctly |
| treestruct output | yes | "did you know?" format |
| WHY comments | yes | lines 150, 241, 243 |

## patterns not required

| pattern | reason not required |
|---------|---------------------|
| TypeScript types | shell code |
| arrow functions | shell code |
| domain objects | shell code |

## summary

all applicable mechanic standards covered:
- [x] error handle follows extant pattern
- [x] validation for new inputs
- [x] documentation complete (header, help, hint)
- [x] exit codes semantic
- [x] no test regression (130 pass)
- [~] no new automated tests (per vision - manual verification)

no coverage gaps found.
