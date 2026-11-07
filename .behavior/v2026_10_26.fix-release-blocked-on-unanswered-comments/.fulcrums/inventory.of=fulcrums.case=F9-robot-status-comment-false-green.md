# F9 — an issue comment is answered only by a reply linked to its id

## the fork
- A: keep the extant issue-comment rule (`git.pull.comment.get.sh:167,171`): a human issue comment is answered once any robot signed issue comment is newer
- B: an issue comment is answered only by a signed issue comment whose key is `answer-<that comment's id>`

## taken: B (first draft held A as a known gap; flipped at peer review i002)

why at the time of the flip:
- peer review i002 (experience-coverage blocker.1): under A, an unrelated signed comment (`set --key status`) clears every older human issue question — a false green whose miss ships an unanswered comment, cost ∞. a critipath, which a deferral would leave open
- B needs no new mechanism: `git.pull.comment set --key <slug>` already writes the key claim, and the row already carries `key` (`shape()`, `git.pull.comment.get.sh:96-113`). the refusal row prints the exact key, so the cure is copy-paste
- B is stricter, so it fails closed: rows A called answered may now read unanswered, never the reverse

## rework: clean
one jq clause in `as_rows_unanswered`; the key convention lives in the refusal text.

## confidence: 70%, why low
- changes the shipped `get --unanswered` for issue comments; prs answered under A's bulk rule will show those rows again
- one answer per comment: a driver who answers three notes in one comment must post three keyed comments (or the wisher may prefer a multi-id key form)

## where
1.vision.yield.md § the contract (amendments) · case=11 · inventory rows 6, 7 · case=3's given

## verdict
(awaits council)
