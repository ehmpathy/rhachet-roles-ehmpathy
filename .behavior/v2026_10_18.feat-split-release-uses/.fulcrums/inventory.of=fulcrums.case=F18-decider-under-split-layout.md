# F18 — where the PermissionRequest decider registers under the rhachet 1.49 layout

## the fork

the decider (`permissionrequest.decide-permissions.sh`) has no role declaration; rhachet's hook
sync knows onBoot/onTool/onStop/onTalk only. it lived as a hand entry in the committed legacy
`.agent/.actors/actor.via.slug=.default/brain/.claude/settings.json` (#576). the 1.49 layout
derives `settings.of.repo.json` from the roles alone, so a fresh tree (ci included) has no decider,
and `permissionrequest.compose` case1 + `decide-permissions` case12 t0-t3 fail on it, correctly.

- **A** — commit the entry in a tracked actor `settings.of.repo.json`. this repo only; a generated
  file, hand-committed.
- **B** — `init.claude.permissions.sh` (mechanic role init) writes the entry. ships the
  auto-approver to every repo that links the mechanic role.
- **narrow** — a repo-local init, `.agent/repo=.this/role=any/skills/init.claude.permissionrequest.sh`,
  chained after `rhachet init` in `prepare:rhachet` (the command ci runs). this repo only, and
  regenerated on each init rather than hand-committed.

## taken, and why

narrow, ruled by the director: "register the PermissionRequest decider in this repo own settings
only; a fleet-wide auto-approver is a behavior of its own, not part of the release-uses split."

- B is reverted: the mechanic init, its `[case5c]`, and its snapshots match HEAD.
- the repo init upserts one decider entry, first, keyed on its command; it keeps every other
  PermissionRequest entry and refuses a linked target (exit 2). its matcher stays untagged, so
  the hook sync neither claims nor prunes it.
- clamp: `src/.test/init.claude.permissionrequest.integration.test.ts`, 4/4.
- proof against a fresh tree: with the generated `settings.of.repo.json` removed, `rhachet init
  --hooks` alone writes no decider; then `rhx init.claude.permissionrequest` seats it; then
  `permissionrequest.*` + both init suites pass 310/310.

## rework

clean: one repo-local file, one `prepare:rhachet` link, one test. a fleet-wide reach, if ever
wanted, is a behavior of its own.

## confidence, and why it is low

85%: ci runs `npm run prepare:rhachet`, which now ends in the repo init, so the decider lands
before the integration shards; ci itself is not yet observed with it.

## where

- `.agent/repo=.this/role=any/skills/init.claude.permissionrequest.sh`
- `package.json` `prepare:rhachet`
- `src/.test/init.claude.permissionrequest.integration.test.ts`

## verdict

ruled 2026-10-21 — the director: narrow reach.
