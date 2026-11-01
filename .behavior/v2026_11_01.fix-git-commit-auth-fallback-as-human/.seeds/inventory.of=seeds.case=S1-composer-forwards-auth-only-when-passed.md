# S1 — composer forwards --auth only when passed

## .said
F1 confirmed, set forwards --auth only when its caller passed one.

## .settled
`git.commit.set` passes `--auth` to `git.commit.push` only when its own caller passed `--auth`. no flag on set → no flag on push → the default → the fallback may fire.

## .landed
| artifact | where |
|---|---|
| fulcrum verdict | `.fulcrums/inventory.of=fulcrums.case=F1-composer-forwards-explicit-auth-only.md` |
