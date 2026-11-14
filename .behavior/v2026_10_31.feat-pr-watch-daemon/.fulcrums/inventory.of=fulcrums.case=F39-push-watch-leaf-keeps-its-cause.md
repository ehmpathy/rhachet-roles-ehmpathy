# F39 — the push's `watch:` leaf keeps the cause of a crashed watch

## .the fork

5.3 i003 peer lane r6 (ergo-snapshot-visual-blemishes) reads the push leaf
`watch: ✋ ConstraintError: the watch said naught (exit 2); stderr: <last stderr line>; rerun: …`
as one long leaf that inlines a raw shell line, and asks to keep the leaf short and send the raw
line to stderr alone.

- (a) keep the cause in the leaf: a crashed watch says naught on stdout; its last stderr line is
  the only cause there is. the push tree is what a clone reads after a push; a leaf with no cause
  makes the clone rerun blind
- (b) a short leaf, the cause on stderr alone: the tree reads tidier; the clone must read a second
  stream to learn why the watch is off

## .taken, why

(a). the leaf exists to say why the watch is off and how to rerun it. a crash is rare, so a long
leaf on a crash costs less than a blind rerun.

## .rework

clean: one transformer, `as_push_watch_status`, composes the leaf; a nested `cause:` branch under
`watch:` is a local change with a resnap.

## .confidence

80%: a nested `cause:` branch may serve both asks; it changes the json `watch` string too.

## .where

`src/domain.roles/mechanic/skills/git.commit/git.commit.push.sh` `as_push_watch_status`.
