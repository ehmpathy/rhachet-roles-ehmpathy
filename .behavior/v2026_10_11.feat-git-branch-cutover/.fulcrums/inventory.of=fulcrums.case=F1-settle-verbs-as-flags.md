# F1: settle verbs as flags

- **fork**: `rhx git.branch.cutover --continue` / `--abort` (flags) vs a dispatcher with
  `begin` / `continue` / `abort` subcommands, as `git.branch.rebase` does.
- **taken**: flags. the wish's primary call is flat (`rhx git.branch.cutover --to <b>`); a dispatcher
  would force `begin` in front of it. flags also mirror `git cherry-pick --continue`.
- **rework**: clean — the arg parser and the halt text change; no caller depends on it yet.
- **confidence**: 70%. low because the role already has one settle vocabulary (rebase subcommands),
  and consistency may matter more to the wisher than the flat call.
- **where**: `1.vision.yield.md` contract + q1; cases 6, 7, 9.
- **verdict**: overruled by wisher, 2026-10-14 — subcommands. the start form becomes `begin` to match `git.branch.rebase begin | continue | abort` (best guess, F9)
