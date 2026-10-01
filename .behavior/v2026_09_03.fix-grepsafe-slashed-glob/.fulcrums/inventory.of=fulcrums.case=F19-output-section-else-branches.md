# F19 — flatten the output section's two `else` branches, or accept the shape?

- **rework**: clean (code — a restructure of ~20 lines) · dirty (round)
- **status**: open, best-guessed
- **confidence**: 80%
- **raised**: by `r006`, against the narrative-flow clause of `rule.forbid.maintenance-hazards` —
  *"no else branches, early returns for guards, one clear path"*
- **where**: `grepsafe.sh` — the output section: an `if pipeable … else … fi` with a nested
  `if -z OUTPUT … else … fi`

## .the fork

the lane is right on the rule and notes the branches are prior structure.

| flatten it | accept the shape |
|---|---|
| the section is in the diff and the rule's target | it is the round's headline render, recut four times this round |
| two `else` branches exceed the file's guard discipline | each is a binary decision, two lines, commented |
| the rest of the file uses early returns | the flatten doubles the render site of the `unread` block |

the lane's sketch — an early render for the zero, then the match render — makes the `unread` block
reachable from two exit paths: duplicated, or lifted into a function called at each. the sharpest
defect this round came from exactly that drift: the `results` node claimed last-ness while `unread`
followed it, because two arms decided it separately. today one `if [[ -n "$DIAGNOSTICS" ]]` serves
both.

## .taken, and why

**accept the shape.** SAFE ⛔: a fifth structural pass at the most-snapped code, for no behavior delta.
the rule's demand — a reader need not simulate this — is met by two commented binary decisions.

## .confidence — 80%

"prior structure" is a weak defence: `r009` used the mirror argument to move usage-refusal snapshots
in scope, and it was granted. the asymmetry that holds: a snapshot is additive and cannot regress
behavior; a render restructure can.

## .verdict

⬜ unruled.
