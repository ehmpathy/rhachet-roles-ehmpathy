# F14 · daemon language: bash (QB2)

- fork: (a) bash, like every skill under `src/domain.roles/mechanic/skills/` · (b) node/ts, like bhrain's route.reminder daemon
- taken: (a). one language per role; the peer tests' PATH fakes for `gh` and `rhx` carry over unchanged. a bash loop re-reads its own file as it runs, so the per-key copy (F6) is required, not only a guard
- rework: dirty — callers (`git.commit.push`, tests, the per-key copy) harden against the bash entry; a rewrite in node redoes the daemon and its tests
- risk: low — a language choice; no credential, no prod write
- confidence: 85% — json parse in bash leans on `jq`, already a dependency of peer skills
- where: `src/domain.roles/mechanic/skills/git.pull.watch/`
- verdict: best-guessed at the lean (commander, S2: hows land at their leans)
