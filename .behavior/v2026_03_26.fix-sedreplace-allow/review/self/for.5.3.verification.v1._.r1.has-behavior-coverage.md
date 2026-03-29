# self-review round 1: has-behavior-coverage

## objective

verify every behavior from wish/vision has a test in the verification checklist.

## wish behavior

| behavior from wish | test coverage | status |
|--------------------|---------------|--------|
| rhx sedreplace with special chars runs without prompt | P1-P5 in integration tests | ✓ |

the wish was: "eliminate permission prompts for sedreplace commands with special characters like `{ }` and `( )`"

this is covered by P1-P5 positive cases that test curly braces, parentheses, brackets, pipes, and complex patterns.

## vision behaviors

### positive cases (from vision test boundaries)

| case | behavior | test file | status |
|------|----------|-----------|--------|
| P1 | curly braces in argument | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| P2 | parentheses in argument | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| P3 | square brackets in argument | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| P4 | pipe char in regex argument | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| P5 | complex pattern with multiple metachars | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |

### negative cases (from vision test boundaries)

| case | behavior | test file | status |
|------|----------|-----------|--------|
| N1 | pipe chain rejected | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| N2 | semicolon chain rejected | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| N3 | AND chain rejected | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| N4 | OR chain rejected | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| N5 | command substitution $() rejected | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| N6 | backtick substitution rejected | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| N7 | newline injection rejected | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| N8 | output redirect rejected | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| N9 | process substitution rejected | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| N10 | background exec rejected | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |

### edge cases (from vision test boundaries)

| case | behavior | test file | status |
|------|----------|-----------|--------|
| E1 | non-Bash tool | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| E2 | empty command | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| E3 | non-rhx command | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |
| E4 | malformed JSON | pretooluse.allow-rhx-skills.integration.test.ts | ✓ |

## why this holds

- every behavior from wish is covered (sedreplace with special chars → P1-P5)
- every positive case from vision (P1-P5) has a test
- every negative case from vision (N1-N10) has a test
- every edge case from vision (E1-E4) has a test
- all tests point to the same file: pretooluse.allow-rhx-skills.integration.test.ts
- verification checklist maps all usecases to test cases

## no issues found

all behaviors have coverage.
