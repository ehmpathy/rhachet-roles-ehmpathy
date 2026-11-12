# F39 — the repo-local init.claude.permissionrequest skill is proven by integration alone

## .the fork

5.3 i002 r4 (acceptance-journey) permissions nitpick.2: the new
`.agent/repo=.this/role=any/skills/init.claude.permissionrequest.sh` has an integration test and
no acceptance test.

- **A (taken)** — integration only
- **B** — add a `blackbox/` acceptance test

## .taken, and why

A. the skill lives under `repo=.this`: it ships in no package and has no built artifact, so there
is no contract surface an acceptance test could reach that the integration test does not. the
integration test already runs the real executable as a subprocess, in a real temp repo, and snaps
its output (`src/.test/init.claude.permissionrequest.integration.test.ts`, 5 cases).

## .rework

clean — one blackbox file that repeats the integration cases.

## .confidence

80%.

## .where

`src/.test/init.claude.permissionrequest.integration.test.ts`.

## .verdict

open — for the fulcrum council.
