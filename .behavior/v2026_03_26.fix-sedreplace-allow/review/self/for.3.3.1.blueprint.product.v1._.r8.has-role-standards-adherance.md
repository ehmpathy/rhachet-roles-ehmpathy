# self-review round 8: has-role-standards-adherance

## objective

verify the blueprint follows mechanic role standards and conventions.

## rule directories to check

relevant briefs for a bash hook implementation:

1. `briefs/practices/lang.terms/` — name conventions
2. `briefs/practices/lang.tones/` — tone and style
3. `briefs/practices/code.prod/evolvable.procedures/` — function patterns
4. `briefs/practices/code.prod/pitofsuccess.errors/` — error semantics
5. `briefs/practices/code.prod/readable.comments/` — comment headers

## standard: hook file name pattern

**rule**: `pretooluse.[verb]-[description].sh`

**blueprint proposes**: `pretooluse.allow-rhx-skills.sh`

**check**:
- `pretooluse.` prefix ✓
- `allow-` verb ✓
- `rhx-skills` description ✓

**verdict**: adheres

## standard: test file name pattern

**rule**: TypeScript integration tests for hooks use `.integration.test.ts`

**blueprint proposes**: `pretooluse.allow-rhx-skills.integration.test.ts`

**check**: matches extant pattern from `pretooluse.forbid-suspicious-shell-syntax.integration.test.ts`

**verdict**: adheres

## standard: exit code semantics

**rule (from rule.require.exit-code-semantics.md)**:
- exit 0 = success
- exit 1 = malfunction
- exit 2 = constraint

**blueprint uses**:
- exit 0 for allow (with JSON output)
- exit 0 for pass-through (without output)

**check**: Claude Code hook semantics differ from skill semantics. for hooks:
- exit 0 = proceed (allow or pass-through based on output)
- exit 2 = block

**verdict**: adheres to hook semantics (not skill semantics)

## standard: fail-fast

**rule (from rule.require.fail-fast.md)**: errors should surface immediately, not hide

**blueprint behavior**:
- if stdin parse fails → exit 0 (pass-through, not hide)
- if command extract fails → exit 0 (pass-through)

**check**: pass-through ensures the normal permission flow handles edge cases. errors don't hide, they delegate to the extant system.

**verdict**: adheres (fail-safe delegates to extant system)

## standard: comment headers

**rule (from rule.require.what-why-headers.md)**: procedures need `.what` and `.why` headers

**blueprint proposes**: hook executable header (from test hook format)

```bash
#!/usr/bin/env bash
######################################################################
# .what = auto-approve rhx skill commands to bypass safety heuristics
#
# .why  = rhx skills are pre-approved via permissions, but claude code's
#         bash safety heuristics still prompt for special characters.
#         this hook returns permissionDecision:allow for rhx commands.
#
# guarantee:
#   - only allows commands that start with rhx prefix
#   - rejects commands with dangerous operators outside quotes
#   - fail-safe: errors pass through to normal flow
######################################################################
```

**verdict**: adheres (header pattern matches extant hooks)

## standard: variable names

**rule (from rule.require.order.noun_adj.md)**: use `[noun][adj]` order, not `[adj][noun]`

**blueprint uses**: `CMD`, `CMD_STRIPPED`, `STDIN_INPUT`

**check**:
- `CMD` — simple noun ✓
- `CMD_STRIPPED` — `CMD` (noun) + `STRIPPED` (state) ✓
- `STDIN_INPUT` — follows extant hook pattern ✓

**verdict**: adheres

## standard: no gerunds

**rule (from rule.forbid.gerunds.md)**: avoid -ing words

**blueprint variables/comments**: none use gerunds

**verdict**: adheres

## standard: input-context pattern

**rule (from rule.require.input-context-pattern.md)**: functions use `(input, context)` pattern

**applicability**: this is a bash executable, not TypeScript. the pattern applies to TS functions.

**verdict**: not applicable to bash hooks

## standard: idempotent procedures

**rule (from rule.require.idempotent-procedures.md)**: operations should be idempotent

**blueprint behavior**: hook checks a command and returns allow or pass-through. no state changes. pure function of input.

**verdict**: adheres (pure function, no side effects)

## standard: test pattern

**rule (from howto.write-bdd.[lesson].md)**: use `given`, `when`, `then` with test-fns

**blueprint test approach**: TypeScript integration tests with test-fns BDD structure

**verdict**: adheres (matches extant test patterns)

## issues found

none. the blueprint follows mechanic role standards.

## non-issues confirmed

### hook name follows convention

**why it holds**: `pretooluse.allow-rhx-skills.sh` matches `pretooluse.[verb]-[description].sh` pattern used by all extant hooks

### exit codes match hook semantics

**why it holds**: Claude Code hooks use exit 0 for success (allow/pass-through) and exit 2 for block. this is different from skill exit codes.

### fail-safe via pass-through

**why it holds**: errors delegate to the extant permission system rather than hide or bypass. this is safer than silent failure.

### comment header follows standard

**why it holds**: `.what`, `.why`, and `guarantee` sections match extant hook headers

## conclusion

the blueprint adheres to all applicable mechanic role standards. no issues found.
