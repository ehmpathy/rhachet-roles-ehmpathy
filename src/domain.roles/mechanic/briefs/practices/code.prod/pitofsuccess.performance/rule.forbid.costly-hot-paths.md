# rule.forbid.costly-hot-paths

> **a hot path (a hook, a guard, a check, aught that runs on every call, edit, or stop) pays its cost times every seat times every call. count its process starts and its reads, and cut both to the floor.**

## .the antipatterns

| ⛔ forbidden | ✅ instead |
|---|---|
| a process per check (`jq`, `sed`, `grep`, `node` forked for each rule) | one process per event; every rule in-process (bash builtins, parameter expansion) |
| the same file parsed on every call (settings, allowlists, term lists) | parse once; cache keyed on the source's mtime and size, read through symlinks |
| a heavy start (node, a cli) just to learn there is naught to do | a cheap test first (a file exists, a dir is empty); start the heavy tool only on real work |
| a whole read where the tail answers (a transcript, a log, the repo) | read from the end, only as far as the question asks |
| several hooks on one event that each read the same payload | merge them into one hook that reads stdin once |
| a fast head that guesses on an input it cannot prove | fail closed: any doubt falls through to the full check in the same hook, so the fast head is a pure speedup |
| a hot path shipped with no measure | measure before and after on the same box; keep cpu as the bound and wall as a timeout (box load inflates wall) |

## .the proof a fast head owes

1. a parity corpus: the same exit code, stdout, and stderr as the full check, on inputs the full check refuses and passes (`rule.require.parity-corpus-before-a-hook-swap`)
2. red, then green: a loosened rule must fail the suite
3. a cost line: p95 wall and cpu per call, before vs after, in the test output

## .the case (2026-11-26, uladkasach/nheuron, mechanic mod)

- check-permissions: unloaded p95 48 ms wall, 42 ms cpu → 16 ms, 11 ms. no fork on the allow path; the allowlist cached by mtime; the payload parsed in-process; any unproven token falls through to the full check
- forbid-on-write: three hooks per edit (gerunds, blocklist, tmp-writes) → one. median 96 ms, 92 ms cpu → 8.4 ms, 7 ms cpu. term lists cached by mtime; doubt falls through to the three full checks in order
- on the loaded box the stock check read 5512 ms wall at 710 ms cpu: wall was mostly the wait for a cpu, which each forked process pays again. fewer processes cure both

## .enforcement

- a new hook, guard, or per-call check that forks per rule, or parses an unchanged file per call = **blocker**
- a fast head that guesses where it cannot prove, with no fall-through to the full check = **blocker**
- a hot path change with no before/after measure = **nitpick**

## .see also

- `rule.forbid.a-node-start-on-a-hook-hot-path` — the costliest start of all
- `rule.require.count-starts-with-strace` — how to count starts, forks, and reads
- `rule.require.parity-corpus-before-a-hook-swap` — the proof a rewrite owes
- `rule.require.price-the-measure-point` — a measure on every call is a hot path too
