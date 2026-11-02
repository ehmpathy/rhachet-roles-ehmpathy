# F19 — `set` on an unreadable clone registry

## .the fork

`set` asks the repo root's registry (`rhachet clone list`) whether this clone can be reached. when that read fails, the reach reads `unknown`.

- (a) proceed — write the watch, spawn the daemon; the daemon keeps a watch on `unknown`
- (b) refuse — a malfunction, exit 1; no watch, no daemon

## .taken, why

(b). a watch for a clone never proven reachable spawns a daemon that may alert no one. inside the daemon, `unknown` still keeps a watch: a transient fault must never drop one. the two seats differ on purpose: a first write fails loud, an extant watch survives a blip.

## .rework

clean: one guard in `set_watch_verb_context`.

## .confidence

85%. the vision names `absent` and `DEAD` as refusals; it does not name an unreadable registry.

## .where

`git.pull.watch.operations.sh` → `set_watch_verb_context`.
