# F44 — main's env-scoped meter folds into `set_meter_scope`

## .the fork

main `780dd9f` (#1022) added a third meter, `git.branch.uses`, onto the global + org readers in
`git.commit.operations.sh`. it scopes them by env: `METER_SLUG` / `METER_NOUN`, with a default of
the commit meter, pinned in each commit skill. this branch scopes the same readers by
`set_meter_scope commit|release`, with no default: an unscoped read is a malfunction
(`assure_meter_scope`). one seam, two shapes. the rebase must pick one.

- **A (taken)** — keep `set_meter_scope`; add a `branch` scope (`git.branch.uses` · `cutover` ·
  `cutovers`). `git.branch.uses.sh` dispatches the global + org handlers with `--meter branch`, as
  `git.release.uses.sh` does with `--meter release`. `git.branch.uses.operations.sh` calls
  `set_meter_scope branch`. main's per-skill `METER_SLUG` pins drop; each commit skill already scopes
  itself
- **B** — keep main's env scope; port the release meter onto `METER_SLUG=git.release.uses`. a
  default reopens the fail-open this branch closed: a release path that forgets its scope reads the
  commit meter
- **C** — keep both shapes side by side. every later repair to the readers lands in one shape only

## .taken, and why

A. it is the only shape that fails closed for all three meters, and main's branch meter enters
through three call sites, so the port is small. main's sponsor-nudge gate (`commit` meter only)
keeps its sense, keyed on `METER_KIND`.

## .rework

clean. a revert to B is a rename of one variable family plus three call sites in
`git.branch.uses/`; no caller outside the two meter skill dirs reads the scope.

## .confidence, and why it is low

85%. the `git.branch.uses` author chose the env shape deliberately ("pinned = default keeps the
commit paths byte-identical"); a no-default scope changes that file's contract, and its suite may
assert prose the port shifts.

## .where

`src/domain.roles/mechanic/skills/git.commit/git.commit.operations.sh`,
`git.commit.uses.global.sh`, `git.commit.uses.org.sh`,
`src/domain.roles/mechanic/skills/git.branch.uses/{git.branch.uses.sh,git.branch.uses.operations.sh,git.branch.uses.integration.test.ts}`

## .verdict

open.
