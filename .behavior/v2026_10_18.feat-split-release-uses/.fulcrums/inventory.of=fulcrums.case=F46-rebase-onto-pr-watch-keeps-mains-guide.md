# F46 — the rebase onto main's pr-watch keeps main's pr-open guide

## .the fork

main `fdd9dc2b` (#1222, the pr-watch daemon) and this branch both edited `git.commit.push.sh`
and the mechanic `boot.yml`. three seams conflicted.

| seam | this branch held | main holds | taken |
|---|---|---|---|
| json push line | `{status, push_target, pr, pr_status, auth}` — `push_revoked` retired with the old push bit | adds `watch`, keeps `push_revoked` | main's `watch`, minus `push_revoked` |
| pr-open guide | one coconut hint, both fixes as its two commands | a numbered either/or list; each fix carries a `then` step (an absent key is filled, then unlocked) | main's |
| mechanic `boot.yml` | trimmed comments; `git.pull.comment.del` in ref | the same trims, plus `git.pull.watch.sh` in ref | main's |

## .taken, and why

- `PUSH_REVOKED` is set nowhere on this branch; main's line would print an unbound variable
  under `set -u`. the `watch` field is main's new contract, kept whole
- the guide: main's own decision (its F46) numbers a cure of steps, and the `then` step carries a
  fix the coconut form cannot hold. a coconut collapse would drop the fill step for an absent key
- `boot.yml`: main's side is a superset of this branch's trim

## .the boot, after the merge

main's pr-watch brief plus this branch's two-meter text put the mechanic src boot at 30,609 of
its 30,000 cap. six say briefs gain `.md.min` twins with every rule and enforcement line kept
(watch-release-after-push, commit-scopes, the test failfast / failloud / failhide trio, prod
failloud), the git.commit.set lesson is condensed, and `permissions.get.sh` moves say → ref: the
session-start notice names all three of its forms each boot. `getMechanicRole.test.ts` counts
main's third onBoot hook (the pr-watch revive).

## .rework

clean. each seam is one hunk; a revert is one edit apiece plus a resnap.

## .confidence — 85%

the guide is the soft spot: this branch's rule pushed coconut hints everywhere (F31). main chose
the numbered shape later and on purpose, so the newer call wins until a reviewer rules otherwise.

## .where

- `src/domain.roles/mechanic/skills/git.commit/git.commit.push.sh`
- `src/domain.roles/mechanic/boot.yml`
- `src/domain.roles/mechanic/skills/git.commit/__snapshots__/git.commit.push.integration.test.ts.snap`

## .verdict

open.
