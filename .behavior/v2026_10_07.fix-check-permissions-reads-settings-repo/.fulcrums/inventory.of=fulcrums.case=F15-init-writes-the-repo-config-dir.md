# F15 — the init writes the repo's .claude, not $CLAUDE_CONFIG_DIR

- **fork**: (a) `rhx init` writes `$PWD/.claude/settings.repo.json`, whatever `$CLAUDE_CONFIG_DIR`
  holds · (b) the init writes `$CLAUDE_CONFIG_DIR/settings.repo.json` when set
- **taken**: (a). the init configures the repo: its target is the repo actor's allowlist. a hash
  actor's `settings.repo.json` is minted by rhachet when it spawns that actor, not by a role init a
  human runs once per repo. (b) would let whichever clone ran the init rewrite its own actor dir
  and leave the repo actor stale, so the next clone of a fresh actor would see the old allowlist
- **the gap, stated (peer r010, i006)**: on the split layout a hash actor does NOT inherit the
  repo's allows through the project layer. that layer is `<repo>/.claude/settings.json` (a link to
  the home defaults) and `settings.local.json`; the repo's allows sit in `settings.repo.json`, which
  the layer rule reads only for the config dir. so a hash actor sees the repo allows only if
  rhachet seeds its own `settings.repo.json`. on the old layout the project `settings.json` holds
  the allows, and a hash actor does inherit them. which one rhachet does is a 5.3 question.
  so the init's success never reads as the clone's own: when `$CLAUDE_CONFIG_DIR` names another
  dir, the init prints `note: this clone's config dir is <dir>; its own settings.repo.json was not
  written by this init` (`[case15][t0]` snaps it; `[t1]` pins its absence when unset)
- **rework**: clean — the target is one path expression in `init.claude.permissions.sh`; a flip
  changes it and one test
- **confidence**: 65% — how rhachet populates a hash actor's `settings.repo.json` is unverified
  until the release, and on the split layout the hash actor depends on it entirely; 5.3 carries it
- **where**: peer review r010 (enroll-impl-behavior-intent) i004 blocker.2; pinned by
  `init.claude.layout.integration.test.ts` `[case15][t0]`
- **verdict**: —
