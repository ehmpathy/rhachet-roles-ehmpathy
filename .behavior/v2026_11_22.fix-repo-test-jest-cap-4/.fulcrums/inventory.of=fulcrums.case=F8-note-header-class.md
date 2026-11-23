# F8: the worker-cap note carries a `💥 MalfunctionError:` header on a run that exits 0

## .the fork
- **a.** `💥 MalfunctionError: worker cap skipped …` (the qualified class for a system-side fault)
- **b.** a plain note with no class (e.g. `note: worker cap skipped …`)

## .taken
**a.** two peer lanes (mech-failhides, arch-hazards-maintenance, round 2) asked for the qualified header under `rule.require.qualified-error-headers`, which forbids a bare `⚠️` or unclassed opener on a human-read error. the state is a real fault in the system (jest loaded the config but reported no count); the class names who fixes it. a third lane (enroll-impl-arch-defects) prefers (b), since the run exits 0. the two asks point opposite ways; (a) satisfies the rule two lanes cited, and the note's own text says the run goes on ("the suite runs uncapped").

## .rework
clean: one string, one snapshot.

## .confidence
70%. a rule for non-fatal diagnostics would settle it.

## .where
`git.repo.test.sh` → `get_jest_derived_worker_count`.

## .verdict
awaits wisher review.
