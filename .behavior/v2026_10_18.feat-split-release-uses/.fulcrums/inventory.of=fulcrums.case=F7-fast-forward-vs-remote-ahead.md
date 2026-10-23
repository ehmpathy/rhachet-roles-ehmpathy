# F7 — a 0-ahead fast-forward refuses when the remote branch holds commits local lacks

- **fork** — fast-forward to `origin/main` regardless · or refuse when `origin/<branch>` is ahead of local
- **taken** — refuse, and name `git fetch` + a pull of the branch first. else the next `--force-with-lease` push would orphan another crew's commits
- **rework** — clean
- **confidence** — 70%. untested whether `--force-with-lease` already catches this after a fresh fetch
- **where** — inventory 3.7
- **verdict** — open
