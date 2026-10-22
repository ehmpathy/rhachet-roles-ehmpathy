# F26 — a release stamp counts applies; it does not pin a sha, nor gate `--retry`

## .the fork

peer review i004 (arch-defects 1, 2) names two acts that ship with no fresh stamp:

- `--retry` reruns a failed workflow, a tag-run publish among them, with no release use
- an armed automerge outlives the stamp: a later `git.commit.push` adds commits to a pr already
  armed to ship

- **A (taken)** — the stamp is a count of `git.release --mode apply` runs (F4, F19). `--retry`
  stays meter-free (vision Q3). a sha-pinned stamp is a dream
- **B** — gate `--retry` on a tag transport, and make `git.commit.push` refuse a pr with automerge
  armed (or pin the merge to the stamped head)

## .taken, and why

A.

- `--retry` is meter-free on main today, before the split; the vision keeps plan, `--watch`, and
  `--retry` meter-free (Q3). a tag-run rerun reruns a publish of a commit main already holds, and
  main got it only through an apply that spent a stamp
- `gh pr merge --auto --match-head-commit` checks the head when automerge is armed, not when it
  merges, so it does not pin the stamp to a sha
- a push-time check needs `gh` before the transport. the vision keeps the push un-gated by
  keyrack and gh, so an outage never strands a commit (`git.commit.push.sh` apply note)
- the window is the watch of one apply, on the tree that spent the stamp, by the crew that ran it

## .rework

dirty: a sha-pinned stamp is a new contract. the stamp file gains a head, the gate writes it, and
push reads gh before transport.

## .confidence — 65%

the counted-apply contract is the vision's. whether a commander wants the stamp to attest a sha is
a call the vision never made.

## .where

- `git.release.sh` (the gate runs on `MODE == apply` only)
- `git.release.operations.sh` `enable_automerge`
- dream: `.dream/2026_10_21.release-stamp-pins-the-head-it-ships.dream.md`

## .verdict

open.
