# F6 — re-read comments on each watch poll

## the fork
- A: read comments once, at the status step, before automerge is enabled
- B: also re-read each watch poll; a new unanswered row disables automerge and exits 2

## taken: B (first draft took A; flipped at peer review i001)

why at the time of the flip:
- peer review i001, both lanes (dimensional-decomposition blocker.1, experience-coverage blocker.2): under A, a comment that lands after the gate read and before github's merge ships unanswered — the exact #693 harm, and a merge cannot be undone. cost ∞ → a critipath, not the alterpath A had labeled it
- the first draft chose A on api cost alone; that weighed a bounded cost against an unbounded harm

## rework: clean
the disable call from F5 is reused; the read is the same function the gate calls.

## confidence: 85%, why low
- a residual window remains: a comment in the seconds between the last poll and github's server-side merge. one poll interval wide, accepted
- per-poll reads raise api use (~6 calls per poll); bounded against 5000/hr per token

## where
1.vision.yield.md § the contract, § [answered] · case=9

## verdict
(awaits council)
