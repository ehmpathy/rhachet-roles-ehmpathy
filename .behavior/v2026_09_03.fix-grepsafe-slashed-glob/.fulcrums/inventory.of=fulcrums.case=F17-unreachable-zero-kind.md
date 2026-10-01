# F17 — one of the five advertised zero-kinds can never render: rank it, or delete it

- **rework**: clean (code — a guard reorder, or a two-line delete plus a `--help` line) · dirty (round)
- **status**: 🔴 self-reversed — A landed
- **confidence**: 70%
- **raised**: by `r008`, whose clamp request measured it; re-raised by `r006` and `r010`
- **where**: `grepsafe.sh` — `diagnose_zero_kind`, the `no readable file matched` guard

## .the fact

`[case39][t0]` was written to assert `no readable file matched`. it returned `could not tell which
zero — the file probe failed`, and the step pins that.

1. `diagnose_zero_kind` re-runs the search's scope via `rg --files`
2. the permission denial that gives the search its `DIAGNOSTICS` also makes the probe exit >=2
3. the probe-failed kind is claimed after this guard, so it always wins

the condition that sets the kind is the condition that overrides it. `--help` promises five
distinguishable zeros, and acceptance 7 requires each to read apart; one cannot render.

## .the fork

| option | cost |
|---|---|
| A — rank it above probe-failed | re-cuts the ladder's precedence; changes the most-snapped text |
| B — delete the branch and its `--help` line | loses the case where the main run reports a skip the probe survives |
| **C (taken)** — mark it in code, ledger it | the distinction stays unavailable |

A reverses a deliberate rule: a measured kind outranks an inferred one. it needs a reason stronger
than "the branch should be reachable".

## .taken, and why

**C.**

1. **SAFE ⛔.** A and B both change the sentence a caller reads on a zero — the round's headline
   deliverable.
2. **the harm is bounded.** at a permission skip the caller gets `could not tell which zero — the file
   probe failed` plus the `unread` block, which names the path. true and actionable; the loss is a
   finer distinction.
3. **the marker answers `r006`.** the guard carries the measurement, the clamp, and a pointer here.

## .confidence — 70%

B's cost is unmeasured: no fixture shows the main run reports a skip the probe survives. if no such
case exists, B is free and C is needless. one fixture settles it.

## .verdict

🔴 **self-reversed 2026-09-28 — A.** the wisher asked whether every dream this route owed was pulled
in. the SAFE ⛔ above graded the change, not the harm: the new sentence is the more informative of
two true answers, on the round's own headline surface. scope is not one of the two questions.

- `diagnose_zero_kind` claims `no readable file matched` after the probe kind. probe-failed now
  holds only when the probe fails with no stderr at all
- the reason A needed: a skip is measured on stderr; `probe failed` is inferred from an exit code.
  the same "measured outranks inferred" rule this entry cited, applied to the right pair
- `[case39][t0]` asserts the readable-skip kind and the absence of `could not tell which zero`.
  `[case31][t2]`, a denied root, resnapped to the same kind
- teeth: the old precedence restored ⇒ `[case39][t0]` red; the fix ⇒ green. grepsafe 143/143

the caught dream is discharged and pruned.
