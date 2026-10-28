# F30 — an unscoped run with no changed test files still claims a slot

- **raised by:** `enroll-verif-snapshot-blemishes` nitpick.2, 5.3 peer i005
- **fork:** list changed test files before the claim, and bypass on zero · keep the claim; the run
  learns its file set from `jest --changedSince` inside the run
- **taken:** keep, for this change. the wish bounds full suites; an unscoped run may change many
  files, so it is bounded, and its file count is jest's to find. a pre-claim list costs a jest
  start on every unscoped run, which adds load to the box the grove guards. the cost of the gap is
  one wasted wait on a busy box, then a fast exit; no slot leaks, the bound holds
- **rework:** dirty — the run path shared by every jest type, and its snapshots
- **dream:** `dreams/v2026_10_28.fix.git-repo-test-zero-file-run-claims-a-slot.md`
- **confidence:** 75%
- **verdict:** —
