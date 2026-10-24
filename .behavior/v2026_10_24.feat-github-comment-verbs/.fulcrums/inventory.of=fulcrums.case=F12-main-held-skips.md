# F12 · main-held skips stay skipped at 5.3

## the fork

the 5.3 stone says a found skip is removed and made to pass. the full integration run reports 134 skips. every one sits outside this pr's files:

- 7 suites under `describe.skip` — kernelize, brief.compress, brief.condense, the evals
- env-gated `runIf` / `skipIf` cases — pnpm, yarn, gh auth, ci

option A: remove the `describe.skip` calls and make those suites pass in this pr.
option B: leave them skipped; repair only the two red suites the full run found (`permission-gates.parity`, `set.package.install`).

## taken: B, and why at the time

- main parked those suites on purpose in #1038 and #1043: they move to rhachet-roles-bhrain. to un-skip them here reverses a merged decision, and pulls a second repo's migration into a pr the wish bounds to the comment verbs
- the env-gated cases are gates on host tools, not hidden failures; each runs where its tool exists
- the two red suites were real defects reachable from this branch's verification, so they were fixed here, each clamped red → green

## rework

clean. an un-skip is a later pr against the files main parked; this pr touches none of them.

## confidence: 85%, and why it is low

the stone's text is absolute ("remove the skip"). the call rests on #1038/#1043 as the owner of those skips, read from their titles and commit messages, not from a verdict on this route.

## where

`5.3.verification.yield.md` → "skips held by main, outside this pr".
