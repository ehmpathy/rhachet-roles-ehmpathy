# F16 — bound the eight dark level-1 lanes, rather than overrule them

## the fork

- **A (taken)** — a guard edit: bound each hung lane's `--paths-with` to `src/**`, then re-run
- **B** — a human overrule of the eight lanes; the stage passes on r9–r12 alone

## taken, and why

eight level-1 lanes of `5.3.verification` have never produced a verdict — i001, i002, i003 all
timed out at 21 minutes, pre-scope, with no log dir written. the one level-1 lane that finishes
(r9, `mech-test-scope-purity`) is the one lane with a bounded glob, `'{src,blackbox}/**/*.test.ts'`,
and scopes in 24s. every dark lane opens its glob with `**/`, which walks a worktree that holds
70928 gitignored files. A restores eight lenses; B ships with them dark.

the bound matches the guard's own artifact scope, `src/**/*`:

- `'**/*.{ts,sh,md,snap}'` → `--paths-with 'src/**/*.ts' --paths-with 'src/**/*.sh' --paths-with 'src/**/*.md' --paths-with 'src/**/*.snap'`
  (a brace in the extension slot is silently dropped by the review parser, so it splits into four)
- `'**/*.test.ts'` → `'src/**/*.test.ts'`; `'**/*.snap'` → `'src/**/*.snap'`

## rework

clean — a bind string in one guard, no code ripples.

## confidence — 80%, and why not higher

the proof is indirect. the hooks forbid a timed walk and a hand-run review, so the cause is
inferred from the pattern (bounded lane finishes, all unbounded lanes hang, across three rounds and
two load levels), not measured. the lanes also lose sight of the route docs and root configs under
the new bound — those sit outside `src/**`, which the guard never declared as its artifact anyway.

## where

`.behavior/v2026_09_26.fix-git-sponsor/5.3.verification.guard` — lanes r1–r8.

## the block

the guard file is write-protected; the privilege is `rhx route.mutate grant allow`, human-only.
`0/3` reads as rounds SPENT — a malfunction spends none, so each dark lane holds 3 rounds left and no
budget top-up is owed.

## verdict

A — the wisher granted the privilege. the binds are applied (no `**/` glob remains in any
`--paths-with`) and the grant is revoked.
