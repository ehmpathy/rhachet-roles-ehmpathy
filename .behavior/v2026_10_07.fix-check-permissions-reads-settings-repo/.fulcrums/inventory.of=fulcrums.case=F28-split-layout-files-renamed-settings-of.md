# F28 — the split-layout files are `settings.of.repo.json` and `settings.of.grove.json`

- **fork**: the wisher reports, 2026-10-14, verbatim: "rhachet has swapped
  settings.{repo,grove}.json -> settings.of.{repo,grove}.json to collocate in alphasort".
  (a) rename every hook, init, test, and snapshot to the new names now · (b) read both names until
  the rhachet release lands · (c) hold until the rename is visible in rhachet
- **taken**: (a). the split layout has never shipped, so no install holds a `settings.repo.json`
  the hooks must still read; a dual-name read would carry dead code into the first release.
  the release-gated checks of 5.3 then verify the names against the real release
- **evidence**: not visible to this clone. rhachet `origin/main`, every local rhachet worktree,
  `gh search code`, and the rhachet pr list hold no `settings.of.repo`; the rename likely sits on
  an unpushed branch. the wisher is the source
- **what moved**: 205 literal sites across `src/**` (hooks, init, the layers lib, tests,
  snapshots, test titles), two regex-escaped sites, and the init backup name, which derives from
  the file name (`settings.of.repo.<stamp>.bak.json`). the decide test's `<SETTINGS>` mask widened
  from one `.word` segment to any number
- **rework**: clean — the same two sedreplace calls in reverse, plus a resnap
- **confidence**: 85% — the wisher states it; this clone cannot see it yet
- **where**: `src/domain.roles/mechanic/**`
- **verdict**: —
