# F20 — the gate's next-move lines stay inline tree branches, not `🥥 did you know?` blocks

## .the fork

- **A (taken)**: each refusal and malfunction ends with its next move as the last branch of its
  own tree (`└─ ask your human to review: <url>`, `└─ re-run --apply; the gate judges the new head`,
  `└─ retry in a moment; …`), the shape every extant git.release exit uses (`└─ hint: …`)
- **B**: move each next move into a `🥥 did you know?` block below the tree
  (`rule.require.coconut-hints`)

## .taken, why

- git.release already draws `🥥 let's watch` as a node inside the release tree; a second `🥥` block
  for hints, in the same output, reads as a second watch
- the next move sits on the line a reader's eye lands on last in the tree, beside the cause it fixes
- every extant git.release exit (`rhx git.branch.rebase begin`, `--retry`, `rhx show.gh.test.errors`)
  renders its hint inline; a gate that alone used a coconut block would split one skill's voice
  in two

## .rework

clean: the hint strings live in four renderers (`_render_review_gate_refusal`,
`_render_review_gate_malfunction`, `_check_automerge_lease`, `_check_automerge_lease_verdict`); a
move to coconut blocks touches those and the p9 snapshots, no contract

## .confidence

75%: the coconut rule is house law for next moves; the call rests on one skill's consistency, and a
skill-wide coconut migration (every extant hint too) may be what the commander prefers

## .where

`src/domain.roles/mechanic/skills/git.release/git.release._.guard_pr_has_human_approval.sh`,
`git.release._.emit_transport_watch.sh`

## .verdict

awaits the commander
