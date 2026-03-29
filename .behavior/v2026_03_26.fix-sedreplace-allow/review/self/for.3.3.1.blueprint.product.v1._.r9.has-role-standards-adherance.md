# self-review round 9: has-role-standards-adherance

## objective

deeper review of mechanic role standards — verify no rule categories were overlooked.

## expanded rule directory check

### directories checked in r8

1. `lang.terms/` — name conventions
2. `lang.tones/` — tone and style
3. `code.prod/evolvable.procedures/` — function patterns
4. `code.prod/pitofsuccess.errors/` — error semantics
5. `code.prod/readable.comments/` — comment headers

### additional directories to check in r9

6. `code.prod/readable.narrative/` — code flow patterns
7. `code.prod/pitofsuccess.procedures/` — idempotency
8. `code.test/frames.behavior/` — test structure
9. `work.flow/tools/` — tool usage patterns

## standard: narrative flow

**rule (from rule.require.narrative-flow.md)**: flat linear code, no nested branches

**blueprint codepath**:
```
├── extract command
├── if not Bash → exit 0
├── if no match → exit 0
├── check command substitution → exit 0 if found
├── strip quotes
├── check operators → exit 0 if found
├── check newlines → exit 0 if found
└── output allow JSON
```

**check**: each step is a guard clause with early exit. no nested if/else. linear flow.

**verdict**: adheres

## standard: else branches

**rule (from rule.forbid.else-branches.md)**: never use else or if-else

**blueprint approach**: all checks use early return pattern: `if X then exit 0`

**check**: no else branches in codepath

**verdict**: adheres

## standard: idempotent operations

**rule (from rule.require.idempotent-procedures.md)**: operations should be safe to run twice

**blueprint behavior**: hook is a pure function. same input → same output. no state.

**verdict**: adheres

## standard: test structure

**rule (from rule.require.given-when-then.md)**: tests use `given`, `when`, `then`

**blueprint test coverage section**: defines P1-P5, N1-N10, E1-E4 test cases

**how tests will be structured**:
```ts
given('[P1] rhx command with curly braces', () => {
  when('[t0] hook processes command', () => {
    then('returns permissionDecision: allow', () => { ... });
  });
});
```

**verdict**: adheres to BDD pattern

## standard: test utility reuse

**rule (from r5 review)**: use `build_stdin_json()` utility for hook tests

**blueprint test approach**: will use extant test utility pattern

**check**: r5 review identified this pattern, will apply in implementation

**verdict**: will adhere (noted for execution)

## standard: forbidden terms

**rule (from rule.forbid.term-*.md)**: avoid vague terms

**blueprint terms used**:
- "command" — acceptable, specific
- "operator" — acceptable, specific
- "hook" — acceptable, domain term
- "pattern" — acceptable in regex context

**check**: no forbidden terms like "helper" found

**verdict**: adheres

## standard: shell portability

**rule (from r2 review)**: avoid non-portable shell features

**blueprint uses**: `grep -qP` for newline detection

**issue from r2**: BSD grep (macOS) lacks `-P` flag (PCRE support)

**fix noted in r2**: use `[[ "$CMD" == *$'\n'* ]]` instead

**check**: this fix must be applied in execution

**verdict**: fix noted (will apply in execution)

## issue found

none new. the fix for `grep -qP` was already identified in r2 and will be applied.

## non-issues confirmed

### linear narrative flow

**why it holds**: codepath uses early exit guards, no nesting

### no else branches

**why it holds**: all conditions are `if X then exit`

### BDD test structure

**why it holds**: test coverage table maps to given/when/then cases

### shell portability

**why it holds**: r2 identified the `grep -qP` issue; fix documented for execution

### forbidden term avoidance

**why it holds**: blueprint uses domain-specific terms, not vague placeholders

## conclusion

r9 confirms adherance to all additional rule categories. the only open item is the `grep -qP` portability fix, which was already documented in r2 and will be applied in execution.
