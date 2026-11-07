# F7 — reuse `as_rows_unanswered`, amend it in place

## the fork
- A: write a gate-only rule per the wish: "a thread whose only comment is the reviewer's own is unanswered; a reply in the thread, or a resolved thread, answers it"
- B: reuse the shipped rule (`git.pull.comment.get.sh:157-173`: latest comment not the robot's), and add the wish's resolved clause + the task's human clause inside it

## taken: B, and why at the time
- two rules for one concept is a synonym (`rule.require.ubiqlang`); the driver answers from `get --unanswered` and must see the same rows the release refuses on
- B is stricter where it matters: a reviewer who asks again after the robot's reply re-opens the row. under A any reply closes the thread forever
- the reviewer of #1143 asked for exactly B: "all the ones where the latest reply does not end with our header"

## rework: clean
the gate calls one function; its body can swap.

## confidence: 75%, why low
the wish's words describe A. the amendments change #1143's verb output ([case21] snapshots move).

## where
1.vision.yield.md § the contract

## verdict
(awaits council)
