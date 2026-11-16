# F13 · lock + detach: portable `mkdir` lock and `nohup`, not util-linux only (QB1)

- fork: (a) linux only — `flock` + `setsid`, refuse loud where absent · (b) portable — a `mkdir` lock dir (pid inside, stale check) + `nohup … &` and `disown`
- taken: (b). `mkdir` is atomic on every posix fs, so the findsert stays race-safe on macOS too; the cost is one stale-lock check (owner pid dead → reap)
- rework: clean — the lock lives behind two ops (`take_lock`, `drop_lock`) in `git.pull.watch.operations.sh`; a swap to `flock` touches only them
- risk: low — a local lock dir and a process spawn; no credential, no prod write
- confidence: 85% — a stale-lock reap adds one path that `flock` gets free from the kernel
- where: `src/domain.roles/mechanic/skills/git.pull.watch/git.pull.watch.operations.sh`
- verdict: best-guessed at the lean (commander, S2: hows land at their leans)
