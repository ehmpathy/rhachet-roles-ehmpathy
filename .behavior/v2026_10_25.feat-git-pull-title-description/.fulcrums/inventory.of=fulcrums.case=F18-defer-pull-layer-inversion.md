# F18 — defer the pull-layer inversion and the protocol folds

- **fork**: in this pull, (a) move the ~40 pull-generic symbols out of
  `git.pull.comment.operations.sh` into `git.pull/git.pull.operations.sh`, rename `COMMENT_*` to
  `PULL_*`, and make the comment ops source the pull layer; (b) fold `set_one_gh_pull_field` into
  `set_one_gh_resource`, unify the read-back compare on sha256, and extract one `--from` intake op;
  or defer (a) and (b) to a dream (i007 r11 findings 2 and 3).
- **taken**: defer both; fix the drift r11 named now (the `--from` hint strings now agree). (a)
  rewrites a 987-line ops file the merged #1143 comment verbs run on, and renames symbols in every
  comment verb: dirt past the wish's bound ("the comment verbs stay in #1143"). (b) changes the
  write path the comment verbs share. the title and description verbs already read through named
  ops, so the move later is mechanical.
- **re-raised** (i008 r11 item 2, graded nitpick): #1143 is merged and this pull already edits the
  comment ops, so the reviewer reads the bound as spent. the edits here are strings (F19); the
  inversion moves ~40 symbols and renames every `COMMENT_*` caller across six verbs. that is a
  refactor of a shipped family, the size the bound guards against, and it would make this pull's
  diff mostly comment-verb churn. the reviewer's own ask is "the first follow-up"; the dream holds
  it so.
- **rework**: dirty for (a) once more verbs build on the `COMMENT_*` names; clean today.
- **confidence**: 75%. r11's case is sound on ubiqlang, and twice raised; the cost sits on the
  comment verbs.
- **where**: dream `2026_11_02.pull-layer-inversion` (symlinked at `$route/dreams/`).
- **verdict**: open, for the pr review.
