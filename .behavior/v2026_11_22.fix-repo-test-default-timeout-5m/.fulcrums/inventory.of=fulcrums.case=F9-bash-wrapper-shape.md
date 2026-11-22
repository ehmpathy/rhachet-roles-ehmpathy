# F9: `run_bounded` keeps the shape of a bash command wrapper

three review points ask the bash ops to look like typescript procedures. each is weighed here.

## positional bound (`run_bounded <seconds> <cmd...>`)

- fork: a named bound (`bound=300 run_bounded …`), or the positional lead
- taken: positional. the op is a command wrapper; its peers on the same call line take theirs the same way (`timeout 300s …`, `nice -n 5 …`, `env K=V …`), and the extant repo watchdog does too (`run_watch_bounded <seconds> <cmd…>`, `git.pull.watch.operations.sh:308`). a `key=value` lead would be the one argv in that line that reads differently. the header's usage line names it
- rework: clean

## result globals (`BOUND_FIRED`, `BOUND_BROKEN`)

- fork: return the fire as a distinct exit code, or as a global the caller reads
- taken: the global. every exit code is the command's own to keep (a suite may exit 124 or 1 by itself; that is what `[case8]` guards), so no code is free to mean "cut" without a collision. bash has no second return channel short of a variable or a file; the skill already reads results this way (`KEYRACK_STATUS`, `JEST_SUITES`). both are declared at the file top, reset at each call, and named in the op's `.note`
- rework: clean

## the `set -m` toggle

- fork: wrap the toggle in a subshell or a trap, or toggle around the one launch
- taken: the toggle around the one launch. a subshell cannot work: the job would be the subshell's child, so `wait "$pid"` in the caller would fail and the exit code would be lost. between `set -m` and `set +m` sits only `"$@" &` and `pid=$!`; a background launch cannot fail under `set -e`, so the window cannot leak. noted in the code
- rework: clean

- confidence: 85%
- where: `git.repo.test.operations.sh` (`run_bounded`, `run_bounded_via_watchdog`)
- verdict: open
