# F21: the [case12][t0] abort snapshot's log paths agree; no repair owed

- fork: re-record or hand-edit the [case12][t0] snapshot for a reported `what=lint` / `what=unit` split, or hold that no split exists
- taken: hold. every export in `git.repo.test.bound.integration.test.ts.snap` names one `what=` on both log rows; [case12][t0] reads `what=lint` on both. the only `what=unit/ISOTIME.stderr` rows sit in the `--what unit` exports ([case6], [case12][t4]), whose stdout rows read `what=unit` too. both paths derive from one `LOG_DIR`, so a live run cannot split them, and the file is re-recorded each round under `--resnap`
- rework: clean. a resnap would show any real split at once
- confidence: 95%
- where: `__snapshots__/git.repo.test.bound.integration.test.ts.snap`, the [case12] exports
- verdict: disputed at verification review
