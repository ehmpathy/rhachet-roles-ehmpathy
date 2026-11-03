# F5 — the attribution lives in `git/git.attribution.operations.sh`

- fork: A. `git.commit.operations.sh`, which push and #1143's ops already source · B. a new
  attribution file in `skills/git/`, the common ancestor of the git.commit and git.pull trees
- taken: B. lean A held until peer review: i002 r5 blocker.2 named a description verb that reads
  the git.commit context's internals a scope leak; i003 r5 blocker.1 named the mirror leak once
  the file sat in `skills/git.pull/`. in `skills/git/` neither noun owns it, and both writers read
  it as peers (`rule.prefer.most-common-denominator`)
- rework: clean. back to A is a move of four declarations and two source lines
- confidence: 90%
- where: `PR_BODY_ATTRIBUTION`, `PR_BODY_LINE_CLASSIFIER`, `get_clean_pr_body`,
  `get_all_pr_body_repairs`, `as_pr_body_attributed` in `git/git.attribution.operations.sh`;
  read by `git.commit.push.sh` and `git.pull.description.set.sh` (via `git.pull.operations.sh`)
- verdict: open, for the pr review
