# F21 — the shared atomic meter writer is deferred

## .the fork

the split adds three temp-then-`mv` writes (`git.commit.uses.local`, `git.release.uses.local`,
the release gate's spend). four more already exist (sponsor, org, global, `git.commit.set`).

- **A (taken)** — copy the extant shape in the new writers; catch a dream for one shared helper
- **B** — extract `set_json_file_atomic` now and swap all seven sites

## .taken, and why

A. B is safe but not clean: it rewrites four writers this stone never needed to touch, and
opens their suites. the new writers match the extant convention exactly, so a later swap is
mechanical. the dream records the one real gap the swap would close — six of seven writers lack
the sponsor writer's guard against a state path that is a directory.

## .rework

dirty only in reach (seven sites, several suites), not in difficulty.

## .confidence — 80%

the convention is consistent and the dream carries the shape of the fix.

## .where

dream: `.dream/2026_10_21.meter-atomic-write-helper.dream.md` (linked from `dreams/`)

## .verdict

open.
