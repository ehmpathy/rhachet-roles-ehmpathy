# F37 — `get` keeps `home:` for the daemon's copy dir

## .the fork

5.3 peer lane r6 (ergo-snapshot-visual-blemishes) reads `home: …/v=<key>/bin` beside a hint that
cats `…/v=<key>/daemon.log`, and asks for a label that matches the dir, or a `home` that holds
the log.

- (a) keep `home:`: the tree renders the json `home` field of `get --output json`, which a
  composer reads; the dir is the daemon's per-key copy it runs from (F10)
- (b) relabel the tree line alone (`bin:`): the tree then drifts from the json it renders
- (c) rename or repoint the json key: a contract change, pinned by lifecycle case4

## .taken, why

(a). one json feeds both outputs, so the tree never drifts from the contract. the log hint prints
its own full path, so no reader derives the log from `home:`.

## .rework

clean: rename the key in both outputs together, with a json contract bump, if a composer asks.

## .confidence

80%: a reader may still pause at `home` that holds `bin/`.

## .where

`src/domain.roles/mechanic/skills/git.pull.watch/git.pull.watch.get.sh` `get_watch_key_json`,
`print_watch_daemons_tree`.
