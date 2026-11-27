# catalog.of=tactic.constraint.kind=assumption.grain=declaration.tactic=attest

a member of `catalog.of=tactic.constraint._`. kind `assumption`: a constraint the world keeps. grain `declaration`: what must be true, in the entry. the peer of `tactic=assert`.

## .the move

declare each condition the world keeps that our correctness rests on: the claim, whom it rests on, the evidence and its strength, the blast radius, the required response on each break (absorbed or surfaced), and a review-by date. first convert what you can: a parse at the boundary turns an assumption into an invariant we own.

## .why

> each process is specified "by a pair of assertions" — misra & chandy 1981, *ieee tse* SE-7(4) ✅

one assertion says what a component assumes of its environment; the other, what it commits to in return. the assume half is ours to write down. no one else will.

## .in our tools

- `[a002] stripe delivers each webhook at least once` — evidence: stripe's docs and a test against stripe test mode. on break: a doubled event is absorbed; a missed one is surfaced within a day
- `[a001] a surfer's stated birth date is true` — evidence: belief, plus a parent's signature at the counter
- an upstream `g00n` cited as evidence: their guarantee is our assumption

## .the failure it prevents

correctness that rests on a condition no one wrote down. stripe redelivers `charge.succeeded`, and the surfer gets two receipts. the review that asked "can it arrive twice?" heard "that never happens".

## .relations

- `rule.forbid.implicit-assumptions`, `rule.require.assumptions-with-evidence` — the rules a reviewer loads for this tactic, shared with `tactic=assert`
- `tactic=assert` — the other grain of `assumption`: attest declares the required response; assert meets it
- `tactic=itemize` — the `_` declaration: the entry this assumption is written into
- `define.constraint.kind=assumption` · `define.constraint.grain=declaration` — the terms
- `howto.itemize-constraints.template=assumption` — the entry form
- `ref.invariant.history` — rely / guarantee and assume / guarantee, in full
