# S3 — 101 carries the heart of the role, and each of three roles holds one

## .said

> seems like this misses a lot of the heart of the mechanic. also, wheres the 101 for the architect and ergonomist too?

(review comment on pr #1065, anchored on `src/domain.roles/mechanic/boot.yml` line 407, the 101 ref rows)

## .settled

a 101 is the heart of its role in cue form, not only the rules no hook enforces. mechanic, architect, and ergonomist each declare a `subject.101` that sheds `always`, in this pr. each say row of a 101 is say elsewhere in its role, so the full role gains no brief body.

## .landed

| where | what |
|---|---|
| `src/domain.roles/mechanic/boot.yml` | `subject.101` re-cut to 26 say rows: voice, names, narrative code, procedures, errors, tests, work flow |
| `src/domain.roles/architect/boot.yml` | new `subject.101`: cause, operation grains, idempotent contracts, discovered terms, brevity |
| `src/domain.roles/ergonomist/boot.yml` | new `subject.101`: the ergonomic rubric + discoverability, status, errors, safe defaults |
| `src/domain.roles/boot.budget.integration.test.ts` | caps for all three 101s, one cue per role, a say-elsewhere check |
| `blackbox/role.subject.101.acceptance.test.ts` | architect and ergonomist seats boot `--subject 101` from the built package |
