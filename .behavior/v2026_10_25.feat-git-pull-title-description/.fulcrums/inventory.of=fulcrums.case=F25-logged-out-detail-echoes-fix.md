# F25 — the gh-logged-out refusal echoes its fix in the detail row

- fork: A. drop the `detail:` row when `--auth as-human` meets a logged-out gh, since the hint
  already says `gh auth login` · B. keep the shared render as it ships, and catch the change as a dream
- taken: B. the render is `fail_gh_call` in `git.pull.comment.operations.sh`, shared by all eight
  `git.pull.*` verbs; its `detail:` row prints gh's own first line, which for a logged-out gh is
  `To get started with GitHub CLI, please run:  gh auth login` (gh's double space, from a newline
  it collapses). to drop it moves #1143's comment snaps once more, beside F23
- why it holds today: the refusal names the right fix, once as gh's words and once as the hint; a
  repeat, not a wrong turn. no shipped harm
- rework: dirty. one condition, but it ripples into the comment suite's snaps
- confidence: 75%
- where: `git.pull.comment/git.pull.comment.operations.sh` `fail_gh_call`
- dream: `.dream/2026_11_02.logged-out-detail-without-echo.dream.md`
- verdict: open, for the pr review
