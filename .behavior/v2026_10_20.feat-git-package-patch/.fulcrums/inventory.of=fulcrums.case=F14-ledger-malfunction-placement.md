# F14 — the check-permissions ledger malfunction placement is deferred

## .the fork

- **a.** move the ledger/record `💥 MalfunctionError` lines into the tree, as the inventory malfunction already renders (`├─ 💥 …`)
- **b.** leave the extant render (a bare `💥` paragraph after the `🥥 did you know?` footer) and defer the move

## .taken, and why at the time

b. the render predates this branch: `git diff 7e70b565` of the check-permissions snapshot holds no
`MalfunctionError` line, so this diff neither added nor moved it. the move touches the hook's shared
render path for six snapshot cases and the softnudge block — a change to the check-permissions
contract that this nano-scope wish (the `git.package.patch` verb) did not open.

## .rework

dirty: the render is shared by every ledger, record, and inventory failure path in the hook, and
six snapshots pin it.

## .confidence — 80%, and why not higher

the call that it is out of scope is solid; the 20% is whether the reviewer's consistency point
should ride along as scouts-honor. it fails the CLEAN test (it ripples into the hook's render
contract), so it is a dream, not a ride-along.

## .where

`src/domain.roles/mechanic/inits/claude.hooks/pretooluse.check-permissions.sh` (the ledger/record
malfunction emit); snapshots `[case40][t11]`, `[case45][t0]`, `[case49][t0]/[t1]/[t4]`, `[case50][t0]`.

dream: `.dream/v2026_11_11.chore.check-permissions-malfunction-in-tree.md`

## .verdict

open.
