# F10 — a 404 to the grove token ends the watch, after one fresh token read

## .the fork

the seaturtle token lives about an hour. once it lapses, a fresh keyrack read can yield only the grove token, and a private repo out of that token's reach answers 404. two options:

- **end** — a 404 ends the watch, with a note that names the grove token and puts the seaturtle unlock before the rewatch
- **dark** — a 404 under the grove token is treated as a dark read: the watch stays, its gap doubles, and it ends at the idle ttl

a peer reviewer asked for `dark`. the grove token's reach over these repos is unknown.

## .taken, and why

`end`, with one repair. the wish says a watch on a 404 ends and stays ended. the approved vision holds the grove form of the note (case=2b, E31).

the repair closes the hole that made `end` unsafe. a 404 to the held grove token now earns one fresh keyrack read, which prefers the seaturtle token, and one retry (`is_watch_token_retry_owed`). so:

- while the seaturtle token is unlocked, a private pr never meets the grove token's 404; the retry reads it with the seaturtle token
- after a lapse, the watch ends with a note whose cure works: unlock, then rewatch. the rewatch's 404 to the held grove token re-reads keyrack, gets the seaturtle token, and the watch stands (`token [case3]`)

`dark` would keep a pr that the grove token can never see under a doubled poll for a week, with no note. it would also need a keyrack read per poll of that pr to notice a later unlock, which the wish forbids.

## .rework

clean: flip `rc 6 under ambient, after the retry` from `set_watch_gone_ended` to `set_watch_pr_cadence_faulted`. one branch, one clamp.

## .confidence

80%. the wish's literal sense, plus the approved vision, support `end`. the open question is how often the seaturtle token lapses on a box that a human tends, which only the wisher can say.

## .where

`git.pull.watch.daemon.sh`, the tick's rc 6 branch and `is_watch_token_retry_owed`

## .verdict

open
