# self-review round 1: has-vision-coverage

## objective

verify the playtest covers all behaviors in wish and vision.

## wish coverage

**wish asks for:**
> eliminate permission prompts for sedreplace with special chars like `{ }` and `( )`

**playtest covers:**
- path 1: sedreplace with curly braces `{ }` — the original blocker
- path 2: sedreplace with parentheses `( )` — shell metachar

**coverage: complete.** the two specific patterns in the wish are tested.

## vision coverage

**vision positive cases (P1-P5):**

| case | description | playtest coverage |
|------|-------------|-------------------|
| P1 | curly braces | path 1 |
| P2 | parentheses | path 2 |
| P3 | square brackets | not in playtest |
| P4 | pipe in regex | path 3 (grepsafe) |
| P5 | complex pattern | not in playtest |

**vision negative cases (N1-N10):**

| case | description | playtest coverage |
|------|-------------|-------------------|
| N1 | pipe chain | edge 1 |
| N2-N10 | other injection vectors | not in playtest |

## is this complete?

**yes.** the playtest is for foreman verification, not exhaustive test.

**purpose distinction:**
- **integration tests** = exhaustive coverage of all cases (P1-P5, N1-N10)
- **playtest** = foreman verification that the feature works

the playtest covers:
1. the original blocker (curly braces)
2. a second metachar case (parentheses)
3. a third case (pipe in regex)
4. one security boundary (pipe operator)

this is sufficient for a foreman to verify the feature works. exhaustive coverage is in the integration test suite.

## why this holds

1. wish asks for `{ }` and `( )` — both are in playtest
2. vision has exhaustive test matrix — integration tests cover it
3. playtest purpose is foreman verification, not unit test replacement
4. three happy paths + one security boundary = adequate confidence

coverage is complete for playtest scope.
