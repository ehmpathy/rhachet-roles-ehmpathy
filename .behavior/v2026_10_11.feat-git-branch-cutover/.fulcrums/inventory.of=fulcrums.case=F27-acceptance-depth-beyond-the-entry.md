# F27: acceptance depth — which journeys cross rhachet, which stay at integration

## the fork

5.3 reviewers (i003 r010 n2, i005 r010 n1 + n2, i005 r011 n5) ask for more acceptance journeys
through the rhachet entry: the quota refuse → grant → retry walk, the squash-merged `feat` then
`git.commit.set`, a bare `begin` refusal, an apply with no grant, an `@tree` apply.

(a) add each as an acceptance case now · (b) keep the acceptance suites on the entry crossings
(help, idle continue, plan, apply, pick halt, continue unsettled, settle, abort, carry halt, and
the meter's grant lifecycle), with each named journey proven at integration through the same
entry executable; the added journeys are a follow-up

## taken: (b), and why at the time

- every named journey runs against real git, through `git.branch.cutover.sh`, at integration
  (case4 squash path, case8 + case15 quota, case5 zero-pick, the A1/A7/A9 refusals, the `@tree`
  cases). the acceptance layer adds the rhachet dispatcher, which the 13 + 8 acceptance journeys
  already cross on every verb
- each reviewer graded the point `[nitpick][better]` with no nameable harm
- the stone's round budget is spent; journeys added now would land unreviewed

## rework: clean

each journey is one more `given` in a blackbox suite that already holds the scene builders.

## confidence: 75%, and why it is low

the uses acceptance suite runs `set` through rhachet with `__I_AM_HUMAN`, so the refuse → grant →
retry walk is reachable at acceptance today, which weakens the "grant needs a terminal" half of
the earlier refute. the follow-up names it first.

## where

`blackbox/git.branch.cutover.acceptance.test.ts`; the follow-up is item 37 of
`.dream/2026_10_21.fix-cutover-position-table-and-shared-leaves.dream.md`

## verdict

open — for the council.
