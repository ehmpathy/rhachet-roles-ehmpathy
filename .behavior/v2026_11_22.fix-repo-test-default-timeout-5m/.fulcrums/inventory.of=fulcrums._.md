# fulcrum inventory

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | halt exits 2 (constraint), not 1 | clean | best-guess, awaits vision review | 85% |
| F2 | one halt render for default and explicit bounds | clean | best-guess, awaits vision review | 90% |
| F3 | multi-mode bound is per type, not total | clean | RULED by the wisher: one 420s bound for the whole call (seed S1); reworked | 100% |
| F4 | `--timeout` must be a positive integer, checked at parse | clean | best-guess, awaits vision review | 92% |
| F5 | no opt-out value (`--timeout none`) | clean | best-guess, awaits vision review | 80% |
| F6 | host without gnu `timeout`: fall back, never fail | clean | best-guess, awaits vision review | 75% |
| F7 | the `.husky/*` concerns are out of this wish's scope | clean | disputed at execution review | 90% |
| F8 | "Read the log" keeps its capital R (names the tool) | clean | disputed at execution review | 85% |
| F9 | `run_bounded` keeps a bash command wrapper's shape | clean | disputed at execution review | 85% |
| F10 | the caller-clock line stays in the published howto | clean | disputed at execution review (two lanes opposed) | 80% |
| F11 | no PreToolUse hook to enforce the caller's shell limit | clean | settled by the driver (delegated, seed S1): no hook; the 420s max sits inside the 600s shell cap and the skill prints the figure | 85% |
| F12 | the bound ops stay in the skill until a second caller adopts them | clean | disputed at execution review | 85% |
| F13 | no blackbox acceptance suite for git.repo.test in this wish | clean | disputed at execution review | 85% |
| F14 | each fuse backend reads its own cut; no shared outcome transformer | clean | disputed at execution review | 80% |
| F15 | the abort trap stays in the skill, not an `arm_bound_abort` | clean | disputed at execution review | 80% |
| F16 | the caller's-clock figure is bound + a fixed slack | clean | disputed at execution review | 80% |
| F17 | the line-start anchor on the no-tests check stays in this change | clean | disputed at execution review | 85% |
| F18 | the two failures the ambient rhachet bump causes stay out of this wish | dirty | open, awaits CI | 85% |
| F19 | the pre-extant CI skip on play [case19] stays this round | clean | open | 75% |
| F20 | the bound suite fails loud on a host with no gnu timeout or setsid, never skips | clean | disputed at verification review | 85% |
| F21 | the [case12][t0] abort snapshot's log paths agree; no repair owed | clean | disputed at verification review | 95% |

entries: `inventory.of=fulcrums.case=F1-halt-exit-code.md` … `case=F21-abort-snap-log-paths-agree.md`.
