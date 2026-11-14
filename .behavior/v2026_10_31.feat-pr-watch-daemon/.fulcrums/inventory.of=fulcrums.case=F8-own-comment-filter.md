# F8 · own-comment filter by a per-clone ledger of posted ids

- fork: skip every bot-login 🐢 comment · `git.pull.comment set` records each posted id per clone serial; the daemon skips those ids
- taken (lean, Q9 to the commander): the ledger — every clone posts as one bot login, so a login filter would also silence a peer clone's review, which A16 promises to alert
- rework: clean — one filter function, one write in `git.pull.comment set`
- confidence: 80% — a comment posted outside `git.pull.comment set` (raw `gh`) would miss the ledger and echo once; acceptable, since the paved path is the skill
- where: `1.vision.yield.md` Q9; `case=_` F5, A16
- risk: low — a local ledger of comment ids; the token use in `git.pull.comment set` is extant and unchanged
- verdict: ruled by the director, 2026-10-31 — (b) a per-clone ledger of posted ids
