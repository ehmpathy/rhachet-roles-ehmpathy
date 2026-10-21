# F5 — `--why` + `--upstream` required at `commit`, not at `begin`

- **fork**: require them at `begin` (fail early, but they must then be stored between calls) or at `commit` (where the note is written)
- **taken**: at `commit`. no state carried between calls; `begin` prints the full commit command with both flags so the ask shows up front
- **rework**: clean
- **confidence**: 80%
- **where**: flag validation
- **verdict**: approved as best-guessed (robot:director, 2026-10-20)
