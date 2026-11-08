# F12: the cutover's git i/o sits in named communicators, not inline in the orchestrators

- **the fork**: (a) wrap each git act the verbs perform in a named communicator in the ops file
  (`set_branch_cut`, `set_head_branch`, `del_worktree_tracked_edits`, `set_origin_branch_fetched`,
  `set_index_from_pick`, …), and split each mixed leaf into its git halves; (b) keep the git calls
  inline where one git command already names the act, and extract only where a call needs decode
- **taken**: (a). the rubric's own example (`stripe.customers.create` → `sdkStripe.setCustomer`)
  wraps one sdk verb in one named communicator, so "git is the sdk" is the sense it rejects. the
  wrap is cheap and safe: the suite pins every render, and no snapshot moved. `park_tracked_edits`
  now composes `gen_park_index`, `gen_park_commit`, `is_park_match_worktree`, `set_park_refs`.
  git calls that serve a named lookup (`get_cutover_dir`, `del_pick_marks`) stay inline in that leaf
- **rework**: clean — a communicator is a rename of one call; no caller outside the skill depends
  on either shape
- **confidence**: 90% — peer skills (`git.branch.rebase`, `git.commit`) still call git inline, so
  the repo now holds both shapes until those are touched
- **where**: `git.branch.cutover.operations.sh` (the communicators section), `begin.sh`,
  `continue.sh`, `abort.sh`
- **verdict**: — (conceded to the arch-opport-decomposition lane, round i002)
