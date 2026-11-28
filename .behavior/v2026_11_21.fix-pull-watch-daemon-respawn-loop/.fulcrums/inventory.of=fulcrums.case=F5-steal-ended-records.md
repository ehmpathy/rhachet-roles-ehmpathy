# F5 · the steal takes an ended older-key record with its end mark

- fork: (a) take it, end mark kept, so its held closure note still goes out · (b) delete it with its outbox
- taken: (a). F6 of the daemon (never drop an alert) holds; the new daemon drains it and deletes it the same tick it would delete its own
- rework: clean. `as_watch_record_moved` drops `.ended` today; a steal keeps it
- confidence: 85%
- where: `set_watch_records_stolen`, `as_watch_record_moved`
- verdict: open
