# F16 — a refusal under `get --output text` goes to both streams

- fork: A. stderr alone, stdout empty, so `get --output text > f` never holds a tree (i002 r9
  blocker.1, its first option) · B. both streams, as every refusal of the skill family; the exit
  code (2) is how a pipe tells a refusal from a field (i003 r1 blocker.1)
- taken: B. this repo's booted rule `rule.require.skill-output-streams` grants no exception for a
  data-shaped mode: "failure: stdout yes, stderr yes"; "error output without stdout = blocker".
  i002 r9 offered A as one of two fixes, so B answers the rule without a refute of r9's harm: a
  caller that checks the exit code never reads the file as a field
- rework: clean. A is one branch back in `emit_comment_refusal` plus the family [case3] asserts
- confidence: 80%. two reviewers asked opposite shapes; the repo rule decides it, and the
  commander may grant text an exception at the pr review
- where: `skills/git.pull.comment/git.pull.comment.operations.sh` `emit_comment_refusal`;
  `skills/git.pull/git.pull.integration.test.ts` [case3]
- re-raised: i004 r9 blocker.1 asks A again; disputed under this fulcrum, so r9 and r1 stand
  opposed until a human rules
- verdict: open, for the pr review
