# F14 — pre-extant skips outside this pr

## the fork

5.3 asks for zero skips, and to fix a skip found anywhere. a scan of `src/domain.roles` finds skips
in suites this pr does not touch:

- `describe.skip` — librarian `brief.condense`, `brief.compress` (5 files), `cluster`, `restoreKernels`,
  `.evals/compareBrains`, `.evals/runReviewEval`
- `then.runIf` / `given.skipIf` — mechanic `cicd.deflake/detect` (gh auth), `git.branch.rebase.lock`
  (pnpm/yarn present), `git.repo.test.play` (`!CI`)

A: remove each skip and make each suite pass in this pr. B: leave them; catch a dream for the owner.

## taken

B. each skipped suite calls a paid brain (compress, condense, cluster, evals) or a host tool, and
none reads `boot.yml`. to un-skip is not CLEAN — it ripples into roles, credentials, and spend this pr
never opened — so `rule.always.fix-forward-under-scouts-honor` routes it to a dream.

the suites this pr touches (`boot.budget`, `boot.yml`) and the case 5 suites (`hooks-reachable`,
`forbid-tmp-writes`) hold zero skips.

## rework

clean — a later pr removes skips with no change here.

## confidence — 75%, and why it is low

the stone's text says "fix it anyway"; read strictly, this is a gap. the cost and scope argue the
other way, and the call is the wisher's.

## where

see the dream `.dream/2026_10_22.fix-pre-extant-test-skips.dream.md`

## verdict

open
