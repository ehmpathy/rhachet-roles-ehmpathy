# F32 — the DEAD verdict of `clone say`: a strict json parse, or a pattern over its output

## .the fork

`send_watch_alert` drops a watch when `clone say` answers `reachState: DEAD`. r011 nitpick.8 (5.1 i005) asks for a `jq -r '.reachState'` parse of the stdout record in place of a regex over stdout and stderr.

- (a) parse one json record with jq
- (b) match `"reachState": "DEAD"` across both streams

## .taken, why

(b).

- the failure record rides stderr, not stdout, and rhachet prints it pretty, over many lines
- stderr also carries plain lines beside the record; this round's own review log shows one (`ℹ another rhx process holds …`). a strict parse of the stream fails on such a line, and a parse that fails must not drop a watch, so (a) would read DEAD as a hold and keep a dead watch forever
- the alert text is piped in and never echoed back, so the pattern cannot match the clone's own words
- the drop is the one irreversible verdict, so it reads the field by its exact key and value, no looser

## .rework

clean: one function in `git.pull.watch.alert.sh`.

## .confidence

82%. a future rhachet that emits one compact json line per stream would make (a) safe; the rhachet.real suite pins the record shape today.

## .where

`git.pull.watch.alert.sh` (`send_watch_alert`). raised as r011 nitpick.8 (5.1 i005).
