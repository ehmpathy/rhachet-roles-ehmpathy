# F16 — what a 101 seat does, and so what leaves `always`

## the fork

rhachet 1.50.1 unions `always` into every subject, so a `--subject 101` seat boots always ∪ 101:
12,421 tokens, over the 10k the wish asks for. the cut must come out of `always`, and what to cut
turns on what a director's 101 seat does.

options:
- A. a 101 seat cures tools in its own seat and commits its own route; it never releases, never
  merges, and is not the seaturtle. cut the release, merge, push, cross-repo and CI-watch skills,
  and the seaturtle persona.
- B. a 101 seat also pushes and watches CI; cut only release + rebase + persona (≈ 1.6k), short of
  the cap.
- C. cut the prose overlay instead (≈ 2.4k); a director's cure then writes unwicked prose.

## taken, and why

A, per the director's answer (2026-10-22): "a director 101 seat cures tools in its own seat and
commits its own route; it never releases and never merges." cut from `always`:

| tokens | row | why |
|---|---|---|
| 486 | `skills/git.release/git.release.sh` | never releases |
| 236 | `skills/git.branch.rebase/git.branch.rebase.sh` | never merges |
| 233 | `skills/show.gh.test.errors.sh` | ci watch, a release step |
| 501 | `skills/git.repo.get/git.repo.get.sh` | reads other repos; a cure works in its own seat |
| 295 | `skills/git.commit/git.commit.push.sh` | `git.commit.set` documents `--push` itself |
| 604 · 256 · 129 | seaturtle persona, manifesto, emojis | mechanic's own voice, not a rule a cure must meet |

measured: always ∪ 101 = 9,681 (linked view), under the 10k cap. `git.commit.set`, `git.stage.add`
and `git.repo.test` stay: a 101 seat commits and tests.

## rework

clean — move a row back into `always` (and out of the four other subjects), then re-run the cap.

## confidence, and why it is low

80%. the director called the answer a best guess. two rows are closest to the line:
`git.repo.get` (a cure may read a peer repo's pattern) and `git.commit.push` (a route commit that
must reach a pr needs `--push`, which `git.commit.set` carries, but the push skill's own header is
no longer in sight).

## where

`src/domain.roles/mechanic/boot.yml` (`always`, every other subject); pinned in
`boot.yml.integration.test.ts` (`say the rows held out of always…`); capped in
`boot.budget.integration.test.ts` (`the union a seat boots fits within its cap too`).

## verdict

ruled 2026-10-22 by the director: taken as best-guessed.
