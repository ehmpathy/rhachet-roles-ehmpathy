# F28 — a clone's own comments: a local ledger, or a `clone=` attr in the public marker

## .the fork

the daemon must not echo a clone's own comment back to it (F8). today `git.pull.comment set` notes each id it posts in a per-clone ledger on the box. r011 nitpick.6 (5.1 i004) proposes a `clone=<serial>` attr in the `<!-- rhx:git.pull.comment key=… -->` marker instead, which deletes the ledger and its faults.

- (a) keep the local ledger
- (b) move authorship into the public marker

## .taken, why

(a).

- (b) writes the clone serial into public pr text on every comment, forever. a serial names one session on one box; it has no reader on github, and once posted it cannot be withdrawn
- (b) changes the marker grammar of `git.pull.comment`, a skill with its own users; that is a contract change outside this route
- the reviewer names the same condition: take (b) only if the serial exposure is acceptable. it is not chosen here

## .rework

clean: the ledger reader and writer sit in one file; a marker attr would replace both.

## .confidence

85%. the exposure is small, but it is permanent and buys only a simpler local read.

## .where

`git.pull.watch.operations.sh` (`set_watch_ledger_id`, `get_watch_ledger_json`) · `git.pull.comment.set.sh`. raised as r011 nitpick.6 (5.1 i004).
