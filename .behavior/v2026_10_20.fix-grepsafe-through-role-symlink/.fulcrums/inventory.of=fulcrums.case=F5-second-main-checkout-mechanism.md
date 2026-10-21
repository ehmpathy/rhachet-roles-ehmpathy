# F5 — grepsafe's main-checkout rule beside the hook's extant one

- found: `src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-cross-repo-access.sh:288`,
  `is_linked_role_dir_of_this_repo`, already admits "a role dir this tree links into its own main
  checkout". the vision-stage research missed it: it grepped `cicd.action.act.sh`, the wish's
  lead, and stopped
- how the two differ:
  - detector — the hook takes the parent of `--git-common-dir` (must end `/.git`); grepsafe reads
    the first `git worktree list --porcelain` record
  - scope — the hook admits only a `role=*` entry that is itself a link, into a `role=*` dir of the
    main checkout; grepsafe admits any path typed inside the worktree that resolves under the main
    checkout
- fork: (a) narrow grepsafe to the hook's role-only shape now; (b) keep grepsafe's shape (the wish's
  want 1 says "through a symlink", F1 approved typed-inside), and unify the two in a follow-up
- taken: (b). the hook's function is not a sourceable lib (it reads the hook's `CURRENT_REPO`
  global, and lives under `inits/`, apart from `claude.tools/output.sh`); a shared lib touches the
  hook and its tests — outside a nano wish. the unification is caught as a dream
- rework: clean to narrow grepsafe (add the `role=*` pattern checks to rule 2); the unification
  itself is its own change
- confidence: 75% — the wisher may prefer grepsafe match the hook's narrower shape today
- where: grepsafe.sh `validate_root_within_repo_or_fail`; the hook at the path above
