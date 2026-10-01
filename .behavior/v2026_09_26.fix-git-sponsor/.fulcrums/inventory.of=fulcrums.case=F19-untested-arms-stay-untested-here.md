# F19 — the arms that had no test before keep none here; the family's arm sweep is its own change

## the fork

- **A (taken)** — pin every arm this branch gave new behavior or a new test to; leave the arms that
  had no test on main (unknown option, not-in-a-repo, command-required, unknown command across
  `bind`, `push`, `set`, `uses.global`, `uses.local`, `uses.org`) for one family-wide sweep
- **B** — write a case per arm per skill here

## taken, and why

- the header on those arms changed only by the family-wide class qualification the wisher ruled in
  F12 ("B, migrate the family now") — a text swap, no behavior change, no arm added
- none of them carried a test on main, so no assertion was left stale; the gap predates the wish
- B is ~20 new cases across six suites, each with its own harness shape (not-in-a-repo needs a
  non-git temp dir per suite) — a sweep, not a ride-along

## rework

clean — additive tests, no code change.

## confidence — 80%, and why

the snapshot-exhaustiveness rule says every variant must be snapped; the reviewer graded this a
nitpick for the reason above (no test existed to be left un-updated).

## the deferral

dream: `.dream/v2026_09_30.fix.git-commit-arms-lack-tests.md`

## verdict

(awaits the council)
