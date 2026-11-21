# S1 — focus boot already shipped

## .said

> was this fixed? get this prioritized first if not already fixed.

> i thought this was already shipped, so plz rebase and prove it

(review comments on pr #1065, anchored on the vision constraint table: rhachet has no `::` focus parser, rhachet#541 open)

## .settled

the vision's constraint table is stale. rhachet 1.51.0 (#649) ships `role::subject` enroll and `inherit: { always: false }` on a subject. the repo pins 1.51.0. the proof: rebase onto main, then boot `mechanic::101` in the acceptance test against the built package.

## .landed

| where | what |
|---|---|
| `1.vision.yield.md` | constraint table restated to the shipped state |
| `blackbox/mechanic.subject.101.acceptance.test.ts` | boots `--subject 101` on rhachet 1.51.0; the boot holds no `always` row |
