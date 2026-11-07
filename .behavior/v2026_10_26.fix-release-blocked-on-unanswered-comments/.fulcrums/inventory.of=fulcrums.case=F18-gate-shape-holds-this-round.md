# F18 — `emit_comment_gate` keeps its shape: one function, a conditional disable

## the fork
- **a.** keep `emit_comment_gate` as one function (read, judge, print, disable) that returns its results through `COMMENT_GATE_*` globals; disable only when github reports automerge on
- **b.** split it into `get_all_pr_comments_unanswered` + an unconditional idempotent `disable_automerge`, and let each caller print for itself

## taken: a, and why at the time
a is the shape three reviewers just accepted as the fix for two copies of the gate (r011 i001 blocker.3). b rests on an unverified premise: that `gh pr merge --disable-auto` is a no-op, not an error, when automerge is off — if it errors, every comment refusal on a pr without automerge becomes a malfunction. the globals are documented in the function header and read by exactly two callers.

## rework: clean
the two callers each make one call; a split touches those two lines and the function itself.

## confidence: 75%, and why it is low
b is the purer decomposition. the no-op question it waited on is now settled: `disable_automerge` converges (a failed disable on a pr that reads off returns 0), proven live on #1143 by the real-api case. so the `automerge_on` argument and the `on|off` half of `COMMENT_GATE_AUTOMERGE` could collapse into one unconditional disable whenever a comment waits and `may_mutate` holds, which also closes the window where automerge turns on after the status read (r011 i013 nitpick.1, rule.require.fewer-paths-via-idempotency). held for the council: it reshapes the gate's contract, which this fulcrum reserves.

## where
`git.release._.emit_comment_gate.sh`

## verdict
open
