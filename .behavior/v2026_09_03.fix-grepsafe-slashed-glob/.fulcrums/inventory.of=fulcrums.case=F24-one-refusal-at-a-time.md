# F24 — a refusal surface reports one failure at a time, in a fixed gate sequence

- **rework**: clean (code) · clean (round)
- **status**: open, best-guessed
- **confidence**: 88%
- **raised**: by `r007` (arch-hazards-behavior), nitpick.1; nitpick.4 rides the same call
- **where**: `globsafe.sh` + `grepsafe.sh` — the validation block of each

## .the observation

both skills validate in a fixed sequence, so the refusal a caller meets depends on which other
arguments accompany their mistake:

```
globsafe.sh --pattern x --output direct --path /tmp   ->  the rename refusal
globsafe.sh --pattern x --path /tmp                   ->  the boundary refusal
```

the lane cites `rule.forbid.behavior-hazards`' order-dependent item, and grades it a nitpick because
*"every path still exits 2 with a named fix"*.

## .the fork

| option | shape |
|--------|-------|
| **A (taken)** | one refusal at a time, each with a named remedy; argv-shape gates first, filesystem gates second |
| B | one pass over every gate, then render the whole set |
| C | rank gates so the "most important" wins |

## .taken, and why

**A.**

- every path exits 2 and names a next move, so a caller is never stuck and each remedy is one step.
- B is worse for a human: later failures are mostly consequences of the first. several gates cannot
  run until earlier ones pass (the boundary check needs a root that expanded), so B needs a redesign.
- C has no checkable principle and still shows exactly one refusal.
- the sequence has a reason: a bad flag value is knowable without a syscall, so argv gates run before
  filesystem gates.

## .confidence — 88%

the 12%: a measured caller who cycled three or more times through refuse-fix-refuse on one call. if
seen, render the unreached gates as a warn list beneath the refusal.

## .nitpick.4

the lane grades both points *"accepted-and-documented tradeoffs, reported only for completeness"*:

1. globsafe does not sort its diagnostics. grepsafe sorts because `rg` walks in parallel; globsafe's
   shell expansion is sequential. a discipline copied without its cause teaches a false reason.
2. the two skills name the tally's source variable differently for one semantic. a converge-rename
   across two skills is readability work to keep out of a defect round
   (`rule.require.review-test-changes`).

## .verdict

⬜ unruled.

## .see also

- `rule.require.errors-name-the-fix` — the property A preserves
- F16 — globsafe's stream contract, on the same refusal surface
