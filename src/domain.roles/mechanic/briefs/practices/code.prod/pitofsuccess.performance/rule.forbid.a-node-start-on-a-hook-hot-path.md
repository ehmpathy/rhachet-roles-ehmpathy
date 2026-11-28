# rule.forbid.a-node-start-on-a-hook-hot-path

> **a hook that runs on every call, stop, or edit never starts node. the lazy cli, a bundle import, and an `rhx` hand-off to node are each a node start.**

| ⛔ forbidden | ✅ instead |
|---|---|
| `route.drive` through the lazy node cli on a Stop or SessionStart | a bash head that reads the route flag file and starts the cli only when a route is bound |
| a guard as node on every Write, Edit, or Bash | a bash hook, one path-prefix test, exit 0 on the common case |
| a node start to learn there is naught to do | a cheap test first; node only on real work |

## .the case (2026-11-26, uladkasach/nheuron)

| path | measured |
|---|---|
| `route.drive` on Stop, the lazy node cli | median 54 s wall, lost 10 of 10 at its cut (24h ledger) |
| the same cli, run direct | about 580 ms |
| a fast bash hook | about 10 ms |

a node `route.mutate.guard` read 2220 ms wall (p95 10858) at 580 ms cpu over 11 runs in 72h. cause owner: rhachet-roles-bhrain#806 (the lazy cli import).

## .enforcement

- a new hook on a per-call event that starts node = **blocker**
- a node start where a bash test would learn there is naught to do = **blocker**

## .see also

- `rule.forbid.costly-hot-paths`
- `rule.require.count-starts-with-strace` — prove the start count is 0
