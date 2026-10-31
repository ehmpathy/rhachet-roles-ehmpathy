# S5 — vision approved; blueprint checkpoint as a pr for the commander

## .said
> director: 1.vision approved by me (git.crew.grant, approver recorded). drive on: mark it passed and continue. a blueprint is the commander review: its open questions go to him, never best-guessed; push a pr at the blueprint checkpoint so he reviews on github. no merge, no --apply.

## .settled
- 1.vision is approved by the director; the driver marks it passed and drives on
- before code, a blueprint is written; it is the commander's review
- every open question in the blueprint goes to the commander as a question, with options, never a pick
- at the blueprint checkpoint the driver pushes a pr so the commander reviews it on github
- no merge of the pr, and no `--apply` of a release

## .landed
| artifact | change |
|---|---|
| route | 1.vision passed |
| `5.1.execution.from_vision.yield.md` | the blueprint is the first item; execution waits on the commander |
| `5.1.execution.blueprint.md` | the blueprint, with its open questions for the commander |
| github | a pr at the blueprint checkpoint; no merge, no release apply |
