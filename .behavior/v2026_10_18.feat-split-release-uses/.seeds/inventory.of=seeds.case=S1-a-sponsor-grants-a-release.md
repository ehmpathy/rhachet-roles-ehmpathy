# seed S1: a sponsor grants a release

## .said

> human -> sponsor; directors can sponsor and grant this too, just like they already do with commits

the commander, review thread r4659848271 on #1021, 2026-11-22, inline on `blackbox/__snapshots__/git.release.uses.acceptance.test.ts.snap` line 28 (`a human runs it from their own terminal`). typo repaired: `justl ike` → `just like`.

## .settled

- who grants a release is a **sponsor**, not "a human". a director may sponsor and grant a release the way it grants commits
- the write gate is unchanged: both meters write only through the terminal guard (`guard_actor_is_human_via_stdin`). a director at its terminal passes it; a clone's tool call does not
- renders, help, briefs, and the pr body name a sponsor. the wish keeps its words as asked; this seed carries the change
- a release into prod still needs an explicit "release into prod" plus a granted `git.release.uses` stamp

## .landed

| where | what |
|---|---|
| `src/domain.roles/mechanic/skills/git.commit/git.commit.operations.sh` | shared terminal refusal names a sponsor |
| `src/domain.roles/mechanic/skills/git.release/*.sh` | release hints and help name a sponsor |
| `src/domain.roles/mechanic/briefs/practices/work.flow/**` | four briefs name a sponsor |
| pr #1021 body | the meter table names a sponsor |
