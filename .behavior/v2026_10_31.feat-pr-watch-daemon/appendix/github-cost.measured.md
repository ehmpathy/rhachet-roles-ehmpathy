# github api cost of the pr-watch poll — measured

answers: commander review on #1222 — "lets verify the efficiency first. dont want to get ratelimited by github via pollers"
https://github.com/ehmpathy/rhachet-roles-ehmpathy/pull/1222#pullrequestreview-5801066822

status: method and numbers held by the director; posted to the review thread.

## verdict

well under budget. no cut is required.

- a 304 costs no quota. the warm poll is near free.
- worst case for the whole fleet: ~1,300 calls/h = 26% of 5,000/h → 74% headroom.

## method

- the daemon's own per-pr read, `get_watch_pr_state` (shipped code, unchanged), run over every open pr of `ehm-seaturtle`: 70 prs, 2026-11-06.
- token: the gh login, which reads as `ehm-seaturtle`. github's primary limit is per user, so this is the bucket the daemon's token draws on. the ehmpath test token is absent on this box.
- quota read via `/rate_limit` before and after each tick. github does not charge for `/rate_limit`.
- each reply's status and `x-ratelimit-used` header written to a read ledger, one row per reply.
- window: 2 ticks, ~28 min.
- rerun: `rhx measure.pr-watch.github-cost`
- raw: `.log/measure.pr-watch.github-cost/2026-11-06T14-39-02Z.json`, `.reads.tsv` (gitignored, on this box)

## measured

| | value |
|---|---|
| reads per pr per tick | 5: pull, check-runs, issue comments, review comments, reviews |
| tick 1 (cold cache) | 350 reads, all 200, 851s. crossed an hourly reset, so its quota delta (203) is partial |
| tick 2 (warm) | 350 reads = 324 × 304 + 26 × 200, 809s, quota +56 in one window |
| does a 304 cost quota? | no. 60 back-to-back 304s moved `x-ratelimit-used` by 6 (265 → 271) in ~110s |
| the 56 in tick 2 | 26 fresh 200s + ~30 from other traffic on the account (~130/h) |
| charge per pr per warm tick | 26 / 70 = 0.37 |
| what the 200s were | 24 of 26 are `pulls/N`: the pull object's etag churns, even on quiet prs |
| read latency | 2.3s per read. reads run one at a time |
| faults | 0 |

## derived

tick period for a daemon that holds n prs: `5n × 2.3s + 60s`.

| daemon holds | tick | charged per pr per hour | daemon total per hour |
|---|---|---|---|
| 1 pr | ~72s | ~19 | ~19 |
| 10 prs | ~176s | ~8 | ~76 |
| 70 prs | ~869s | ~1.5 | ~108 |

fleet at 70 live prs:
- worst spread, each pr alone on its own daemon: 70 × 19 ≈ 1,300/h = 26% of 5,000 → 74% headroom
- with the account's own ~130/h: ~1,430/h → ~71% headroom
- one daemon for all 70: ~108/h = 2%

one-time costs, outside the warm rate:
- a new watch: 5 reads, once. the etag cache lives on disk, so a daemon restart keeps it
- a new head sha: 1 fresh check-runs read
- a real event (comment, review, check): 1 fresh read. this is the signal the poll exists for

## against github's limits

| limit | github | the poll |
|---|---|---|
| primary, per user | 5,000/h | ≤ ~1,300/h fleet-wide, worst spread |
| secondary: concurrent requests | 100 | 1 in flight per daemon (serial) |
| secondary: points per minute (GET = 1) | 900/min | ≤ ~26/min per daemon; 34+ daemons on one account at once to reach it |
| secondary: content creation | 80/min | none; reads only |

## backoff, already shipped

- a 403/429, `x-ratelimit-remaining: 0`, or `retry-after` holds every read until `retry-after` or `x-ratelimit-reset`
- cursors hold while reads hold, so no event is lost

## caveats

- measured with the gh login, not the daemon's prep token. same user, same bucket; the prep token's identity is not verified on this box (absent)
- tick 1 crossed an hourly reset; the verdict rests on tick 2
- the window is two ticks. a longer window would firm the 0.37 figure
- the account's other traffic is mixed into the quota delta; it can only raise the charge, so the figure errs high

## code changes held in the tree (uncommitted)

- `get_watch_pr_state` moved, unchanged, from `git.pull.watch.daemon.sh` to `git.pull.watch.github.sh`, so it can run outside the daemon
- opt-in read ledger in `git.pull.watch.github.sh`: one row per reply where `GIT_PULL_WATCH_READS_LOG` names a file
- new repo skill `.agent/repo=.this/role=any/skills/measure.pr-watch.github-cost.sh`; no jest test yet
- local proof is blocked: the watch suites fail on this box with or without the change (case16b, 5 of 12, on HEAD as well). `node_modules` lag the lockfile (`rhachet` 1.50.1) and `pnpm install` is not paved here. the same suites passed on ci at `ea0be9d`; ci is where the change gets proven
- a live jest call (`TEST_LIVE=github npx jest ...`) was denied; the measure skill runs the same read-only `gh` calls outside that path

## yield floor — built in #1222 (director: yes)

- a 200 or 304 whose `x-ratelimit-remaining` sits below 10% of `x-ratelimit-limit` returns 4, the rate-limit code; the daemon holds every read until `x-ratelimit-reset`, cursors held
- tunable: `GIT_PULL_WATCH_QUOTA_FLOOR_PERCENT` (default 10)
- test: `git.pull.watch.github.integration.test.ts`, stub gh, 7 cases: below the floor on a 200 and on a 304, at the floor, above it, no headers, floor set to 0

## draft comment for the thread

> measured live: the daemon's own per-pr read (`get_watch_pr_state`), over all 70 open seaturtle prs, as `ehm-seaturtle`, the bucket the daemon draws on. quota via `/rate_limit` (free) before and after each tick, plus each reply's `x-ratelimit-used`.
>
> - a 304 is free: 60 straight 304s moved `x-ratelimit-used` by 6, the account's other traffic
> - warm tick: 350 reads = 324 × 304 + 26 × 200 → 0.37 charged per pr per tick
> - per pr: ≤ ~19/h (a pr alone on its daemon); ~1.5/h when one daemon holds 70
> - fleet at 70 prs: ≤ ~1,300/h = 26% of 5,000 → 74% headroom (~71% with the account's own traffic)
> - secondary: serial reads, 1 in flight per daemon (limit 100); ≤ ~26 req/min per daemon (limit 900)
> - a 403/429 or `x-ratelimit-remaining: 0` holds every read until reset; cursors hold, no event lost
> - new in #1222, a yield floor: once the quota left drops below 10% of the limit, the poll holds until the reset, so it never takes the clones' last ~500 calls
> - rerun: `rhx measure.pr-watch.github-cost`
