# F18 — the gate's call site and operations keep the skill's extant idioms

## .the fork

peer i003 r003 nitpick.1, r004 nitpicks 1, 3, 4:

- extract a named predicate for "apply mode and not merged", a builder for the guard's header
  string, one shared named-arg parser, and one shared header prologue for the two gate renderers
- keep the idioms every other git.release operation uses: an inline `[[ ]]` mode check at the call
  site, the header string built beside the extant apply header, a per-function `case` parser, and
  one prologue per renderer

## .taken

keep. each named-arg `case` loop and each inline mode check matches the shape of the operations
around it; a shared parser or prologue applied only to the new functions would leave the skill with
two idioms for one job. a skill-wide pass that composes them once is a clean follow-up, and it
belongs with the F12 / F17 recomposition, not in the gate's diff.

## .rework

clean. extract four operations, call them from the gate, its renderers, and the caller.

## .confidence

80%. the reviewer is right that the parser idiom repeats nine times.

## .where

`git.release.sh` (the guard call site); `git.release._.guard_pr_has_human_approval.sh`
(`_render_review_gate_refusal`, `_render_review_gate_malfunction`); `git.release.operations.sh`

## .verdict

awaits the commander.
