# F17 — the git.commit journeys stay at the integration grain; an acceptance harness is its own change

## the fork

- **A (taken)** — prove the sponsor journeys where the `git.commit.*` family already proves every
  journey: `.integration.test.ts` suites that spawn the real `.sh` skill in a real temp git repo,
  with real git config, snapshot + explicit assertions. defer an acceptance harness for the family
- **B** — build the family's first `.acceptance.test.ts` harness (clone fixture → link via rhachet →
  invoke the linked `rhx` artifact) inside this bug-fix branch

## taken, and why

- **the family has never had the acceptance grain.** the repo holds 4 `.acceptance.test.ts` files,
  all `blackbox/guardBorder.onWebfetch*`. no `git.commit.*` skill, before or after this branch, is
  tested at that grain — the gap predates the wish
- **the integration suites here are blackbox in practice**: each spawns the real skill as a process,
  in a real temp repo, with no git mock, and snapshots both streams. `case47` chains
  `sponsor set` → `commit set` end-to-end; `case49` walks refusal → the printed fix → success; the
  `caseSponsorNudge` block walks the grant → commit journey (`case=7`)
- **B ripples**: a new harness, a link step, a fixture clone, a new ci lane — for a whole skill
  family, in a branch whose wish is a sponsor-source fix. that fails the CLEAN test of
  `rule.always.fix-forward-under-scouts-honor`
- two independent reviewers on the same diff read it the same way: `enroll-verif-snapshot-coverage`
  (i003) — "a pre-existing gap the driver didn't introduce or worsen … out of scope for a bug-fix
  PR"; it approved, 0 blockers

## rework

dirty — a harness for a skill family, with a ci lane; callers (the suites) would move grain.

## confidence — 75%, and why

the `acceptance-journey-coverage` rule reads literally: absent acceptance tests block merge. my
read is that the rule governs journeys this change introduces at a grain the family already uses;
a reviewer may hold that the rule demands the grain regardless. that is the wisher's call.

## the deferral

dream: `.dream/v2026_09_30.fix.git-commit-family-lacks-acceptance-harness.md`

## where

`src/domain.roles/mechanic/skills/git.commit/*.integration.test.ts`

## verdict

(awaits the council)
