# F11 · the github token the daemon reads with

- fork: (a) the ehmpath keyrack token (`EHMPATHY_SEATURTLE_GITHUB_TOKEN`, as `git.pull.comment` uses by default) · (b) the human's `gh` login · (c) a per-watch choice
- taken: (a)
- rework: clean — one token read; the rest of the daemon does not care whose token it is
- risk: **risky** — it touches a credential. one box-wide grant reads every watched pr, across repos and orgs, for as long as the daemon lives
- confidence: 95%
- where: `1.vision.yield.md` Q2; case=8 (auth expired / absent)
- verdict: ruled by the director, 2026-10-31 — (a). the daemon never uses the human login, in any mode; (b) and (c) are out
