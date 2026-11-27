# F3 · a watch with no good read starts its idle clock at its first failed read

- fork: (a) idle clock from the first failed read when no good read landed, same 1w ttl · (b) a shorter bound for a dark watch (e.g. 24h of faults ends it)
- taken: (a). it reuses the extant ttl and note, so one end path serves quiet and dark prs alike. the doubled poll gap bounds the cost in the meantime. one pr may hold several watchers: a `set` already clears the pr's idle clock for all of them (`del_watch_pr_cadence`), so the clock restarts at the next failed read, and a fresh watch is never ended by an older watcher's age. the first failed read sits one tick after `setAt`, so this reads as "from the latest setAt" with no iso date parse in bash
- rework: clean. one constant, or a second ttl
- confidence: 80%. why low: "stuck" in the wish is not defined; a week may read as too slow to the director
- where: `set_watch_pr_cadence_faulted` in `git.pull.watch.operations.sh`; the rc 1 branch of `run_watch_tick`
- verdict: open; **[wisher]** in the vision's open questions
