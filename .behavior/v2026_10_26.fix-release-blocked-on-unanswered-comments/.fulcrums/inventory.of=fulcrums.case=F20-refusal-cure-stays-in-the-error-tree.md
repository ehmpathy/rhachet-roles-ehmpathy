# F20 — the refusal's cure stays inside the error tree, not a 🥥 block

## the fork
- **a.** keep `see them` / `answer` / `then` (and the malfunction `fix:` lines) as branches of the `✋ ConstraintError` or `💥 MalfunctionError` tree
- **b.** move each command into a `🥥 did you know?` block after a blank line (`rule.require.coconut-hints`)

## taken: a, and why at the time
the coconut rule's own caveat: "a hint is optional guidance, so it must never carry information the render needs to be correct", and a coconut block that carries required information is graded a blocker there. the refusal's cure is the only way past an exit-2 gate, and the malfunction's `gh pr merge <n> --disable-auto` is the one act that stops a merge past unread comments — both required, neither optional. `rule.require.errors-name-the-fix` puts the fix in the error itself. the extant git.release errors (`needs rebase` → `hint: rhx git.branch.rebase begin`) keep their cure in the tree too.

## rework: clean
render-only; one printer per block, snapshots move.

## confidence: 75%, and why it is low
a reviewer read the commands as next-move hints; the line between "the fix" and "guidance" is a judgment the house style does not draw for a gate.

## where
`output.sh` (`print_comment_refusal`, `print_comment_read_failure`, `print_automerge_disable_failure`, `_print_watch_end_automerge`)

## verdict
open
