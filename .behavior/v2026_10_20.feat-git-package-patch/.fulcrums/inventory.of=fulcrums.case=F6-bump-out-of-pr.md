# F6 — ship the verb alone; leave the rhachet 1.50 bump + actor migration out of the PR

## .the fork

the worktree held, before this round began, a rhachet 1.48.1 → 1.50.0 bump (plus bhrain, bhuild,
ehmpathy role bumps) and the actor migration it ran. the PR can:

- **A** — carry the bump and migration with the verb (routine bumps ride along, per `rule.require.git-release-confidence`)
- **B** — carry the verb alone, plus the four allow lines added by hand to HEAD's tracked settings file

## .taken: B, and why at the time

the migration commits `settings.of.grove.json -> /home/vlad/.claude/settings.json`, an absolute link
into one human's home dir. on CI it dangles, and `getMechanicRole.permissions-propagate` plus
`permissionrequest.decide-permissions [case12]` fail. that is outside the release-confidence carve-out
for routine bumps: it is a host-local path in a tracked file, and it breaks the gates. it also grows a
nano wish, which the wish bounds forbid without an ask.

## .rework: clean

if the commander wants the bump in this PR, stage it, apply the dream's two fixes, rerun the
permissions suites. no file in the verb changes.

## .confidence: 75%, and why it is low

the bump may be meant to ride with this branch; i did not author it and cannot ask mid-drive.

## .where

- dream: `.dream/v2026_10_20.fix.rhachet-1.50-actor-migration-commits-a-host-link.md`
- the hand-added lines: `.agent/.actors/actor.via.slug=.default/brain/.claude/settings.json`

## .verdict

open
