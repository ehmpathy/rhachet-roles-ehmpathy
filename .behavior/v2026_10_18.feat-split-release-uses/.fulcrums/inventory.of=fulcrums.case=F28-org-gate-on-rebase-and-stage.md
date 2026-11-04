# F28 — rebase and stage read the global blocker, not the org blocker

## the fork

r11 i006 blocker.2: `git.commit.set` and `git.commit.push` read both blocker levels (global, org);
`git.branch.rebase.begin` read neither, `git.stage.add` the global only.

- **A** — add `check_org_blocker` to rebase and stage now, via one `assure_commit_meter act=` leaf
- **B** — add the global check to rebase now (done, clamped `[case4b]`); defer the org check

## taken, and why

B. `check_org_blocker` fails closed on an unset org: no `.agent/keyrack.yml`, or no org entry in
the machine's org meter, refuses. so A would refuse a rebase on every tree that never configured
an org — a second human grant for a rebase that ships naught, the exact incident the wish names.
A also reshapes ~100 rebase and stage fixtures to seed an org meter.

the global level carries no such cost (absent = allowed), so it landed now.

## rework

dirty: A changes what an unconfigured tree may do, and every rebase/stage fixture.

## confidence, and why it is low

70%: an org block that rebase ignores is a real gap. it is narrow — rebase writes only the tree's
own branch, and push, which ships it upstream, does read the org level.

## where

- `src/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.begin.sh`
- `src/domain.roles/mechanic/skills/git.stage/git.stage.add.sh`
- dream: `dreams/v2026_10_21.reseed.org-gate-on-rebase-and-stage.md`

## verdict

awaited — the council.
