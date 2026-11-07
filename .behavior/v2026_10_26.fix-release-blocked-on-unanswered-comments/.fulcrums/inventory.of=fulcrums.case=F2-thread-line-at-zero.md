# F2 — `💬` line shown on every pr transport, also at 0

## the fork
- A: always show (`💬 all review threads answered` at 0)
- B: show only when ≥1 unanswered

## taken: A, and why at the time
wish: "the count rides in the plan output beside the ci tally". a line that vanishes at 0 leaves the driver unsure the gate ran.

## rework: clean
one conditional in the emitter; snapshots re-run.

## confidence: 80%, why low
A churns every pr-transport snapshot (p1–p8); B is quieter.

## where
1.vision.yield.md § the contract, case=2

## verdict
(awaits council)
