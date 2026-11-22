# domain term: bound

## .the term

| term | kind | shape | sense |
|---|---|---|---|
| **bound** | dobj | `BOUND_SECONDS` + `BOUND_SOURCE` (`default` \| `--timeout`) | the most wall time a git.repo.test run may take before it is cut short |

ops that compose it: `run_bounded`, `run_bounded_via_watchdog`, `is_bound_valid`, `get_bound_fuse` (`skills/git.repo.test/git.repo.test.operations.sh`). shown on every apply run as `bound: 420s (default)`.

## .the etymology

the wish names it so: a run with no explicit *time bound* stops past 5 minutes; an explicit *bound* from the caller still wins. a bound is a cap the run must stay under, not a target it aims at.

rejected:
- **timeout** — kept only as the flag name (`--timeout`, an extant contract). as a noun it names the event of a run that ran out, not the limit; "past the 420s timeout" reads as a past failure, "past the 420s bound" as a limit crossed
- **limit** — generic; names no unit or owner
- **deadline** — a point in clock time, not a span from the run's start

## .the evidence

- the wish's own words: "no explicit time bound", "an explicit bound from the caller still wins"
- the repo already says "bound" for the same idea in its other watchdog: `git.pull.watch.operations.sh` (`run_watch_bounded`, "exit 124 on the bound")

## .the attributes

- seconds — whole, positive (`is_bound_valid`), at most `GIT_REPO_TEST_BOUND_MAX` (420, `is_bound_above_max`); default `GIT_REPO_TEST_BOUND_DEFAULT` (the max). it holds for the whole call: in multi-mode each type gets what is left (`get_bound_left`)
- source — `default` or `--timeout`
- fuse — the tool that enforces it on this host: `timeout` · `gtimeout` · `watchdog` (`get_bound_fuse`). internal; never shown

## .the invariants

1. every apply run has a bound; none is unbounded
2. a run cut short at its bound is a constraint (exit 2), never a malfunction
3. the bound reaches the whole process group of the run
4. a run is cut short only by the fuse; a suite that exits 124 by itself is not

## .not to confuse

- **halt** (`halt.md`) — the cutover's stop that waits on a human settle and resumes. a run cut short at its bound does not resume; it is not a halt in that sense, so published text says "cut short", not "a halt"
- **bound, the participle of bind** — a "bound route" (`rhx route.bind`, `BOUND_ROUTE`) is a route tied to this branch. that word is an adjective of state; this term is a noun with a number (`bound: 420s`). the two never share a slot: a route is bound, a run has a bound. code keeps the noun's names qualified (`BOUND_SECONDS`, `BOUND_SOURCE`, `BOUND_OUTCOME`), never a bare `BOUND`. the overload is accepted over `timeout` (the flag's word, which reads as the event, not the cap) and `limit` (unscoped), both rejected above

## .see also

- `skill.invariants/git.repo.test.invariants.md` § a run past its bound is cut short
