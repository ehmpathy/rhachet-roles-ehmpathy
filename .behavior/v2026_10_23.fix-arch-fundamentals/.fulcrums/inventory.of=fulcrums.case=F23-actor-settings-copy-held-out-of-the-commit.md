# F23 — the actor settings copy is held out of the commit; the live file is left untouched

- **the fork**: r11 (i004) found `.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.grove.json` staged as a type change: `main` tracks a symlink to the human's `~/.claude/settings.json`; the worktree holds a regular file, composed by a tool (it adds `CLAUDE_CODE_DISABLE_MOUSE`). (a) restore the symlink now; (b) leave the live file, hold it out of the route's commit, and send the cause upstream.
- **taken**: (b).
- **why**: the file is the live settings of the session that drives this route. to restore the symlink drops the composed key and changes the human's environment mid-session — not safe for a driver to decide (`rule.always.fix-forward-under-scouts-honor`: unsafe → defer). the writer lives in `ehmpathy/rhachet`, so the cure is upstream: `dreams/v2026_11_24.reseed.actor-settings-symlink-replaced-by-a-copy.md`. no commit happens on this route until a stone asks (`rule.forbid.commits-the-route-did-not-ask-for`), so the hazard ships only at the route-end commit.
- **the ask, at route end**: before `git.commit.set --unstaged include`, the human picks one — restore the symlink (`rhx symlink --at .agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.grove.json --to /home/vlad/.claude/settings.json --mode absolute --idem upsert`), or untrack the file and gitignore it.
- **rework**: clean — one symlink, or one gitignore line.
- **confidence**: 85%. the residual: the human may want the composed copy tracked on purpose.
- **where**: the git index; `5.1.execution.from_vision` review r11 (i004) blocker.1
- **verdict**: ruled — the symlink is restored. checked 2026-11-27: `file` reports a symbolic link to `/home/vlad/.claude/settings.json`, and `git status` lists the path as unchanged, so it matches main and no type change enters the commit
