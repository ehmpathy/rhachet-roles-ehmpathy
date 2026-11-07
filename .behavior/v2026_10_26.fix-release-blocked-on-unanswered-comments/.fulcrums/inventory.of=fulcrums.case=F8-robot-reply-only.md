# F8 — "answered" = the robot's 🐢 reply

## the fork
- A: keep the extant rule: only the current login's 🐢 body answers
- B: also accept a reply by the pr author (any login that authored the pr)

## taken: A, and why at the time
F7 reuses the extant rule unchanged on this axis; every driver answers via `git.pull.comment set`, which always writes the 🐢 header.

## rework: clean
widen `is_robot` in the jq defs to include the pr author.

## confidence: 70%, why low
a human who opens a pr and answers a reviewer by hand (no 🐢) would be refused until they post via `git.pull.comment set`. with F10, the answer test is the 🐢 signature, not the login, so the cure is open to the human too.

## where
1.vision.yield.md § evaluation (cons), § what is awkward

## verdict
(awaits council)
