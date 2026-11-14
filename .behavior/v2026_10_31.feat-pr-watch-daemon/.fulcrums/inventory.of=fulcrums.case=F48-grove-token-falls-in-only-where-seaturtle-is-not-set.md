# F48 — when the daemon reads the grove token, and what "check peer pulls" asks

## .the fork
the commander asked that the grove's ambient machine token (`@all.prep.GITHUB_TOKEN`) serve the daemon where the seaturtle token is not set, and to "check peer pulls". two open edges:
- which seaturtle states fall back: only `absent`, or `locked` and `blocked` too
- "check peer pulls": (a) read the peer pulls that set the ambient-token contract, and align to it; or (b) a new daemon behavior that watches peer clones' pulls

## .taken, why
- fall back only on `absent`, after every watched root reads the seaturtle key. `locked` and `blocked` are a human's to act on, and a silent swap there would hide them. the peer contract (set at the close of #1225 and bhuild#658): `--auth as-ehmpath` reads keyrack, then ambient. the daemon has no `--auth`, so it takes that as-ehmpath order
- "check peer pulls" taken as (a): the sentence goes on to the ambient token, and both peer pulls on that token closed on that contract

## .rework
clean: the fallback gate is one line in `get_watch_token_of_any_root`. sense (b) would be new scope, not a reversal.

## .confidence
80%. the comma join leaves (b) open; the reply on #1222 names sense (a) and asks if (b) was meant.

## .where
`src/domain.roles/mechanic/skills/git.pull.watch/git.pull.watch.daemon.sh` (`get_watch_token_of_any_root`), `git.pull.watch.token.sh` (`get_watch_token_ambient`)
