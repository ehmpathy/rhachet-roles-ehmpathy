# F7 · daemon key = version + hash of the daemon's code

- fork: version only · version + code hash · version + `+dev` + worktree path when linked to `./dist`
- taken (lean, Q8 to the commander): version + code hash. every release install of one version holds the same bytes, so the hash agrees and "one per version" holds. dev worktrees of this repo, whose version never moves across builds, split by code
- rework: clean — one function computes the key; the state dir name follows
- confidence: 70% — the wish says "per version" plainly; a hash honors its intent (same code → share), not its letter. the commander may prefer the letter and accept the dev-worktree edge
- where: `1.vision.yield.md` Q8; `case=_` E8
- risk: low — a local key; no credential, no prod write
- verdict: ruled by the director, 2026-10-31 — (b) version + a hash of the daemon's code
