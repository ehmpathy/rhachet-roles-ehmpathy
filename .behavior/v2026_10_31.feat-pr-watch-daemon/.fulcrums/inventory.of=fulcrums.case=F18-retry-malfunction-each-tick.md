# F18 · a held alert whose verdict stays a malfunction: retry each tick (QB6)

- fork: (a) retry each tick until delivered or the watch ends · (b) retry N ticks, then one log line and keep the alert
- taken: (a), with a log line each 10th retry. invariant F6 of the vision forbids a drop, and the watch end bounds the retries (Q11)
- rework: clean — one counter in the outbox record
- risk: low — a local retry; no credential, no prod write
- confidence: 85% — a clone stuck `unreadable` for hours yields a long log tail
- where: `git.pull.watch.daemon.sh` outbox retry
- verdict: best-guessed at the lean (commander, S2: hows land at their leans)
