# F33 — a key move writes the new record before it deletes the old

## .the fork

`set` moves a watch to a new key in two steps that no lock spans: write the record under the new
key, then delete the record under each prior key. a fault between the two leaves the watch under
both keys; a fault in the other order leaves it under none.

- (a) write new, then delete old: the fault state is a twin watch, so the clone hears an alert
  twice until a rerun; `set` exits 1 and names it ("the watch is under both keys") with the rerun
- (b) delete old, then write new: the fault state is no watch at all, and the clone idles while it
  believes its pr is watched
- (c) one canonical record across keys, de-duped by `repo#pr+cloneSerial`: closes both windows,
  and needs a layout every key reads

## .taken, why

(a). a twin alert is loud and costs a second read; a lost watch is silent and costs a missed ci
failure, the very signal the wish exists to deliver. the fault is surfaced with its fix, and a
rerun converges (`set` is idempotent).

## .rework

clean: (c) folds into the record layout decision held for the first release (F27, the
alerts-inside-the-record dream); the order swap alone is a two-line change.

## .confidence

90%: the window needs a lock timeout or a kill between two adjacent writes.

## .where

`git.pull.watch.set.sh`, the `moved` arm. raised as r007 nitpick.2 (5.1 i006).
