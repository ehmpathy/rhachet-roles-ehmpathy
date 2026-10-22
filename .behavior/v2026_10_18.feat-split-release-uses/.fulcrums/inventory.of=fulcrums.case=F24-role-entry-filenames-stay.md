# F24 — the role entry files keep their `get*Role.ts` names

## .the fork

peer review i001 (arch-opport-decomposition nitpick.2) names a filename/export mismatch:
`getMechanicRole.ts` exports `ROLE_MECHANIC`, and the architect and ergonomist entries match it.

- **A (taken)** — leave the names; the stone touches one `hooks` block in each file
- **B** — rename the export or the files across all roles now

## .taken, and why

A. every role entry in this repo has this shape, so it is the repo's convention, not a slip in this
diff. a rename moves three entry files and every consumer that imports them — a change to the
role package's surface, unrelated to the meter split.

## .rework

clean: a rename, in its own diff, whenever the convention is settled.

## .confidence — 85%

## .where

`src/domain.roles/{mechanic,architect,ergonomist}/get*Role.ts`

## .verdict

open.
