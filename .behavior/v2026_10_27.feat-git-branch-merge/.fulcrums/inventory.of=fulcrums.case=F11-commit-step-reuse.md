# F11 — how the commit step reaches the `git.commit.set` gates and meter

## .the fork
the gates, sponsor lookup, and meter write sit inline in `git.commit.set.sh` (:709-998,
:1107-1112, :1324-1354). catchup must pass the same gates in the same order (vision invariant 4).
three paths: (a) compose — call `git.commit.set` with `MERGE_HEAD` set, so its plain `git commit`
makes the merge commit; (b) extract the gates and meter write into `git.commit.operations.sh`;
(c) duplicate them in catchup. per-option costs: blueprint C1.

## .taken
none. a blueprint question is the commander's (wish bound); the driver lists options, no pick.

## .rework
clean while no code rests on it; dirty once the skill is built on one path.

## .risk
low: unpicked, and code waits on the answer, so no wrong pick can ship. the harms a pick carries,
named for him: (a) a refusal after the merge starts leaves a merge in flight; (c) two gate copies
drift, as the rebase twin's header already drifted from its code.

## .confidence
n/a — unpicked.

## .where
`5.1.execution.blueprint.md` § C1.

## .verdict
open: commander.
