# F32 — the bhrain patch is clamped at the installed dist, not by a live route journey

## .the fork

`patches/rhachet-roles-bhrain@0.42.1.patch` fixes the `route.stone.set --as promised` emit. 5.3
r4 (ergo-acceptance-journey-coverage, infra blocker.1) asks for an acceptance test that runs the
live command and snaps its stdout.

- **A (taken)** — an integration clamp loads the installed, patched
  `node_modules/rhachet-roles-bhrain/dist/…/formatRouteStoneEmit.js` and snaps its emit for both
  cases (next review owed · none left)
- **B** — an acceptance test that builds a route fixture, a guard with self reviews, and drives
  `rhx route.stone.set --as promised` through rhachet

## .taken, and why

A. the surface is a foreign package's cli; this repo ships no contract for it. the clamp's one job
is to go red when the patch drops (an upgrade, a lost `pnpm.patchedDependencies` entry), and it
reads the very file the patch rewrites. B would pin bhrain's own route engine — guard parse, ask
mint, passage log — inside this repo, so every bhrain upgrade would redden a suite here for changes
this repo does not own. the live journey belongs upstream, where the fix is owed.

## .rework

clean — one acceptance file, if the council asks for it.

## .confidence

75% — the reviewer's rule reads "every contract in the diff"; a patch file is in the diff.

## .where

`src/infra/patches/rhachet-roles-bhrain.patch.integration.test.ts`

## .verdict

open — for the fulcrum council.
