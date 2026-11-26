# fulcrum F4: a no-op passes ungated

## .the fork
- (a) gate every call, no-op included
- (b) gate only a call whose verdict writes text

## .taken
(b). a no-op sends no text, so it has no text to check. the title, description, and comment sets each compute the verdict before plan output; the gate sits after the verdict, before plan output and before the write.

## .rework
clean: the gate call moves above the verdict.

## .confidence
85%.

## .where
title.set, description.set, comment.set: after the verdict.

## .verdict
open.
