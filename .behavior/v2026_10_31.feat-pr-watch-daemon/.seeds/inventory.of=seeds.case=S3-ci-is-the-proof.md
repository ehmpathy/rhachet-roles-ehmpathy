# S3 · ci is the proof for the real-github etag case

## .said

> director: your 5.3 question is settled: option 1, ci is the proof. commit (env-drift files kept out), push, and watch #1222 with git.release --watch; the real-github etag case runs on ci with its keyrack token. quota 3 is granted, push allowed. never merge or --apply. reply with the head sha and the ci result once it settles.

## .settled

- `github.real` case1 is proven by ci on #1222, where the keyrack firewall holds its token; no local fill
- commit now, with the env-drift files (`.agent/.actors/…/settings.of.grove.json`, `settings.of.repo.json`) kept out
- push, then watch #1222 with `rhx git.release --watch`
- commit quota 3, push allowed
- never merge, never `--apply`
- report the head sha and the settled ci result

## .landed

| where | what |
|---|---|
| `5.3.verification.handoff.v1.to_foreman.md` | closed by the second option (ci is the proof) |
| `blocker/5.3.verification.md` | closed by this seed |
| the done-gate commit + push | on #1222 |
