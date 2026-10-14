# F1 — walk-up dir always read for its project layer

- **fork**: (a) the wish's literal rule: config dir = `$CLAUDE_CONFIG_DIR`, walk up only when unset · (b) config dir from env, AND the walk-up dir always read for `settings.json` + `settings.local.json`
- **taken**: (b). in this worktree `$CLAUDE_CONFIG_DIR` names a dir with no settings file, and the repo allows live in `<repo>/.claude/settings.json`. (a) blocks every command here, which breaks the wish's own "never block a command claude would allow"
- **correction (peer r011, i004)**: claude does NOT always load project scope. an enrolled clone spawns
  with `--setting-sources user,local --settings <repo>/.claude/settings.enroll.<hash>.local.json`
  (rhachet 1.48.1, `asBrainCliSpawnArgs.js`), so its project `settings.json` is not a claude source;
  its allows reach claude through the enroll file, a copy of them. the hooks still read the project
  layer, so their set is a superset of claude's: check over-allows, which fails safe; decide may
  auto-approve a project allow the enroll file lacks. the choice stands as approved; the 5.3 gate
  checks the layer set against the released rhachet, and a rhachet export of the resolved settings
  paths would let the hooks read claude's exact set
- **confound (peer r010, i010)**: the live case=4 pass in this worktree proves less than it reads. the
  enroll copy (`settings.enroll.9366365e.local.json`) matches the project `settings.json` line for
  line, so the allow claude honored came from the copy, not the project layer. the two diverge once
  `settings.json` changes after spawn (a mid-session `rhx init`): check then passes a command
  claude never loaded, and decide auto-approves it. this is a 5.3 item, in the yield's 5.3 list
- **rework**: clean — one read list in one hook
- **confidence**: 85%. low because it departs from the wish's literal words, though it follows the wish's stated outcome
- **where**: `1.vision.yield.md` .the contract; `case=4`
- **verdict**: approved by the wisher, 2026-10-07 — always read the project layer. **narrowed by the
  wisher, 2026-10-09 ("split by layout")**: the project layer is read on the old layout only. on the
  split layout (a `settings.repo.json` in the config dir or the walk-up dir) claude loads only
  `<config>/settings.repo.json` and the user `settings.json`, so the hooks read exactly those two;
  this also closes the r010 confound above, since no project file is read there. agreed with the
  rhachet split-layout clone (`handoff/to-rhachet.design-proposal.md`)
