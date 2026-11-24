# F5 · "a crew holds the head" reads as "the crew holds a watch"

## .the fork
- (a) the crew that holds a pr watch gets the task; `git.commit.push` sets that watch on each push
- (b) the daemon maps a pr head branch to the live clone whose worktree has it checked out, watch or not

- (c) as (a), and when a watch's clone reads `DEAD`, hand the watch to the one `LIVE` clone the clone list names at that same repo root, cursors kept; zero or several live → drop, as today

## .taken
(a). every crew pr is opened by `git.commit.push`, which sets the watch (`git.commit.push.sh:772`). (b) needs a branch→clone map the daemon does not have; `rhachet clone list --output json` names serial, slug, reachState, spawnedAt — no branch.

(c) is the cheap cure for the serial gap, since the daemon already reads one clone list per repo root each tick (`del_watch_records_of_dead_clones_at_root`, `git.pull.watch.daemon.sh:330`). it waits on two reads: whether `clone list` run at a root names only that worktree's clones (its `--help` does not say), and whether serials churn often (Q4).

if the wisher reads "holds the head" as "has the branch in its worktree", inventory row W2 (no watch) turns from alterpath to critipath, and (c) becomes owed in this work.

## .rework
clean. (b) or (c) adds a delivery target; the reply task's text and rule stay.

## .confidence
70%. a crew whose session restarts gets a new serial; its old watch drops as `DEAD` and the new clone hears naught until it pushes. how often a serial churns under a live crew is unmeasured (Q4).

## .where
`1.vision.yield.md` § assumptions · `case=_` row D7

## .verdict
open — research Q4 decides whether (b) earns its own wish.
