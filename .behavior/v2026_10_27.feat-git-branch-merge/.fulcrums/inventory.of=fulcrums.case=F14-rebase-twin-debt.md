# F14 — fix the rebase twin's debt in this pr, or leave it to the dream

## .the fork
`git.branch.rebase begin` claims a decrement it never makes, exits 1 on constraints, and reads `$?`
after `|| true` (`.dream/v2026_10_27.fix.rebase-begin-meter-and-exit-codes.md`). (a) leave it to
the dream; (b) fix it in this pr. blueprint C4.

## .taken
none. the commander's call.

## .rework
clean: either path leaves catchup unchanged.

## .risk
low: the debt ships today and is caught as a dream; catchup does not copy it either way.

## .confidence
n/a — unpicked.

## .where
`5.1.execution.blueprint.md` § C4.

## .verdict
open: commander.
