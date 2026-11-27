# catalog.of=tactic.constraint.kind=assumption.grain=enforcement.tactic=assert

a member of `catalog.of=tactic.constraint._`. kind `assumption`: a constraint the world keeps. grain `enforcement`: what asserts it is not broken, in code. the peer of `tactic=attest`.

## .the move

detect each break at the edge, where our system meets one we do not own, and fail fast. parse each third-party response at once. cap what you can, so a break is benign. surface the rest within a bound: a runtime assertion, or a monitor.

## .why

> "push the burden of proof upward as far as possible, but no further" — king 2019 ✅

the edge is as far up as our proof goes. past it the world keeps the claim, and only a check can see it break.

## .in our tools

- `asStripeCharge(response)` parses the vendor payload; a malformed one throws a `MalfunctionError`
- one payment per charge id, so a redelivered webhook has no effect
- a daily reconcile of charges against reservations, so a missed webhook surfaces within a day

## .the failure it prevents

a break that lands silent. stripe drops one webhook. the reservation stays `TENTATIVE`, the surfer paddles out unpaid, and the gap shows up only at the month-end close.

## .relations

- `rule.forbid.implicit-assumptions`, `rule.require.assumptions-with-evidence` — the rules a reviewer loads for this tactic, shared with `tactic=attest`
- `tactic=attest` — the other grain of `assumption`: assert meets the response attest declares
- `tactic=compose` — the `_` enforcement: a seam test is where an assumption meets the guarantee it rests on
- `define.constraint.grain=enforcement` — the runtime and monitor rungs
- `rule.require.parse-at-the-boundary` (domain.abstractions) — the convert move, in full
