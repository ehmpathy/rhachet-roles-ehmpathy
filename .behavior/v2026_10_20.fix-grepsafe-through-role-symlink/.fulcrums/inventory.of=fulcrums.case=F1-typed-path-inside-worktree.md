# F1 — admit the main checkout only when the typed path sits inside the worktree

- fork: (a) any resolved path under the main checkout passes; (b) only one reached via a path typed inside the worktree
- taken: (b). the wish names "through a role symlink"; (b) keeps a typed `../main/...` refused, so the gate admits no more than the wish asks
- rework: clean — drop one predicate to widen to (a)
- confidence: 85% — the wisher may see the main checkout as plainly in-repo, where (a) is simpler
- where: grepsafe.sh `validate_root_within_repo_or_fail`
