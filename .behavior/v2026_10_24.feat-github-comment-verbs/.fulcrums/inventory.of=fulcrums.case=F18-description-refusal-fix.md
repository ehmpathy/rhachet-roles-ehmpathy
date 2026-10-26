# F18 — the fix a description refusal names

## .the fork

- **taken**: `set --kind body` and `del --kind body` refuse (exit 2) and name the github ui, plus #1165 where a description verb is tracked
- rejected: name `rhx git.pull.description.set`, a skill this pr does not ship
- rejected: name a raw `gh pr edit`

## .taken, and why

the commander split the description verbs into #1165. an error must name a fix the caller can run today; the github ui is the one such fix, and the #1165 line tells the caller where the verb lands.

## .rework

clean: two fix lines, one in set and one in del; swap to `rhx git.pull.description.set` once #1165 ships.

## .confidence: 80%

## .where

`src/domain.roles/mechanic/skills/git.pull.comment/git.pull.comment.set.sh`, `git.pull.comment.del.sh`; stub suite case14

## .verdict

open for the commander.
