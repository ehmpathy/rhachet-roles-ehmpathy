# F11 — how the commit step reaches the `git.commit.set` gates and meter

## .the fork
the gates, sponsor lookup, and meter write sit inline in `git.commit.set.sh` (:709-998,
:1107-1112, :1324-1354). catchup must pass the same gates in the same order (vision invariant 4).
three paths: (a) compose — call `git.commit.set` with `MERGE_HEAD` set, so its plain `git commit`
makes the merge commit; (b) extract the gates and meter write into `git.commit.operations.sh`;
(c) duplicate them in catchup.

## .taken
(b) extract. the gate leaves (blockers, quota read, sponsor lookup, robot identity, meter spend)
move into `git.commit.operations.sh` with a `skill=` label; `git.commit.set` and catchup both call
them; each orchestrator keeps its own gate order and plan policy.

why, with evidence:
- `git.commit.set.sh:936-945` states the lift policy in its own words: a leaf moves to
  `git.commit.operations.sh` "on proven reuse across skills". catchup is the second caller
- (a) fails two vision cells. plan (#2, #11, #15) must preview before any merge, and with no
  staged change `git.commit.set` refuses at `:1088` ("no staged changes"). and its first-commit
  rule (`:652-668`) refuses a `cont(...)` header on a branch with no `feat`/`fix` commit, which
  dead-ends `[case1b]`
- (c) leaves two copies of the same gates; the rebase twin already shows that drift (its header
  claims a decrement no line makes)

## .rework
clean: the leaves are internal to the mechanic role; no caller outside `git.commit.set` and
catchup reads them, so a reversal is a revert of the lift.

## .risk
low. drift risk: none for the gates, one source. the risk moves to `git.commit.set` itself: a lift
of inline code could shift its output. clamp: its integration snapshots must stay byte-identical
through the lift; any snapshot diff is a regression, never a resnap.

## .confidence
80% — the lift touches a large, heavily-guarded file; the snapshot clamp is what holds the
confidence up.

## .where
`5.1.execution.blueprint.md` § C1; `git.commit.operations.sh`; `git.commit.set.sh`.

## .verdict
taken by the driver: an execution fork, by the director's call (seed S6).
