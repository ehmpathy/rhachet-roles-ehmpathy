# inventory.of=fulcrums

| case | title | rework | status | confidence |
|------|-------|--------|--------|------------|
| F1 | name stays `git.package.patch`, not `set.package.patch` | clean | approved | 80% |
| F2 | nano scope: `begin` + `commit` only; get/check/del/onStop deferred | clean | approved | 85% |
| F3 | two subcommands, not one `--diff @stdin` call | clean | approved | 85% |
| F4 | note as a peer file `patches/<name>@<version>.patch.note.md` | clean | approved | 75% |
| F5 | `--why` + `--upstream` required on `commit` only | clean | approved | 80% |
| F6 | ship the verb alone; leave the rhachet 1.50 bump + actor migration out of the PR | clean | open | 75% |
