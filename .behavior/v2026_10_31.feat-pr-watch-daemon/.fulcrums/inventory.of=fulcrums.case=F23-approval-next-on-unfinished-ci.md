# F23 — an approval's `next` when its ci has not finished

## .the fork

the vision (case=3) names two branches: ci passed → `rhx git.release --mode apply`; ci failed → `rhx show.gh.test.errors`. it names no branch for checks still in progress, or a head with no checks.

- (a) `rhx git.release --watch` — watch the checks land, no automerge
- (b) `rhx git.release --mode apply` — enable automerge now; it merges once checks pass
- (c) no `next` line

## .taken, why

(a). a clone that enables automerge before ci has spoken commits to a merge it has not seen pass; `--watch` lets it see the verdict first. the alert prints `ci: in progress` or `ci: no checks`, so the clone knows why.

## .rework

clean: one line in `as_watch_event_next`.

## .confidence

85%. (b) is defensible too: automerge waits on required checks by itself.

## .where

`git.pull.watch.alert.sh` → `as_watch_event_next`.
