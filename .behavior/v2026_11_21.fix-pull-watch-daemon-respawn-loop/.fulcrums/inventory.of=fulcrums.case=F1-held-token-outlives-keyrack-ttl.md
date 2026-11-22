# F1 · a held token outlives keyrack's unlock

- fork: (a) hold the granted token until github refuses it, as the wish asks ("once per daemon life") · (b) hold it, but re-read keyrack on a fixed gap (e.g. 30 min) to honor its unlock lapse · (c) hold it until an expiry that keyrack names
- taken: (a). (c) has no input: `keyrack get` rebuilds the grant without `expiresAt` (`rhachet` `getKeyrackKeyGrant.js:53`–`60`), so `--json` never names one. (b) honors keyrack's lapse to within its gap but costs ~48 reads a day per daemon, against ~2 for (a)
- the cost of (a): the grove token, once held, serves past keyrack's ~9h unlock for the rest of the daemon life (up to the 1-week idle ttl). a human who lets keyrack lapse to stop all github reads would see this daemon read on. the seaturtle token cannot outlive its own hour
- rework: clean. a gap constant in the token read turns (a) into (b); once keyrack emits `expiresAt` (caught as a reseed dream), (c) is one parse
- confidence: 65%. why low: keyrack's lapse may be a deliberate bound that the wisher would not trade for births
- where: `git.pull.watch.token.sh`, `get_watch_token_of_any_root`, the 401 branch of `run_watch_tick`
- verdict: ruled by the wisher (seed S1): (a), hold until github refuses it
