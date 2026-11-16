# F6 · the daemon runs from a per-version copy of its code

- fork: run from the spawner's `node_modules/rhachet-roles-ehmpathy/dist` · findsert a copy into `v=$version/bin/` at spawn, cwd in the state dir
- taken (as a lean, Q7 to the commander): the copy — a shared daemon must outlive the spawner's worktree, and `_worktrees/` here are deleted and upgraded often. one version = one set of bytes, so a copy keyed by version cannot drift
- rework: clean — the spawn path is one function; either choice changes no watch record or alert
- confidence: 75% — unknown whether bash skills re-read sourced files mid-run (a bash daemon would break on a deleted file; a node daemon that loaded all modules at boot may not). the blueprint should test it
- where: `1.vision.yield.md` Q7, § what is awkward; `case=_` L26
- risk: low — a local file copy; no credential, no prod write
- verdict: ruled by the director, 2026-10-31 — (b) a per-version copy in the state dir; the mechanism stays research R5
