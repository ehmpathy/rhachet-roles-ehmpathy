# F7 — the "no edits to seal" check runs after `pnpm patch-commit`, not before

## .the fork

a reviewer (arch-hazards-behavior, i001 blocker.1) asked that commit detect "no edits" before it
calls pnpm, on the premise that `patch-commit` mutates the tree even with no diff.

- **A** — a pre-check: diff the edit dir against the store copy before the seal
- **B** — let pnpm decide, then read what it left: no patch file means no edits

## .taken: B, and why at the time

measured on pnpm 10: with no diff, `patch-commit` writes no patch, records no `patchedDependencies`
entry, and leaves the edit dir open. the post-check has naught to undo. a pre-check would be a second,
weaker copy of the diff pnpm already runs. `[case2][t3]` clamps the measured behavior: it asserts the
dir stays open and no record lands, so a future pnpm that mutates on an empty seal turns it red.

a prior patch defeats a bare file check: pnpm leaves it in place on an empty seal (i002 blocker).
so commit sets the prior patch aside before the seal, and puts it back when the seal writes naught;
`[case1][t15]` clamps it — the patch and note stay byte-equal and no `.aside` copy is left.

## .rework: clean

a pre-check would sit in one communicator plus one gate in `commit.sh`. no contract changes.

## .confidence: 85%, and why it is low

measured on one pnpm major. the clamp guards it, but a pnpm upgrade could flip it.

## .where

- `src/domain.roles/mechanic/skills/git.package.patch/git.package.patch.commit.sh` — the post-check
- `git.package.patch.integration.test.ts` `[case2][t3]`, `[case1][t15]` — the clamps

## .verdict

open
