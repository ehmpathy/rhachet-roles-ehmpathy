# F12 · the reply alert function keeps the `as_watch_*_text` name

## .the fork
- (a) rename `as_watch_reply_alert_text` to a `print_*` name, since it prints its text
- (b) keep the name of the family it joins: `as_watch_events_text` and `as_watch_alert_text` on main also compose and print the alert text

## .taken
(b).
- every caller captures the output via `$(…)`, so to the caller each is a transform from events to text
- a rename of the new member alone splits one family across two verbs; a rename of the whole family touches main's callers, beyond this pr

## .applies to
arch-opport-decomposition nitpick.1

## .rework
clean. a family rename is a sedreplace over one file plus its callers.

## .confidence
80%.

## .verdict
open — for the council.
