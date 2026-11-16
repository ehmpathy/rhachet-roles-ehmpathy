# F42 — the approval's `next:` when the pr merged in the same tick

## .the fork

lifecycle case10d: an approval and a merge land in one tick. the alert reads the approval with
`next: rhx git.release --watch`, a blank line, then `#1230 merged; watch ended`. the merge already
happened, so the `next:` names a move with naught left to watch.

- (a) keep it: the approval section reads the same in every tick; `git.release --watch` on a
  merged pr is harmless and shows the release run
- (b) drop the `next:` from an approval whose pr merged in that tick
- (c) swap it for a release-to-prod move

## .taken, why

held for the commander: this changes what the watch tells a clone to do, which the gates reserve
to him (F30 class). the shipped render is (a), pinned in the case10d snap.

## .rework

clean: one branch in `as_watch_alert_text` of `git.pull.watch.alert.sh`, and a resnap.

## .confidence

n/a — held, not best-guessed.

## .where

`git.pull.watch.alert.sh` `as_watch_alert_text`; `git.pull.watch.lifecycle.integration.test.ts`
case10d.
