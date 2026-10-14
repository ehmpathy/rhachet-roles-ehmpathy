# inventory of fulcrums

| case | title | rework | status | confidence |
|------|-------|--------|--------|-----------|
| F1 | walk-up dir read for its project layer on the old layout only | clean | ruled: approved, then narrowed by wisher ("split by layout") | 100% |
| F2 | peer hooks + inits out of scope | clean | ruled: overruled by wisher — all of #895 in scope | 100% |
| F3 | no allowlist found still blocks once | clean | best-guessed, awaits council | 80% |
| F4 | rhachet split layout taken from issue text | clean | ruled: confirmed by wisher, as #895 says | 100% |
| F5 | block names the config dir when it differs from the walk-up dir | clean | ruled: approved by wisher | 100% |
| F6 | user layer reads $HOME/.claude when $CLAUDE_CONFIG_DIR is unset | clean | best-guessed, closes a gap that predates the wish | 85% |
| F7 | init detects split by settings.repo.json; a settings.json link kept as a guard | clean | best-guessed; rhachet confirms dead in normal flow, keep or drop is ours | 85% |
| F8 | the file writer owns the one init backup | clean | best-guessed, awaits council | 85% |
| F9 | the three non-permission walk-ups are left unfolded | dirty | best-guessed, awaits council | 85% |
| F10 | the extant block headers stay unqualified in this change | dirty | per the approved vision; disputed with r002 | 90% |
| F11 | "user layer" names claude's user settings scope, not a person | clean | best-guessed; disputed with r009 | 85% |
| F12 | the layer lib stays beside the hooks that source it, one lib of several functions | dirty | best-guessed; disputed with r001, r004 | 90% |
| F13 | extant test fixtures keep their shape in this change | clean | best-guessed; disputed with r004 | 90% |
| F14 | the init's link refusal goes to both stdout and stderr | clean | best-guessed; disputed with r004, r009 | 90% |
| F15 | the init writes the repo .claude, not $CLAUDE_CONFIG_DIR | clean | best-guessed; gap restated i006; init now names the unwritten config dir | 65% |
| F16 | the layer lib returns through named globals, not namerefs | clean | best-guessed; disputed with r011 | 85% |
| F17 | a nudge-record fault blocks (exit 2) until fixed | clean | settled by main: #917 ships exit 2 | 100% |
| F18 | the block lists layer states only when no layer holds an allow | clean | best-guessed; disputed with r010 | 80% |
| F19 | the matcher pattern syntax stays as it was | dirty | best-guessed; disputed with r010 | 85% |
| F20 | decide reads the layers once per key, not once for both keys | clean | best-guessed; disputed with r011 | 80% |
| F21 | the decide audit log lives in the clone's config dir | clean | per the approved vision (case 11, cell #37); disputed with r010 | 85% |
| F22 | each hook keeps its own no-dir policy; the dir getters stay as test views | clean | best-guessed; disputed with r011 | 85% |
| F23 | the prior boot.yml `describe.skip` is fixed in this route, not split out | clean | best-guessed at 5.3 | 85% |
| F24 | the re-enroll hint reads a delta actor's roles from `rolesDelta` | clean | ruled: confirmed by rhachet | 95% |
| F25 | the empty-allowlist line rides every nudge render mode | clean | best-guessed at the rebase onto #917 | 80% |
| F26 | every nudge-record fault names the config dir as the first remedy | clean | best-guessed at the rebase onto #917 | 70% |
| F27 | main's check-permissions fixtures take a sentinel allow, not an empty one | clean | best-guessed at the rebase onto #917 | 85% |
| F28 | the split-layout files are `settings.of.repo.json` and `settings.of.grove.json` | clean | per the wisher, 2026-10-14; not yet visible in rhachet | 85% |