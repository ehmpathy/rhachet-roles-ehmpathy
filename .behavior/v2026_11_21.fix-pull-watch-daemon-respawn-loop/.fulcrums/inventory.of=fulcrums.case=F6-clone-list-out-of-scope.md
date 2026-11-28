# F6 · the per-tick clone list read stays out of scope

- fork: (a) leave `rhachet clone list` at one read per repo root per tick · (b) gate it too, e.g. once per N ticks
- taken: (a). the wish names the token and the dead watch. the per-tick probe is a prior decision (the feat-pr-watch-daemon fulcrum F5): a dead clone on a quiet pr must be found with no event. a change there wants its own read of births
- rework: clean
- confidence: 80%. why low: by a code read it births one node process per root per tick, as large as the token read
- where: `del_watch_records_of_dead_clones` in `git.pull.watch.daemon.sh`
- verdict: open; caught as a dream
