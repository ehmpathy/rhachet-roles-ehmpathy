# F23 — the meter readers stay in `git.commit/`; the lift to a shared seam is deferred

## .the fork

peer review i001 (arch-opport-decomposition blocker.1; arch-smell-scopeleaks blocker.1, blocker.2)
names a reach-in: `git.stage`, `git.branch.rebase`, and `git.release` source
`git.commit/git.commit.operations.sh`, and `git.release.uses` execs the commit family's
`--global` / `--org` handlers with `--meter release`.

- **A (taken)** — keep the readers where they live; dispute the reach-in; catch a dream for the lift
- **B** — lift the meter readers, renders, and the global/org handlers into a shared
  `skills/git.meter/` seam that all four families source

## .taken, and why

A, for three reasons.

1. **the dependency predates the stone.** on `origin/main`, `git.stage.add.sh` and
   `git.branch.rebase.begin.sh` already source `git.commit/output.sh`, and each re-declares the
   commit meter path and reads its JSON by hand. the stone did not open this edge; it routed the
   edge through the one hardened reader.
2. **the hand-read copies were the defect.** a private copy of the reader is how a gate and its
   own display disagree about one file — the fail-open class this family has closed one reader at
   a time. stage and rebase ride the commit grant by vision design (F9, F12); one reader is the
   contract they must share.
3. **the lift is not clean.** `git.commit.operations.sh` holds the meter readers interleaved with
   the sponsor and identity operations (some forty functions). a lift moves both handlers, every
   source line in four families, and the paths the suites spawn. that ripple belongs to its own
   change, not to a stone whose subject is the meter split.

the release meter's global and org levels exec the commit handlers on purpose: one handler per
level, scoped by `set_meter_scope`, so the two meters cannot drift apart at those levels.

## .rework

dirty: four skill families, their source lines, and the suites that spawn the handlers by path.

## .confidence — 75%

the reviewers name a real seam. the call is only whether this stone pays for it.

## .where

dream: `.dream/2026_10_21.lift-meter-readers-into-git-meter.dream.md` (linked from `dreams/`)

## .verdict

open.
