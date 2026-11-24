# F17 · the reply layout is a second renderer, for now

## .the fork
- (a) one renderer for every alert: per-kind tree nodes through `render`, reply-first as an order rule, phrases composed from kinds
- (b) the reply layout renders in jq (`render`, `thread_node`, `ci_node`) beside the extant bash layouts; the extant paths stay as on main

## .taken
(b) in this pr; (a) caught as a dream.
- (a) rewrites every extant alert layout, which every pr-watch snapshot pins; a migration that size rides its own pr
- the reply path's ci section takes the extant single-kind burst shape (head once, the first `WATCH_ALERT_CHECKS_SHOWN_MAX` checks, then a count), which a reviewer asked for (5.1 round 1, arch-hazards-behavior nitpick.3); the extant mixed layout, uncapped, is unchanged from main
- the header strips the rest phrase's ` on #N` / ` #N`; a phrase composed from kinds is part of (a)

## .the counter-argument, stated fairly
the l3 arch-defects lane (5.1, round 4): one alert now has two renderers that already differ, and the reply path parses the text of the extant phrase. drift between them is a cost each later layout change pays twice.

## .where
- `git.pull.watch.alert.sh`: `WATCH_REPLY_JQ_DEFS`, `as_watch_reply_alert_text`
- dream: `.dream/v2026_11_22.lift.one-renderer-and-one-role-for-pr-watch-alerts.md`

## .rework
clean now; (a) is a refactor behind snapshots.

## .confidence
80%.

## .verdict
open — for the council.
