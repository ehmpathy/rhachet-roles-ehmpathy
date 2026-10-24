# F7 · 🐢 prefix on comments, none on the pr body

- fork: (a) prefix every write · (b) comments only · (c) never
- taken: (b). the draft prefixes comments, never doubled, so a reader knows a clone wrote it even under `--auth as-human`. a pr body from `git.commit.push` carries no prefix; `set --kind body` matches that
- rework: clean
- confidence 75%
- where: set
