# F17 — a set writes only a pull its own credential opened, with no override flag

- **fork**: (a) refuse a set on a pull whose `.user.login` is not the credential's login, with no
  escape; (b) refuse, plus an explicit override flag for a director's order on a peer pull; or
  (c) no ownership check (the state i006 shipped).
- **taken**: (a). the wish reads "a driver sets its own pull title and body"; i007 r11 found (c) lets
  a clone retitle a human's pull — the squash header — and stamp the seaturtle footer on the human's
  words. the comment verbs already refuse a foreign comment (`is_author_self`); one rule now holds
  across the family. the case 6 walk still passes: #1143 and #1173 were both opened by
  `ehm-seaturtle`, the login `as-ehmpath` reads (`gh pr view 1143 --json author`, 2026-11-02).
  a human's own pull is reachable under `--auth as-human`, and the refusal names that command.
- **the login alone, not the 🐢 marker** (i008 r11 item 3): the comment verbs add a body-marker check
  because one login types both the robot's and the human's comments. a pull is not that case under
  `--auth as-human`: the caller declares itself the human, and the human's own pulls are opened by
  hand, with no footer. a marker check would refuse the very pull as-human exists to reach. under
  `as-ehmpath` the login alone already separates the robot from every human.
- **rework**: clean. (b) adds one flag and one branch in `check_pull_by_self`; no caller hardens
  against its absence.
- **confidence**: 85%. an order to set a pull a third login opened would need (b); none is known.
- **where**: `git.pull/git.pull.operations.sh` (`check_pull_by_self`), both set verbs; clamps
  title [case17], description [case17].
- **verdict**: open, for the pr review.
