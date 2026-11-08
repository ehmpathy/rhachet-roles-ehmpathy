# F14 — defer the auth-vocabulary lift and the terminal-stdin guard

- **fork**: in this pull, (a) lift `AUTH_*` and `fetch_github_token` out of
  `git.commit.operations.sh` into a `github.auth` ops file, and (b) refuse `--from @stdin` when
  stdin is a terminal; or defer both to dreams.
- **taken**: defer both. (a) ripples into every `git.commit.*` and `git.pull.comment.*` caller —
  dirt beyond the wish's bound. (b) the shipped `git.pull.comment set` hangs the same way, so a fix
  in description alone splits the family, and a clamp needs a pty harness this repo lacks.
- **rework**: clean — each is additive.
- **confidence**: 85%.
- **where**: dreams `2026_11_01.github-auth-ops-lift`, `2026_11_01.stdin-tty-guard` (symlinked at
  `$route/dreams/`).
- **verdict**: open, for the pr review.
