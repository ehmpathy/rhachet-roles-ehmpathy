# F4 · state under `~/.rhachet/storage/` keyed by version

- fork: `~/.rhachet/storage/repo=ehmpathy/role=mechanic/skill=git.pull.watch/v=$version/` · `$XDG_RUNTIME_DIR` · a repo-local `.agent/.cache/`
- taken: `~/.rhachet/storage/...` — per-machine state already lives there (`git.commit.operations.sh:41`); a repo-local dir cannot be shared across worktrees
- rework: clean — one path constant
- confidence: 88% — `$XDG_RUNTIME_DIR` clears on reboot, which would suit the pid but lose the cursors
- where: `1.vision.yield.md` § the contract we propose
- risk: low — a local state dir; no credential, no prod write
- verdict: (open; rides vision approval)
