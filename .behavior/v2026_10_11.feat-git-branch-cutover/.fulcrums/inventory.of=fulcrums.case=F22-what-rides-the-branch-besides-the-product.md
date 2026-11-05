# F22 — what rides the branch beside the product

## the fork

i016 r011 n9 lists four things in the branch diff that are not `git.branch.cutover` or its meter:

| item | in the committed diff |
|---|---|
| `.behavior/v2026_10_11.feat-git-branch-cutover/**`, with `.route/passage.jsonl` and `.radio/record.*.json` | yes |
| `.foreman/{forks.5.1.i011,guide.5.1.i011,handoff.5.1.i010}.md` | yes (6761c9c) |
| the two actor settings files (`settings.of.grove.json`, `settings.of.repo.json`) | no — dirty in the worktree only |
| cc14be2: the `set.package.install` audit test made hermetic | yes |

## taken, and why at the time

- **the route dir ships.** `origin/main` tracks every prior route under `.behavior/` (e.g.
  `v2026_01_02.forbid-gerunds-hook`), so the route record is the repo's convention, not noise.
  `passage.jsonl` and the radio record are part of that record
- **`.foreman/*` leaves at the final commit.** main tracks no `.foreman/`; the three files are the
  foreman's scratch notes for one round, with no reader after the route. the i015 taken said
  "kept out of the product diff at the commit"; that was a plan, not a fact — they rode 6761c9c.
  the final commit (owed at the route's end) drops them: `git rm --cached -r .foreman`
- **the actor settings stay out.** each is box-local (one a symlink to a home path); every commit
  stages by name, never `-A`
- **cc14be2 rides.** the live npm advisory feed flagged `zod 3.22.4` on 2026-10-01 and turned the
  `set.package.install` pass case red for every branch. CI could not go green without it, and the
  fix (a fake curl that answers from a per-case fixture) is safe and clean: one test file, its
  snapshot, no product code. scouts honor, recorded here since no fulcrum named it

## rework

clean. any item can leave or enter the final commit by name; no code depends on any of them.

## confidence: 75%, and why it is low

the `.foreman/*` call is a guess at the wisher's taste: a route that kept its foreman notes as
history would read them as part of the record, as it reads `passage.jsonl`.

## where

the route's final commit (owed after the director's pass); `.gitignore` is untouched.

## verdict

open — for the council at the route's end.
