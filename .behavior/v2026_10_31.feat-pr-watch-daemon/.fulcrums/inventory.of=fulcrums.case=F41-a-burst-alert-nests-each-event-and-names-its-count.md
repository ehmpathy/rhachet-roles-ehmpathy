# F41 — a burst alert nests each event under its first line, and names its count

## .the fork

events case2e and case2f pinned a flat render: every event's `head:`, `url:`, `says:`, `file:`
lines sat at one depth, so a reader could not tell where one event ended; and a two-check burst
read `ci failed on #1220`, the same as one check. 5.3 i002 peer lane r6 nitpick.2 asked that a ci
burst name its count, as a comment burst does (`5 new comments on #1220`).

- (a) keep the flat render and the bare header
- (b) a burst of one kind: a section per event, headed by its first leaf, its other fields nested
  under it; a ci burst reads `N checks failed on #pr`; one event and mixed kinds keep their shape

## .taken, why

(b). depth in a treestruct means ownership (`rule.forbid.treestruct-indented-text-as-children`);
a flat list of fields from several events claims they share one owner. the count makes a burst
read as a burst. the `toContain` asserts of case2e and case2f hold unchanged.

## .rework

clean: `as_watch_events_text` and `as_watch_alert_phrase` in `git.pull.watch.alert.sh`.

## .the filter risk named by 5.3 i004 r012

delivery and lifecycle tests find a ci alert with `say.text.includes('ci failed')`; a burst of
two or more now reads `N checks failed`. no such test drives a burst: each sets one failed check
per tick. a burst test would match on `checks failed`, as case2f does.

## .confidence

90%: the render is a reader's call; the nest follows the treestruct rule as written.

## .where

`git.pull.watch.alert.sh`; `git.pull.watch.events.integration.test.ts` case2e, case2f.
