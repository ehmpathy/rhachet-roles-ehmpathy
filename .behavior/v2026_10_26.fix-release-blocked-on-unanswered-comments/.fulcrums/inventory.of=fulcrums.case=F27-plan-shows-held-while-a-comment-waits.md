# F27 — plan and watch show `held` while a comment waits

## the fork
- A: plan and watch keep main's `automerge unfound (use --apply to add)` and print the gate hint below it
- B: while a comment is unanswered, plan and watch show `automerge unfound — held until each comment has an answer`, the same word apply shows

## taken: B, and why at the time
- under A, plan printed `(use --apply to add)` one line above `--apply will refuse until each comment has an answer`: an invite and a refusal side by side. r006 i001 graded that a contradiction, and B was the repair (`as_automerge_display` shows `held` in every mode)
- r011 i003 now reads `held` in plan as a claim plan acted, and asks for plain `unfound` plus the hint
- `held` names the state of the pr, not an act of the call: automerge stays off until each comment has an answer, whichever mode reads it. plan with no comment that waits still shows `(use --apply to add)`
- clamp: p9 case1 [t3], [t4] (bite: `held` gated back to apply → red)

## rework: clean
A is a one-line condition in `as_automerge_display` and a resnap of the plan/watch gate cases. r006's i001 concern would reopen.

## confidence: 70%, why low
two reviewers read one line two ways; each read is defensible, and the council may prefer a third phrase.

## where
`git.release._.emit_transport_status.sh` `as_automerge_display` · p9 case1 [t3], [t4], case17 · r006 (i001), r011 nitpick.4 (i003)

## verdict
(awaits council)
