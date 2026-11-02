# F16 · read a `clone say` result by its json verdict (QB4)

- fork: (a) exit code only · (b) `--output json`, branch on the verdict: `enqueued`/`released` → done; `withheld`/`buffered`/`absent`/`unreadable` → outbox; reach error (dead, deaf, unknown) → drop the watch
- taken: (b). exit 2 covers both "hold and retry" and "the clone is gone" (probe R2); (a) would drop live watches at every modal
- rework: clean — one op, `deliver_alert`, maps verdict → outcome
- risk: low — a local read of a local verdict; no credential, no prod write
- confidence: 95% — the verdict field names come from the rhachet@1.50.1 dist; a later rhachet could rename them
- where: `src/domain.roles/mechanic/skills/git.pull.watch/git.pull.watch.alert.sh`
- verdict: best-guessed at the lean (commander, S2: hows land at their leans)
