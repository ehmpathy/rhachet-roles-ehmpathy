# S5 · a 30 min idle cap; the grove token where seaturtle is not set

## .said

> commander (#1222, 2026-11-09T14:30Z): max it to 30min on idles
>
> also, check peer pulls, ambient machine all token should be used when avail on grove if seaturtle is not set
>
> just means whole grove gets @all.prep.GITHUB_TOKEN
>
> knawmean?

## .settled

- the quiet-pr gap caps at 30 min, not 15
- where the seaturtle token is not set, the daemon reads with the grove's machine token, `@all.prep.GITHUB_TOKEN`, when filled
- "check peer pulls": taken as the peer-pull auth contract (F48)

## .landed

| where | what |
|---|---|
| `git.pull.watch.operations.sh` | `WATCH_POLL_MAX_SECONDS` default 1800 |
| `git.pull.watch.token.sh`, `git.pull.watch.daemon.sh` | `get_watch_token_ambient`; fallback on `absent` |
| `git.pull.watch.operations.integration.test.ts` case0, `git.pull.watch.delivery.integration.test.ts` case8g, case8h | the clamps |
