# F16 — globsafe's refusals never reach stderr: fix the peer now, or ledger it

- **rework**: clean (code — ten `echo` sites plus a resnap) · dirty (round)
- **status**: ruled — fix it now
- **confidence**: 78%
- **raised**: by `r009` (ergo-friction-hazards); re-raised by `r010`, `r011`, `r009` again, and `r001`
  at the 5.3 gate — four lanes, five rounds
- **where**: `claude.tools/globsafe.sh` — every refusal path: absent `--pattern`, bad `--sort`, bad
  `--output`, bad `--head`, the retired `--output direct`, a second search root, not a repo, path
  outside the repo

## .the fact

every globsafe refusal is a bare `echo` to stdout. `rule.require.skill-output-streams` requires errors
on stderr too, and grades the violation a blocker. grepsafe's `emit_refusal` exists because of the
same defect, one file over.

three of the ten sites were added in this route — `--head` validation, the second-root refusal, and
the `direct` → `pipeable` migration — each in globsafe's extant idiom. a stderr arm on the new gates
alone would leave two conventions in one file with no signal which is current. each new gate carries
a comment that states it: F16 repairs all ten together, or none.

F16 holds the stream only. every new gate carries a full `got:`/`fix:`/`e.g.` remedy.

## .the fork

| fix it now | ledger it |
|---|---|
| the defect matches the one this round closed; the repair shape exists | globsafe is a peer skill with its own tests and snapshots |
| a caller who pipes globsafe reads its errors as data | the wish bounds the round to grepsafe |
| the knowledge is in hand now | `emit_refusal` is grepsafe-local; to share it is an extraction |

## .taken, and why

**ledger it.**

- **SAFE ⛔** — it moves a stream contract in a skill whose callers may read stdout for errors.
- **CLEAN ⛔** — the non-drift repair shares `emit_refusal` across the family; a hand-rolled copy is
  how grepsafe's own gate came to be missed twice.
- consistency: the same boundary held for F15's peer skills.

## .confidence — 78%

the rule grades this a blocker, and the defence is scope: the violation is not in this route's diff.
scope reads have been reversed before (F3, F8). what holds it out is blast radius, not merit.

the recurrence is predictable: the site count grew each round that touched globsafe, and every lane
that reads the rule against `globsafe.sh` re-raises it, as F20's ruled twin shows. a deferral whose
recurrence is predictable is a policy, and a policy owes a verdict.

## .the caught dream

`.dream/2026_09_21.fix-globsafe-errors-never-reach-stderr.dream.md` — discharged, then pruned

## .verdict

✅ **ruled 2026-09-28 by the wisher: fix it now**, and frame every refusal in the house format. the
wisher asked why globsafe's refusals lacked the 🐢 / 🐚 / 🥥 frame, then: *"update the stdouts to proper
format for all of those."*

what landed:

- `output.sh` gained `print_refusal_frame` (turtle, shell tree, 🥥 fix) and `emit_refusal_to_streams`
  (vibes → both streams; pipeable → stderr only, per F20)
- all ten globsafe refusals and every grepsafe hint refusal route through them. the rg-absent refusal
  lost its hand-rolled `🐢 bummer dude —` line for the shared frame
- globsafe's unknown flag is refused after the parse, so a later `--output pipeable` holds
- clamps: globsafe `[case17][t0]` asserts turtle, shell, 🥥, and `stderr === stdout` for nine
  refusals; `[case12][t4]` and `[t5]` pin the pipeable arm (stdout empty, glyph-free stderr)

the dream is resolved.
