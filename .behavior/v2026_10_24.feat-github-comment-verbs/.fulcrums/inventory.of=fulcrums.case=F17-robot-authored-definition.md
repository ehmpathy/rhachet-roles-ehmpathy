# F17 — what "a comment the robot authored" means, for del

## .the fork

- **taken**: author is the credential's login AND the body opens with 🐢
- rejected: author is the credential's login alone
- rejected: author is a seaturtle identity alone

## .taken, and why

#1035: del deletes "a comment the robot authored; a human's comment refused, exit 2". under `--auth as-human` the login is the human's own, so login alone cannot tell the robot's comment from the human's. every body `git.pull.comment.set` writes opens with 🐢 (no flag omits it), so the glyph plus the login marks what the verb wrote.

## .rework

clean: one predicate, `is_comment_by_robot` in `git.pull.comment.operations.sh`; the stub suite case18 pins it.

## .confidence: 75%, and why it is low

a human who types a 🐢 by hand under their own login passes the check. a hidden marker on every set body would close that, at the cost of a marker on every comment.

## .where

`src/domain.roles/mechanic/skills/git.pull.comment/git.pull.comment.del.sh`, `git.pull.comment.operations.sh`

## .verdict

open for the commander.
