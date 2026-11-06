# F44 — the push names its watch in every render, so extant push pins gain one line

## .the fork

`git.commit.push` now findserts a watch after it opens the pr. its extant tests pinned the tree
and json before the watch existed: `git.commit.push` cases 14b, 18, 23, 28, 33, 36 and
`git.commit.set` case 32 (which relays the push tree).

- (a) print the watch result only when a watch was set, so the extant pins hold
- (b) print it on every push: `watch: skipped (not an enrolled clone)` for a plain session, and a
  `watch` field in the json (`null` when skipped)

## .taken, why

(b). the approved vision requires it: A5 and row E7 say a push from a session that is not an
enrolled clone prints `watch: skipped (not an enrolled clone)`, never silent, so a mechanic never
believes it is watched when it is not. each extant pin keeps every prior line and value
verbatim and gains one line or one field; no assert was loosened.

## .rework

clean: the `watch:` leaf in `git.commit.push.sh`; the pins follow.

## .confidence

97%: the behavior is the vision's own words; only the snap churn is new.

## .where

`git.commit.push.sh`; `git.commit.push.integration.test.ts` cases 14b, 18, 23, 28, 33, 36;
`git.commit.set.integration.test.ts` case 32; vision `1.vision.yield.md` A5, `case=_` E7.
