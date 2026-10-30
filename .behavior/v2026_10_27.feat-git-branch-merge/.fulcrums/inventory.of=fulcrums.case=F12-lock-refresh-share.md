# F12 — `lock refresh`: new copy, or a shared body with rebase

## .the fork
the rebase `lock refresh` demands a rebase in flight (`git.branch.rebase.lock.sh:108-113`) and
lacks the `package.json`-in-conflict check catchup needs (case=6 `[case6b]`). (a) a new copy in
catchup; (b) lift the install + stage body into a shared operations file, each verb keeps its own
in-flight guard. blueprint C2.

## .taken
none. the commander's call.

## .rework
clean while no code rests on it.

## .risk
low: unpicked, code waits. (a) leaves ~100 lines twice, a drift cost, no shipped harm; (b) touches
the rebase skill, whose suites must stay green.

## .confidence
n/a — unpicked.

## .where
`5.1.execution.blueprint.md` § C2.

## .verdict
open: commander.
