# F1 — rhachet cannot isolate a subject from `always`, nor cap one subject

## the fork

the wish asks two things rhachet 1.50.0 (latest published) refuses:

- 101 "never inherits `always`" — `computeBootPlan.js:203` absorbs `always` unconditionally; no schema
  key or flag opts a subject out (`RoleBootSpec.js:75-78`, `parseRoleBootYaml.js` ~150-158).
- 101 "declares `budget: tokens:` ≤ 10k" — `parseRoleBootYaml.js:31-32` throws a ConstraintError on a
  budget inside a section. a nested budget would fail the build.
- and `enroll mechanic::101` has no parser in 1.50.0 (`getRoleDeltas.js:34-61`,
  `parseRoleSpecifier.js:19-40`); rhachet#541 (boot subjects per clone) is open.

options:

- A. ship `subject.101` here now (eight rows, no nested budget); clamp ≤ 10k in this repo's test by a
  cost of the 101 section alone; dispatch to rhachet: a subject-level `always` opt-out + a per-subject
  budget, plus the `::` focus. related: rhachet#541 (a clone or route sets its subjects) — a
  neighbor; it names neither the `::` syntax nor an `always` opt-out.
- B. halt the route until rhachet ships the opt-out.
- C. shrink `always` until always ∪ 101 ≤ 10k — breaks wish item 5 (no change to the full role).

## taken, and why

A. this repo's half is independent: the subject, its rows, its clamp. a rhachet focus syntax must land before
any seat can enroll at a focus anyway, so the `always` union bites no seat today. measured: 101 alone ≈
2.8k (2,761 with chrome) via a standalone manifest; always ∪ 101 ≈ 12.3k under today's semantics
(estimate: arch 10.4k − its 3 rows + 101's 2.5k).

## rework

clean — when rhachet ships the opt-out and a per-subject budget, move the cap into boot.yml and add one
key to `subject.101`. no caller hardens against the test-side clamp.

## confidence, and why it is low

70%. the wish's "done" items 1 and 4 read literally as boot.yml-declared and `roles cost --subject 101`
under budget; neither holds until rhachet changes. the wisher may prefer B (one pr, after rhachet), or
may already have the rhachet half inflight on another branch.

## where

`src/domain.roles/mechanic/boot.yml` (subject.101), `src/domain.roles/boot.budget.integration.test.ts`
or `mechanic/boot.yml.integration.test.ts` (the clamp).

## verdict

ruled 2026-10-21 by the wisher: option A — ship with the test-side cap; the rhachet half is inflight in crew rhachet.beav.feat-enroll-role-subject-focus, cited in the pr body, not dispatched.
