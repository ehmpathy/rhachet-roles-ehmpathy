# fulcrum F3: plan exits 2 on the nudge

## .the fork
- (a) plan prints the nudge and exits 0
- (b) plan prints the nudge and exits 2, as apply does

## .taken
(b). the issue says the write "halts on its first pass" and plan "prints the same nudge". one exit per state keeps plan a true preview of apply: a plan that exits 0 would read green for an apply that halts. the nudge's rerun line keeps `--mode plan`, so the caller previews again with the promise, then applies.

## .rework
clean: one exit code in the gate.

## .confidence
80%.

## .where
the shared gate.

## .verdict
open.
