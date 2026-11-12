# F2 — the push meter is named `git.push.uses`

- **fork** — `git.push.uses` (new meter, its own file) · or keep `--push` inside `git.commit.uses` as an independent field
- **taken** — `git.push.uses`. one meter per allowance makes "granted without touch of the other two" true by construction: no shared file, no shared `set` that can rewrite a neighbor field (today `git.commit.push.sh:722` does exactly that). the name mirrors `git.commit.uses` and `git.release.uses`
- **rework** — clean. a rename via sedreplace before code lands
- **confidence** — 80%. the skill that pushes is `git.commit.push`, so `git.commit.push.uses` is a defensible rival
- **where** — every case file
- **verdict** — dissolved by F15 (commander, 2026-10-20): no push meter exists; push rides `git.commit.uses`