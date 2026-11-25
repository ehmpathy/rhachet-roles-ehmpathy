# F6: the git.pull.watch paginated-read flake is deferred, not fixed here

- **fork**: under a full local integration run, `git.pull.watch.events [case2c]` and `git.pull.watch.faults [case10]` fail on `jq: parse error: Unfinished string at EOF at line 1, column 8192` — a paginated `gh` read cut at 8 KiB. each suite alone passes (72/72, 32/32); ci passes both. 5.3 says fix a flake you meet. fix it in this pr, or catch it
- **taken**: catch it. the cause sits in the pr-watch daemon's read path or its fake `gh` — another skill. a change to a daemon read loop is not safe to ride a help-text pr: it changes runtime behavior outside what a reviewer of this pr reads, and the race needs a load clamp to prove, which this route has not built
- **rework**: dirty for this pr (another skill's runtime, a new load clamp), clean as its own pr
- **confidence**: 80% — the 8192-byte cut points at a buffer read before the writer flushed; the 20% is that the fault lives in the fake `gh` alone, a test-only fix that might have been small
- **where**: 5.3 full integration run; self review `has-fixed-all-gaps`
- **follow-up**: `dreams/2026_11_24.fix-git-pull-watch-paginate-read-truncates-at-8kib-under-load.dream.md`
- **verdict**: settled by the driver (S2 handed it over): stands as taken. the flake fix rides its dream as its own pr
