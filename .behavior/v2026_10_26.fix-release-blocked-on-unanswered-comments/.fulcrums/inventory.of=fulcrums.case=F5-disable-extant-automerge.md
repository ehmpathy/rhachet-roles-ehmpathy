# F5 — apply disables an extant automerge when the gate fires

## the fork
- A: on `--apply` with automerge found and ≥1 unanswered thread, disable automerge, then exit 2
- B: exit 2 only; leave automerge on

## taken: A, and why at the time
under B github merges the moment checks pass, so the refusal is theater — the exact #693 failure, one step removed. apply already mutates automerge; to set it off is the same lever in reverse.

## rework: clean
drop one call.

## confidence: 85%, why low
a refusal that mutates may surprise; plan/watch stay read-only regardless.

## where
1.vision.yield.md § case=4

## verdict
(awaits council)
