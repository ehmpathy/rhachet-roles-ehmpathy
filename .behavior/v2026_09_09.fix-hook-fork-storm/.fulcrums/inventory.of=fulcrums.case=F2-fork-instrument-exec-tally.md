# F2 — the fork count is clamped by a PATH-shim exec tally

**rework** clean · **status** open · **confidence** 88%

## .the fork, stated fairly

| option | what it counts | why rejected / taken |
|---|---|---|
| **PATH shim that tallies then `exec`s** | external command execs | ✅ **taken** — deterministic, portable, behavior-neutral, precedented here |
| `strace -f -c -e trace=clone,fork,vfork` | every fork, exactly | rejected — `strace` is not guaranteed on a ci runner, and a skip is a failhide |
| `/proc/stat` `processes` delta | every fork on the **box** | rejected — a grove of ~17 clones makes it noise; flaky by construction |
| wall-clock timer | elapsed, not forks | rejected — flakes hardest under exactly the load the wish targets |
| static grep of the hook source | `jq`/`grep` call sites | rejected — counts call **sites**, never call **counts**; a loop reads as one |

## .taken, and why at the time

the clamp must be **deterministic in ci**, or acceptance #6 buys a flaky test rather than a guard.
only the shim counts discrete events with no dependence on load, privilege, or an extra binary.

it is also precedented twice in this repo: `pretooluse.forbid-tmp-writes.integration.test.ts:24-35`
already spawns a hook from jest, and `howto.mock-cli-via-path` already documents PATH injection.

⚠️ **the shim here is a tally, not a mock.** `howto.mock-cli-via-path` opens with "use as last
resort only" because a mock changes behavior. this shim `exec`s the real binary by absolute path,
so the hook's verdict cannot shift — and `[t3]` of `case=6` pins exactly that.

## .rework, and why clean

it is a test-only instrument. swap it for `strace` (or add `strace` beside it) and no production
line changes. no code hardens against it.

## .confidence, and why it is 88%

high on portability and determinism; the 12% sits on **coverage**, not correctness. see F4 — the
shim misses bare subshell forks, so the number it reports is a floor.

## .where

- a new `pretooluse.forbid-terms.*.integration.test.ts` (the file these hooks lack today)

## .the verdict

*(unruled — awaits the council)*
