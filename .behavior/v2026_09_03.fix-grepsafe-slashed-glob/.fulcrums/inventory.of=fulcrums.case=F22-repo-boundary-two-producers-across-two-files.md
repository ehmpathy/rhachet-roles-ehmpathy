# F22 — the repo-boundary check has two producers, across two files

- **rework**: clean (code) · dirty (round)
- **status**: ruled — landed with F16
- **confidence**: 74%
- **raised**: by `r011` (enroll-impl-arch-defects), graded `[nitpick][better]`
- **where**: `grepsafe.sh` — `validate_root_within_repo_or_fail` · `globsafe.sh` — an inline check

## .the fork

both files hand-roll one security invariant — every search root sits within `$REPO_ROOT` — though they
already share `output.sh`. `r011`:

> *"This is exactly F13's shape (two producers of one fact), but on a **security boundary** rather
> than a diagnostics text — the highest-stakes place for that pattern to recur."*

a future fix to the boundary (a symlink escape, a normalization gap) must land at both sites.

## .taken, and why

**leave it; rule it with F16.**

| | F15 (deferral reversed) | F22 |
|---|---|---|
| SAFE? | yes — one file's render | ⚠️ it moves a security check into a file six skills source; a wrong extraction weakens seven boundaries |
| CLEAN? | yes — inline in grepsafe | no — it changes `globsafe.sh`'s refusal behavior, with its own tests and snapshots |
| the deferral rested on | a scope argument | a measured ripple into a peer's test corpus |

`r011` concedes the ripple: it *"discharges one of globsafe's seven silent refusals **as a side
effect**."* that is F16's territory. to settle it here would settle F16 by side effect. if F16 rules
to repair globsafe, F22 lands with it for one extra function.

F16's list is not uniform: its stream defects put output in the wrong place; this is a security
invariant. no defect is live — both copies are correct today.

## .confidence — 74%

- the ripple is an estimate; the globsafe snapshot count is unmeasured
- deferrals on this file have been reversed before
- "correct today" is the weakest defence on a security boundary

## .verdict

✅ **ruled 2026-09-28: landed with F16**, as this entry forecast. once F16 ruled to repair globsafe,
the wisher approved the changes *"as long as they fulfill the vision."*

`output.sh` gained `is_path_within_repo_root --path --root`, a pure predicate with no refusal
behavior. grepsafe's `validate_root_within_repo_or_fail` and globsafe's inline gate both call it.
each skill keeps its own refusal text. both suites' outside-repo clamps stay green.
