# F34 — the global level reads `not blocked`, the org level reads `allowed`

## .the fork

`git.release.uses get` renders `org: allowed` beside `global: not blocked`. 5.3 r4
(ergo-acceptance-journey-coverage, release nitpick.2) asks for one shape for both.

- **A (taken)** — keep the two words: each names its level's own rest state
- **B** — `global: allowed`
- **C** — `org: not blocked`

## .taken, and why

A. the two levels are different kinds. the global level is a kill switch: absent = open, so its
rest state is "not blocked" — no one allowed it. the org level is a grant: absent = blocked, so
its open state is "allowed" — a human granted it. B says a human allowed what no one touched; C
hides that the org grant was given. and `git.commit.uses get` renders its global level with the
same `not blocked` / `blocked` pair, so B or C would split the two meters' vocabulary.

## .rework

clean — one label in a shared renderer, and its snapshots.

## .confidence

80% — a reader may still scan the pair as a mismatch.

## .where

`src/domain.roles/mechanic/skills/git.release/__snapshots__/git.release.uses.integration.test.ts.snap`

## .verdict

open — for the fulcrum council.
