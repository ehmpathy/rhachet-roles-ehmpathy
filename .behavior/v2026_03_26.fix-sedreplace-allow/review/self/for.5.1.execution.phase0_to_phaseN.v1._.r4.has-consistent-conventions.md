# self-review round 4: has-consistent-conventions

## objective

deeper review of name and structure conventions.

## fresh eyes review

### header structure comparison

**extant (forbid-planmode.sh)**:
```
# .what = PreToolUse hook to forbid EnterPlanMode
# .why  = ...
# usage:
# guarantee:
#   ✔ always blocks EnterPlanMode (exit 2)
```

**new (allow-rhx-skills.sh)**:
```
# .what = PreToolUse hook to auto-approve rhx skill commands
# .why  = ...
# .how  = ...
# usage:
# guarantee:
#   - only allows commands that start with rhx prefix
```

**differences found**:
1. new hook has `.how` section — extant does not
2. guarantee format differs: extant uses `✔`, new uses `-`

**verdict**: minor inconsistencies but not blockers. the `.how` section adds clarity. the guarantee format (bullet style) is cosmetic.

### comment style in code

**extant (forbid-planmode.sh)**:
```bash
# consume stdin (required by hook protocol)
STDIN_INPUT=$(cat)
```

**new (allow-rhx-skills.sh)**:
```bash
# read JSON from stdin (Claude Code passes input via stdin)
STDIN_INPUT=$(cat)
```

**analysis**: similar style — one-line comment above the code. consistent.

### error vs pass-through on empty stdin

**extant (forbid-planmode.sh)**:
```bash
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi
```

**new (allow-rhx-skills.sh)**:
```bash
if [[ -z "$STDIN_INPUT" ]]; then
  exit 0
fi
```

**analysis**: different behavior but correct for each usecase:
- forbid-* must block, so empty stdin is an error
- allow-* should pass through, so empty stdin is a no-op

**verdict**: intentional difference, not inconsistency.

### term consistency

| term in codebase | term in new code | match? |
|------------------|------------------|--------|
| `STDIN_INPUT` | `STDIN_INPUT` | yes |
| `TOOL_NAME` | `TOOL_NAME` | yes |
| `COMMAND` (forbid-suspicious) | `CMD` (allow-rhx) | close |

**minor issue**: extant uses `COMMAND`, new uses `CMD`. both are valid bash conventions. not a blocker.

## conclusion

conventions are mostly consistent:
1. file names follow `event.verb-target` pattern
2. header has `.what`, `.why`, `usage`, `guarantee` sections
3. bash variables use uppercase
4. comments use one-line style above code

minor differences:
- `.how` section added (extra clarity, not harmful)
- guarantee uses `-` instead of `✔` (cosmetic)
- `CMD` vs `COMMAND` (both valid)

none of these rise to the level of convention violations.

## why this holds

the conventions that matter (file names, header structure, bash style) are all consistent. the minor differences are either intentional (fail-safe vs error) or cosmetic (bullet style).
