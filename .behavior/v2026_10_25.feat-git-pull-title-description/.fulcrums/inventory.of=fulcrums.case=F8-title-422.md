# F8 — no client title cap; github's 422 mapped to a ConstraintError

- fork: A. a client guard at 256 · B. no client guard; map github's 422
- taken: B. the 256 figure is unverified; a wrong client cap would refuse valid titles
- rework: clean. A is one length check before the write
- confidence: 85%
- where: `set_one_gh_pull_field` in `git.pull.operations.sh`
- verdict: open, for the pr review
