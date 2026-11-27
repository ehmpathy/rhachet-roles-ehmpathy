# catalog.of=tactic.constraint.kind=guarantee.grain=enforcement.tactic=prove

a member of `catalog.of=tactic.constraint._`. kind `guarantee`: a constraint we keep, for consumers. grain `enforcement`: what asserts it is not broken, in code. the peer of `tactic=promise`.

## .the move

prove each guarantee before each release, with a blackbox acceptance test through the published contract. the test name cites the id (`[g001]`). to amend a guarantee, amend the entry first, then the test, and release-note it as a major.

## .why

> "a component need behave correctly only when its environment does, and each component is part of the others' environments" — abadi & lamport 1993, *toplas* 15(1) ✅

our guarantee is part of each consumer's environment. their correctness rests on it, so it earns a proof before each release.

## .in our tools

- `given('[g001] a reservation id never changes once issued', …)` in an `.acceptance.test.ts`, against the built contract (`rule.require.acceptance.blackbox`, mechanic)
- an assertion on `[g001]` is never weakened to turn red green (`rule.forbid.test-edit-without-named-proof`, mechanic)

## .the failure it prevents

a guarantee broken by an edit to its own test. a refactor reissues ids on reschedule, and the acceptance test goes red. someone re-snapshots it green, and every consumer that saved an id ships a dead link.

## .relations

- `rule.forbid.test-edit-without-named-proof`, `rule.require.acceptance.blackbox` (mechanic) — the rules a reviewer loads for this tactic
- `tactic=promise` — the other grain of `guarantee`: prove shows the promise still holds
- `tactic=compose` — the `_` enforcement: our proof is the evidence a consumer's assumption rests on
- `define.constraint.kind=guarantee` — the term, and why an amendment ships as a major
- `define.constraint.grain=enforcement` — the devtime rung
