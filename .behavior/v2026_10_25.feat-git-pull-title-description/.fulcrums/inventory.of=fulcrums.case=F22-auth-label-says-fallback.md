# F22 — the as-human auth label keeps the word "fallback"

- fork: A. drop "fallback" from `as-human (gh cli login, fallback)` now, or print it only when a
  fallback happened · B. keep the shared label as it ships, and catch the change as a dream
- taken: B. the label comes from `get_comment_auth_label`, which echoes the one string in
  `git.commit.operations.sh:952`. that string is pinned by `git.commit.set` and `git.commit.push`
  tests and snapshots (8 sites) and by the comment suite. a change here rewrites the git.commit
  contract inside a pull scoped to title and description
- why it holds today: "fallback" names the mode's rank (as-ehmpath is the default credential,
  as-human the fallback one), not a failed attempt. the reader can misread it (5.3 r11 n1): a cost
  in the words, not a shipped harm
- rework: dirty. one string, but it ripples into git.commit tests, snapshots, and #1143's comment snaps
- confidence: 75%. a reviewer may prefer the rename in this pull
- where: `git.commit/git.commit.operations.sh:952`, and every render of `auth:` / `opened:`
- dream: `.dream/2026_11_02.auth-label-without-fallback.dream.md`
- verdict: open, for the pr review
