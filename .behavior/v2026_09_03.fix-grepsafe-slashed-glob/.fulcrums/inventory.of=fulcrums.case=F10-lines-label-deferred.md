# F10 — defer the `lines: N` mislabel, or fix it in this round?

- **rework** = clean
- **status** = 🔴 settled — option A, fix it. my deferral reversed, by me
- **confidence** = 60% → self-reversed
- **raised** = 2026-09-21, by peer lane `r010`
- **where** = `grepsafe.sh` result label · snapped in `case5` / `case6`

## .the fork

`r010`: *"Worth a fix-forward or explicit follow-up wish, since it's now the second round to carry it
forward unresolved."* both agree it is a defect. the fork is which exit.

| option | the act | the cost |
|---|---|---|
| **A (taken)** | switch the label with the mode; resnap `case5`/`case6` | touches user-faced output the wish bounded |
| B | defer with a dream and this fulcrum | a known ambiguous label ships |

## .my first call, and why it lost

B: the wish says *"do not widen grepsafe's surface ... a defect fix plus one line of provenance, never
a redesign"*, and a label change edits bounded output.

- **"widen" does not cover a correction.** the wish forbids a wider surface — a new flag, mode, or
  field. a fix to a wrong word on an extant line adds none.
- **`rule.forbid.ambiguous-labels` grades it a blocker.** a caller who reads `lines: 1` over one file
  is already misled, so the edit is the safe act.
- **the prior has a known sign.** `F3`, `F8`, and `F9` all ruled that my scope read was too narrow.

## .the verdict

**A.** the label tracks the mode: `files` under `--files-only` and `--count`, `lines` otherwise
(and `rows` under `--context`, per the later dream). `case5`/`case6` resnapped.

the untrue count sat three rows above the false zero this route killed — same class,
`rule.forbid.failhide` on the tally.

## .the record

dream (discharged):
`2026_09_21.fix-grepsafe-lines-label-under-files-only` — pruned once discharged
