# self-review round 3: has-edgecase-coverage (question the decision)

## objective

question: should the playtest really only have one edge case?

## the decision in r2

r2 said: "keep single edge case — two would confuse foreman."

**but wait.** is foreman confusion really the concern? or am i just lazy?

## what a foreman actually needs

a foreman verifies the feature works. what do they need to feel confident?

| confidence level | what they test |
|------------------|----------------|
| low | one happy path works |
| medium | multiple happy paths work |
| high | happy paths AND security boundary work |
| very high | happy paths, security boundary, AND multiple attack vectors |

the playtest gives "high" confidence. is "very high" worth the extra burden?

## cost-benefit of second edge case

### cost: add N5 (command substitution)

```sh
rhx sedreplace --old "$(echo x)" --new 'y' --glob 'src/**/*.ts'
```

expected: prompts for approval (passes through)

**burden:** one more command to run, one more result to verify.

### benefit: proves path B works

the foreman would see two rejection cases:
- N1: pipe outside quotes → rejected
- N5: command substitution → rejected

this proves both codepaths work.

### decision: keep single edge case

**rationale:**
1. "high" confidence is sufficient for a playtest
2. "very high" is for security audits, not playtests
3. the integration tests are the security audit
4. N5 would raise questions ("why these two? what about the other 8?")

## unusual inputs not covered

| input | covered? | concern |
|-------|----------|---------|
| empty pattern `--old ''` | no | could break sed |
| very long command | no | buffer limits |
| unicode chars | no | encode issues |
| nested quotes | yes (paths 1-3) | n/a |

these are not security concerns — they're robustness concerns. the hook doesn't process patterns; it just detects operators. robustness is the skill's problem, not the hook's.

## why this holds

1. one edge case proves security boundary exists
2. foreman gets "high" confidence, which is appropriate
3. "very high" confidence is for integration tests
4. unusual inputs are robustness concerns, not security

edge case coverage is complete for playtest scope.
