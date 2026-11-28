# F12 — the pr opens at the route's end, not at the execution stone

## .the fork

the wish owes a pr with green ci. a peer reviewer of `5.1.execution` graded its absence a blocker: the branch has no commit and no pr.

- **now** — commit and push at 5.1, so the review sees a pr
- **at the end** — commit, push, and open the pr once the route reports no next stone

## .taken, and why

at the end. a driver commits only when a stone asks for a commit, or when the route is finished. 5.1 does not ask for one, and 5.3 verification follows it. a commit now would also change what the reviewers see mid-review. the pr, its body led by the solution, and the ci watch close the route.

the scope of that commit is settled already (F7): only the pull-watch skill dir, the sessionstart hook and its test, the brief, this route's `.behavior` dir, and its `.dream` files.

## .rework

clean: the order of two acts at the route's end.

## .confidence

95%.

## .where

the route's end, after `5.3.verification`

## .verdict

open
