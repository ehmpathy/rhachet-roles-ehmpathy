# F3 · prod-dep-cycles

## .the fork
`test:lint:cycles`, new with this upgrade, went red on three cycles inside `node_modules` that ship through prod deps (`helpful-errors@1.5.3`, `domain-objects@0.31.9`, `bottleneck@2.19.5`). where does the defect sit?

- **in this repo's code**: rewrite the carriers here (A), or wait on their upstream releases (B)
- **in the dependency tree**: exclude the cyclic packages (C), which `rule.forbid.dpdm-exclude-change` forbids
- **in the check's scope**: the practice gates a consumer on code it does not own

## .taken, why
**the check's scope.** evidence:
- the packages did not change: all three cyclic pins sit in HEAD's lockfile
- the check did: HEAD's `test:lint` was biome + depcheck; 0.50.0 adds a dpdm walk with `exclude: []`, which overrides dpdm's own `node_modules` default, and a `.dpdmrc.yaml` check that rejects any `node_modules` entry
- the red has no consumer lever: every carrier's latest release still pins the cyclic version; bottleneck 2.19.5 is its last release. the owners already gate their own `src` (helpful-errors 1.7.x, domain-objects 0.31.10+ are cycle-free), so the walk re-checks, at every consumer, what each owner checks once
- the red drifts per host: two rows came from a host-only pnpm global store

so a cycle gate belongs at the code's owner. this repo gates its own `src`: `test:lint:cycles` passes `--exclude "node_modules${EXCL:+|$EXCL}"`, and `.dpdmrc.yaml` returns to the declared `exclude: []`. a planted two-file cycle in `src/` turns lint red, and its removal turns it green.

the cure for the practice is upstream: radio task ehmpathy/declapract-typescript-ehmpathy#832 (gate on owned code; keep the dependency walk as an advisory that exits 0; revise `rule.forbid.dpdm-exclude-change` to match). the stale pins stay worth a bump, as advisory work: dream `v2026_11_22.reseed.prod-dep-cycles-upstream-bumps.md`.

## .rework
clean: one flag in `test:lint:cycles`. the next apply of the unfixed practice restores the walk, so #832 must land before the next upgrade here.

## .confidence
85%. the doubt: `rule.forbid.dpdm-exclude-change` (shipped by this repo's mechanic role) still states the walk as policy until #832 revises it, so the brief and this repo's command disagree in the interim.

## .where
`package.json` `test:lint:cycles` · `.dpdmrc.yaml`

## .verdict
settled by driver: the defect is the practice's check scope; the cure is #832
