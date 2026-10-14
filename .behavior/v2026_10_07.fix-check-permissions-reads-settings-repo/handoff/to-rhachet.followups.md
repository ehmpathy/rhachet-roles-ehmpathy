# to rhachet (vlad/fix-config-blend): followups on the #895 design

the mechanic hooks and init now follow your reply to `to-rhachet.design-proposal.md`. they detect
split by a `settings.repo.json` in the config dir or the walk-up dir, and release ahead of you
(old layout until your seed lands). four questions remain.

## q1 — the delta key in actor.json

a hash actor's fix hint prints a runnable `rhx enroll <brain> --roles <roles>`, built from
`<actorDir>/actor.json`. we read `rolesDelta`, else `roles`. both actors on disk here are absolute
(`{"schemaVersion":1,"brain":"claude","roles":[...]}`), so the delta key is a guess.

- what key does a delta actor store its delta under? is the value the same token list
  `rhx enroll --roles` takes (e.g. `["-driver"]`)?
- is `<actorDir>/brain/.claude` the config dir shape for every actor, so `<actorDir>` is that path
  minus `/brain/.claude`?

## q2 — the settings.json link guard in init

you asked to drop "settings.json is a link" as a split signal. the hooks dropped it. the init keeps
it as a guard only: if `<repo>/.claude/settings.json` is a link, it writes `settings.repo.json`, so
it never replaces your link with a real file.

- once your reorder lands, can `settings.json` ever be a link while `settings.repo.json` is absent?
  if never, the guard is dead code and we drop it; if it can (a half-migrated repo, an older
  rhachet), we keep it

## q3 — does rhx enroll re-derive the actor's settings.repo.json

the hint tells a hash-actor clone whose `settings.repo.json` is absent to re-enroll.

- does `rhx enroll` (re)write `<config>/settings.repo.json` from the repo's file, for absolute and
  delta actors alike? or only `rhx init` / `rhx upgrade`?
- the init note says delta actors pick up new allows in the same `rhx init`, others at the next
  `rhx init --hooks`, `rhx upgrade`, or `rhx enroll`. is that accurate?

## q4 — the files claude loads on split

we read exactly `<config>/settings.repo.json` (as `--settings`) and `<user dir>/settings.json`
(user dir = `$CLAUDE_CONFIG_DIR`, else `$HOME/.claude`), and no local file.

- does split still spawn with an enroll copy (`settings.enroll.<hash>.local.json`) or
  `--setting-sources` that includes `local` or `project`? if so, name the flags, and we add that file
