# F10 — one answer identity across modes

## the fork
- A: keep "robot = current login + 🐢 body" (extant `is_robot`)
- B: answer = a 🐢-opened body, whoever authored it
- B′: answer = a 🐢-opened body that ends with the key claim `<!-- rhx:git.pull.comment key=… -->`, whoever authored it
- C: fetch the seaturtle keyrack token for the comment read in every mode, so "current login" is always seaturtle

## taken: B′, and why at the time
- `git.release.sh:334-347` fetches the seaturtle token in apply mode only. under A, plan on a human's machine reads as the human: each seaturtle answer reads foreign, every thread shows unanswered, and plan disagrees with apply — the preview lies
- C couples plan to an unlocked keyrack (today plan runs with none) — new friction on the most-run mode
- B was the first pick; the assumptions review struck it: `rhelease[bot]`'s "🐢 released at …" (live, #1143) opens with 🐢, so under B it would count as an answer and, via the issue-comment rule (F9), clear every older human question
- B′: the key claim is written only by `git.pull.comment set` (`git.pull.comment.operations.sh:898`), which refuses a new comment with no `--key` (`git.pull.comment.set.sh:18`); `COMMENT_KEY_CLAIM_REGEX` (`:52`) already matches it

## rework: clean
`is_robot` is one jq def; swap its body.

## confidence: 70%, why low
- anyone can paste the marker by hand; low risk, since a reviewer has no motive to self-answer
- B′ changes the shipped `get --unanswered`, labeled "unanswered by $COMMENT_LOGIN"; its "from you" sense widens to "from any `git.pull.comment set` call"
- C is the stricter choice if the wisher accepts keyrack friction in plan

## where
1.vision.yield.md § the contract · surfaced in review.self has-questioned-requirements, tightened in has-questioned-assumptions

## verdict
(awaits council)
