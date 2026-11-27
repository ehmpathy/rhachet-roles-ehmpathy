# F3: multi-mode bound is per type, not total

- fork: `--what all` bounds each child by N, or bounds the whole parent run by N
- taken: per type. each child is a full single-type run; forward `--timeout` and the child's own logic applies. a total bound needs parent-side elapsed math and a split budget
- rework: clean. contained to the multi-mode loop
- confidence: 70%. the wish says "a git.repo.test run", and to its caller `--what all` is one run; per type, it could hold a seat up to 4 × 5m (stop-on-first-failure caps a slow type at one bound, but four 4m types all pass). asked of the wisher in the yield
- evidence for the wisher: the howto's prior durations table, the only on-repo figures, read integration 1-5 min, acceptance 1-10 min, all 5-15 min. unmeasured; a 10 min acceptance suite or a 15 min `--what all` sits past 300s whether the bound is per type or total. under per type, `--what all` passes at up to ~4 × 300s; under total, it needs `--timeout` near 900
- where: the multi-mode loop in `git.repo.test.sh`
- status at execution: the vision that carried this best guess (and its [wisher] question) was approved by the director; the drive proceeds on per type. the question stays open for the wisher, and the total-bound seam is known: a parent-held start time that forwards the seconds left to each child
- verdict: open, [wisher]

## .verdict

ruled by the wisher (seed S1): the bound holds for the whole call, 420s, hard. reworked: `get_bound_left` hands each multi-mode type what the call has left; [case3][t2]-[t3] and [case18] clamp it.