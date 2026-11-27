# F1 — one shared unanswered operation

## .the fork
the unanswered read lives in `git.pull.comment.get.sh` (`as_rows_unanswered`, `shape`, `shape_all`). git.release reads no comments yet (#1171 open). options: (a) move the read into `git.pull.comment.operations.sh`, and have get --unanswered plus the set hint call it; #1171 later sources the same file. (b) copy it into set.

## .taken, why
(a). the wish asks for one read that the hint and the release gate share. the gate is out of scope, so its "use" is the future source of the same file. get --unanswered is the extant second consumer today.

## .rework, why
clean: a move of bash functions within one skill dir; no contract changes.

## .confidence, why low
88%. "use it in both" could read as "wire the release gate now", which the bounds forbid.

## .where
`git.pull.comment.operations.sh`, `git.pull.comment.get.sh`, `git.pull.comment.set.sh`
