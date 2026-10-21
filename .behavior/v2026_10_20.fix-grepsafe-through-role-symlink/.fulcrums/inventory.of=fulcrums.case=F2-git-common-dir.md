# F2 — main checkout via `git worktree list --porcelain`

- fork: (a) lift the `.git`-file sed from cicd.action.act.sh (the commander's lead); (b) parent of `git rev-parse --git-common-dir`; (c) the first record of `git worktree list --porcelain`
- taken: (c). cicd.action.act.sh lives in repo=.this and ships with no package, so grepsafe cannot source it. (b) fails open under `--separate-git-dir` (the parent of the git dir is not the checkout). (c) is git's own name for the main worktree, and marks a bare repo `bare`
- rework: clean — swap one function body
- confidence: 90% — the lead was phrased "likely candidate", not a mandate
- where: grepsafe.sh `get_one_main_checkout_root`
