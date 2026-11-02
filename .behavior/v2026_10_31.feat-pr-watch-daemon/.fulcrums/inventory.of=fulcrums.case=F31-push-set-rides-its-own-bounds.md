# F31 — the push's watch set: a cap of its own, or the set's own bounds

## .the fork

`git.commit.push` calls `git.pull.watch.set --mode apply` after the push lands. r007 nitpick.4 (5.1 i005) asks for a cap on that call, so a slow findsert cannot hold the push.

- (a) wrap the call in its own bound; a bound hit prints a `watch: … rerun:` line
- (b) rely on the set's own bounds

## .taken, why

(b).

- every wait inside the set is already bound: the key lock waits 10s by the clock, the daemon boot waits 20s, and each holds no unbounded external call. the worst case is ~30s, then the set exits with its cause
- a refusal or a malfunction of the set already degrades to a `watch:` line beside a push that succeeded (case18b/18c)
- a second, outer cap would cut a set mid-findsert: the record lands, the daemon may spawn, and the line says neither. the set's own bounds say which wait ran out

## .rework

clean: one `run_watch_bounded` around one call in `git.commit.push.sh`, plus its line.

## .confidence

85%. ~30s at worst on a contended box is slow, but bounded and named.

## .where

`git.commit.push.sh` (`get_push_watch_status`). raised as r007 nitpick.4 (5.1 i005).
