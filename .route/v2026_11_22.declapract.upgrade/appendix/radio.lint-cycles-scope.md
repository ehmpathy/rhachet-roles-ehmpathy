## .what
the lint practice gates `test:lint:cycles` on cycles inside `node_modules`: `.dpdmrc.yaml` declares `exclude: []`, the command passes `--exclude "$EXCL"` (empty, which overrides dpdm's own `node_modules` default), and the `.dpdmrc.yaml` check rejects any `node_modules` entry. a consumer goes red on code it does not own and cannot close.

## .evidence (rhachet-roles-ehmpathy, upgrade to 0.50.0)
- the upgrade added the check; `test:lint` before it ran only biome + depcheck. no dependency changed: the cyclic pins `helpful-errors@1.5.3`, `domain-objects@0.31.9`, `bottleneck@2.19.5` all sit in the pre-upgrade lockfile
- 19 cycles reported, all in `node_modules`, none in `src/`. two rows lived in a host-only pnpm global store, so the red differs per host
- every carrier's latest release still pins the cyclic version (wrapper-fns 1.1.7, as-procedure 1.1.13, simple-in-memory-cache 0.5.1, rhachet-artifact 1.0.4); bottleneck 2.19.5 is its last release. no consumer holds a lever
- the owners already catch their own: helpful-errors 1.7.x and domain-objects 0.31.10+ are cycle-free, because each package gates its own `src`

## .the shape of the fix
1. gate on owned code: `--exclude "node_modules${EXCL:+|$EXCL}"` in `test:lint:cycles`; `.dpdmrc.yaml` keeps cited extra entries only, and its check stops a reject of the scope the command now owns
2. keep the dependency walk as an advisory: a separate `test:lint:cycles:deps` that prints and exits 0, so a stale cyclic pin is seen and dispatched to its carrier, never a red the consumer cannot close
3. revise `rule.forbid.dpdm-exclude-change` (ehmpathy/rhachet-roles-ehmpathy, mechanic brief) and the `.dpdmrc.yaml` header to match: the gate sits at the owner; the walk informs the consumer
4. clamp: a fixture repo with a cycle in its own `src` stays red; one whose only cycle sits in `node_modules` goes green, and the advisory names it

## .prior decisions this revisits
- #547 and #581 (closed) settled `exclude: []` and refused a `node_modules` entry, per `rule.forbid.dpdm-exclude-change`. this task keeps that aim (no shipped cycle goes unseen) and moves its enforcement point: the owner gates its own `src`; each consumer keeps the full walk as an advisory, so a stale cyclic pin is still seen and dispatched
- #775 (open: lift ehmpathy floors past transitives that carry a cycle) and #778 (open: as-command past the bottleneck cycle) are the cure at the carriers; per-carrier issues filed today: wrapper-fns#22, as-command#14, as-procedure#26, simple-in-memory-cache#24, simple-on-disk-cache#51, rhachet-artifact#11

## .adopted early
rhachet-roles-ehmpathy carries shape (1) locally, verified: lint green, and a planted two-file cycle in `src/` turns it red.
