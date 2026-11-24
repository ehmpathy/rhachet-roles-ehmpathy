# F24 · one author's comments in a thread carry no per-comment label

## .the fork
- (a) a `says` node per comment; an `· @author` label only where two or more authors share the thread (today)
- (b) a label on every `says` once a thread holds two or more comments, even of one author (`· @author`, or the comment id)

## .taken
(a).
- each comment is its own peer node; the tree glyphs (`├─ says`, `└─ says`) mark where one ends and the next begins
- the thread line already names the author (`thread 5001 · new · by @surfer-kai`); `· @surfer-kai` on each `says` repeats it and still cannot tell root from follow-up
- the crew answers the thread once, via one `--reply-to <root>`; which comment is the root does not change the act

## .the counter-argument, stated fairly
the snapshot-blemish lane reads two bare `says` as indistinct: a reader scans for a cue that a second comment began, and the multi-author case shows one. an id label (`says · 5002`) would name each comment and its read target.

## .where
- `git.pull.watch.alert.sh` → `says_node($repo; $pr; $multi)`, where `$multi` counts distinct authors
- clamps: replies case1 [t0] (one author, two comments), case13 (two authors)

## .rework
clean. switch `$multi` to count comments, or add the id; resnap case1.

## .confidence
80%. a taste call on scan cues; the glyphs carry the break today.

## .verdict
open — for the council.
