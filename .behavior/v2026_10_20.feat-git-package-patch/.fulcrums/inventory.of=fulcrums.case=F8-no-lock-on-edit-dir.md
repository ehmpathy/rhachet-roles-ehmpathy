# F8 — no lock on the edit dir

## .the fork

a reviewer (arch-hazards-behavior, i001 nitpick.1) asked for a lock around begin and commit, since
both read and then write the shared edit dir.

- **A** — a lock file per edit dir
- **B** — no lock; rely on the idempotent shape of each phase

## .taken: B, and why at the time

the edit dir sits inside one crew's own tree. the vision weighed concurrent calls (c19) and judged
them benign: begin reuses an open dir and never re-runs pnpm over it; a second seal finds no open dir
and names `begin`. no interleave writes a patch under a version no one asked for. a lock adds a
stale-lock failure mode — a crashed call that leaves the tree blocked — to guard a race that settles
on its own (`rule.require.fewer-paths-via-idempotency`).

## .rework: clean

a lock is one communicator pair plus a trap; no contract changes.

## .confidence: 80%, and why it is low

the benign verdict rests on reason about interleaves, not a concurrency test.

## .where

- `1.vision.experience.case=_.md` — c19
- `git.package.patch.begin.sh`, `git.package.patch.commit.sh`

## .verdict

open
