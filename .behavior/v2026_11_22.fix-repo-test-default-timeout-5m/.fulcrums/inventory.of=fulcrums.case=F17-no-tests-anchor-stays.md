# F17: the line-start anchor on the no-tests check stays in this change

- fork: keep the anchor (`^No tests found`) in this change, or revert it to a follow-up
- taken: keep. the cut's clamp (`[case6]`) needs a jest cut mid-output whose output holds the no-tests phrase; the unanchored check matched that phrase anywhere, so a failed test that printed it read as "no tests matched", kept no log, and hid the failure. that misread surfaced while this wish's own tests ran, and the cut-before-no-tests order the wish needs is only provable with the anchor in place
- both alternatives are anchored (`^(No tests found|testPathPattern.*matched 0 files)`): a `.*` at the head of the second would let an indented code-frame line match, the very misread the anchor exists to stop. jest prints "No tests found" at line start in every no-match case, so the first alternative alone carries real runs
- the test builds the phrase from parts (`['No','tests','found'].join(' ')`) so this suite's own source never prints it whole in a failure's code frame; the anchor and the join defend two different readers (the inner run and the outer one)
- rework: clean. one regex per site
- confidence: 85%
- where: the no-tests checks in `git.repo.test.sh` (preview and post-run)
- verdict: disputed at execution review
