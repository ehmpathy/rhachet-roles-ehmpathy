# F12 — the two set verbs keep their own skeletons

- **fork**: lift validate → locate → verdict → plan → write → read back → emit into one
  `set_one_pull_field` with a per-field normalizer, or keep each set verb whole.
- **taken**: keep each whole. two usages, and the two fields differ where it counts: the body is
  stripped, signed, capped, and compared by sha256; the title is trimmed, single-line, and compared
  as text. a shared skeleton would carry a branch per field — the code paths the lift would claim to
  remove. `rule.prefer.wet-over-dry` asks for a third usage before the lift.
- **rework**: clean. both verbs already route every step through named ops
  (`set_pull_target`, `get_one_gh_pull`, `set_one_gh_pull_field`); a lift moves only the order.
- **confidence**: 80%. a reviewer (r011) asked for the lift; the `emit` leaves already drift in arg
  names, which a lift would erase.
- **where**: `git.pull.title/git.pull.title.set.sh`, `git.pull.description/git.pull.description.set.sh`.
- **verdict**: open, for the pr review.
