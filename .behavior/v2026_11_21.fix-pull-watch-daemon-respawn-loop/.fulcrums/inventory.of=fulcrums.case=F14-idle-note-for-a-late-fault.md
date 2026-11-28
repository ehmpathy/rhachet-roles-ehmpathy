# F14 — the idle note for a fault that began after the last change waits for its own change

## .the fork

a pr changed at T, read fine, then every read faulted from T+δ until the idle ttl. its idle clock (`poll.changed`) holds T, and its `read.fault.since` holds T+δ, so `set_watch_idle_ended` sees a fault span shorter than the ttl and sends the `quiet for <ttl>` note. the pr was not quiet for its last stretch: it was unread.

1. fix now: the note names both spans (`quiet for <ttl>, unread for its last <span>`) with the last fault, and a scene step drives a good read, then faults, to the ttl
2. defer: catch the shape as a dream; the `dark` note covers the critipath (a pr unread from its first read, E3), which is the case the wish names

## .taken, and why

defer (2). the fix adds a header form to the closure note contract, a new scene step (fault onset after a good read), a snap, and a vision row. that ripples past this diff. the wish names a watch that never ends; this edge ends on time, with a label that undersells the fault. no read is lost and no watch lives past its ttl.

## .rework

clean: one branch in `set_watch_idle_ended`, one header form in `as_watch_closure_text`, no caller hardened against today's text.

## .confidence

85%. the residue: a clone that reads `quiet for 7 days` may skip a look at a pr whose ci it could not see for days.

## .where

`git.pull.watch.daemon.sh` (`set_watch_idle_ended`), `git.pull.watch.alert.sh` (`as_watch_closure_text`). dream: `.dream/v2026_11_23.fix.pull-watch-idle-note-for-a-late-fault.md`

## .verdict

open
