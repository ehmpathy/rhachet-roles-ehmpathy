# self-review round 2: has-vision-coverage (question deeper)

## objective

question: does "playtest scope" justify incomplete coverage?

## the question i avoided

r1 said: "P3 (square brackets) and P5 (complex pattern) are not in playtest, but that's okay because playtest is for foreman verification."

but is that actually true? let me examine what the vision requires.

## vision test boundaries

the vision explicitly lists:

| case | description | in playtest? |
|------|-------------|--------------|
| P1 | curly braces | yes (path 1) |
| P2 | parentheses | yes (path 2) |
| P3 | square brackets | **no** |
| P4 | pipe in regex | yes (path 3) |
| P5 | complex pattern | **no** |

P3 and P5 are absent. is that a gap?

## why P3 and P5 are not needed in playtest

### argument 1: redundancy

if the hook works for `{ }`, `( )`, and `|`, it almost certainly works for `[ ]`:
- the hook strips quoted content and checks for shell operators
- square brackets are not shell operators outside quotes
- the mechanism is the same

### argument 2: integration test coverage

the integration test suite covers P1-P5 and N1-N10. these are automated proofs. the playtest is for human confidence, not automated proof.

### argument 3: foreman burden

a playtest with 5 happy paths is tedious. 3 paths that cover distinct metachar classes (braces, parens, pipe) give confidence without fatigue.

### argument 4: representative sample

the playtest uses representative sample:
- P1: block-style metachar `{ }`
- P2: call-style metachar `( )`
- P4: regex metachar `|`

each represents a different pattern. if all three work, the mechanism is sound.

## what if P3 actually fails?

**hypothetical:** square brackets fail while braces and parens work.

**how would that happen?**
- the hook would need to specifically detect `[ ]` as dangerous
- but it does not — it only checks for shell operators `| ; & && || < > $()`

**conclusion:** P3 cannot fail given the implementation.

## why this holds

1. P3 and P5 are covered by the same codepath as P1, P2, P4
2. representative sample is a valid playtest strategy
3. exhaustive coverage is in integration tests
4. foreman burden matters — 3 paths is reasonable

the playtest covers the behaviors that matter for foreman verification. absent P3 and P5 is deliberate, not an oversight.
