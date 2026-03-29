# self-review round 3: has-consistent-conventions

## objective

review for divergence from extant names and patterns.

## review

### hook file name conventions

**extant pattern**: `{event}.{verb}-{target}.sh`

| extant hook | pattern |
|-------------|---------|
| `pretooluse.forbid-planmode.sh` | event.verb-target |
| `pretooluse.forbid-stderr-redirect.sh` | event.verb-target |
| `pretooluse.forbid-suspicious-shell-syntax.sh` | event.verb-target |
| `pretooluse.forbid-terms.gerunds.sh` | event.verb-target.subtype |
| `pretooluse.check-permissions.sh` | event.verb-target |
| `sessionstart.notify-permissions.sh` | event.verb-target |

**new hook**: `pretooluse.allow-rhx-skills.sh`

**analysis**: follows the same `event.verb-target` pattern.
- event: `pretooluse`
- verb: `allow`
- target: `rhx-skills`

the `allow-` verb is new but consistent with `forbid-` as a semantic opposite. this is intentional: forbid blocks, allow permits.

### test file name conventions

**extant pattern**: `{hookname}.integration.test.ts`

| extant test | pattern |
|-------------|---------|
| `pretooluse.forbid-suspicious-shell-syntax.integration.test.ts` | hookname.integration.test.ts |

**new test**: `pretooluse.allow-rhx-skills.integration.test.ts`

**analysis**: follows the same pattern exactly.

### function name conventions

**extant (forbid-\*)**: uses `appears_unquoted()`, `appears_executable()` with snake_case

**new (allow-\*)**: uses `buildStdinJson()`, `runHook()`, `expectAllow()` with camelCase

**analysis**: the test utility functions use camelCase, which is the TypeScript convention. the extant test uses `build_stdin_json()` with snake_case. this is a minor inconsistency.

**verdict**: the snake_case in extant test was likely a copy from shell convention. camelCase is the correct TypeScript convention. not a blocker.

### variable name conventions

**extant (shell)**: uppercase `STDIN_INPUT`, `COMMAND`, `TOOL_NAME`

**new (shell)**: uppercase `STDIN_INPUT`, `CMD`, `TOOL_NAME`, `CMD_STRIPPED`

**analysis**: follows the same uppercase convention for bash variables. `CMD` is shorter than `COMMAND` but consistent style.

## conclusion

name conventions are consistent:
1. hook file name follows `event.verb-target` pattern
2. test file name follows `hookname.integration.test.ts` pattern
3. bash variables use uppercase
4. TypeScript uses camelCase (correct for the language)

## non-issues confirmed

### why allow- is a new but valid verb

the `allow-` prefix introduces a new verb alongside `forbid-` and `check-`. this is intentional because the hook has different semantics — it actively permits rather than blocks. the pattern `event.verb-target` remains consistent.
