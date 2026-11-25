# F35 — the plan lists only what arrives; raw tool output stays one leaf per line

- **fork**: peer `enroll-verif-snapshot-blemishes` (5.3 i007) raises two render asymmetries. nitpick.4: the plan lists the behind commits but not the ahead ones. nitpick.8: a fetch failure shows git's stderr one leaf per line, so one two-line git sentence spans two leaves and the first leaf keeps git's `fatal:` prefix. (a) keep both; (b) list the ahead commits too, and join git's continuation lines
- **taken**: (a), for both.
  - the plan previews what the merge brings in. the behind commits are main's, new to the clone, and the merge folds them in. the ahead commits are the clone's own branch, already on its screen and untouched by the merge; the `ahead: N` count says how far apart the two are. a list of them would add length and no decision
  - git's stderr is quoted, not authored. a join of "continuation" lines needs a guess at where git's sentences end, and a wrong guess mangles the one cause an on-call human reads. one leaf per raw line keeps git's words whole and in order; `fatal:` is git's own word and names its severity
- **rework**: clean. each is a local edit in `begin.sh` (the ahead list) or `print_catchup_lines_tree` (the join)
- **risk**: low. both are render taste; neither hides a fact
- **confidence**: 85%
- **where**: `git.branch.catchup.begin.sh` plan preview; `git.branch.catchup.operations.sh` `print_catchup_lines_tree`; begin `[case7]`, acceptance `[case2][t0]`
- **verdict**: taken by the driver: render, an execution fork (seed S7)
