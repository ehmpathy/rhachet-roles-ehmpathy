# F1 — scope = review threads + issue comments; review bodies excluded

## the fork
- A: review threads only (the wish's done-list)
- B: review threads + issue comments (task #1171: "every review comment thread and every issue comment")
- C: B + review bodies (the approval text itself)

## taken: B, and why at the time
- the wish says the task's words govern it; the task names issue comments
- a rule for issue comments already ships: `as_rows_unanswered` (`git.pull.comment.get.sh:157-173`) — a human issue comment newer than the robot's latest issue comment. no new rule to invent
- review bodies excluded: "approved, given the comments are addressed" is the condition, not a question; an answer to it proves naught the thread gate does not

## rework: clean
drop the issue half of the rule, or add a review-body reader. no caller hardens against B.

## confidence: 80%, why low
first draft took A on the false premise that issue comments carry no structure; the self review found the extant rule. the wisher may still want review bodies counted.

## where
1.vision.yield.md § the contract, § open questions

## verdict
(awaits council)
