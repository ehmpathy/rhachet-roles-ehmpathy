# F28: a malfunction's `detail:` leaf keeps the raw failed command

## the fork

5.3 i004 r006 n2 reads `detail: return 1` and `detail: git commit -q --no-verify --no-gpg-sign -C "$1"`
in the ERR-trap render (case39, case81) as shell internals that a reviewer cannot vibecheck.

(a) expand or relabel the `detail:` payload, so no raw shell reaches the render · (b) keep it raw:
the `step:` leaf above it carries the human label (`as_cutover_step_label`, dream item 33), and
`detail:` is the evidence for whoever fixes a malfunction

## taken: (b), and why at the time

- a malfunction is the system's fault (exit 1, `rule.require.failloud`); its reader is the on-call
  engineer, who needs the exact command git ran, not a paraphrase of it
- the reviewer of 5.3 i001 r006 n1 asked for exactly this split: a plain headline, with
  `BASH_COMMAND` kept "under a `detail` child, so the debug fact stays". 5.3 i003 landed it
- an expansion of `"$1"` would print a full sha or path the snapshot must then mask; a relabel
  would hide the one fact the step label cannot carry
- the per-leaf `CUTOVER_STEP` label is the finer shape, should a function name read poorly (dream
  item 33); the reviewer graded the point `[nitpick][better]`

## rework: clean

one leaf in the ERR trap; two snaps flip.

## confidence: 80%, and why it is low

`return 1` as a detail is thin evidence: it names that a leaf failed, not which call inside it.
the line number beside the step label is what points the engineer to the call.

## where

`src/domain.roles/mechanic/skills/git.branch.cutover/git.branch.cutover.operations.sh` (the ERR trap)

## verdict

open — for the council.
