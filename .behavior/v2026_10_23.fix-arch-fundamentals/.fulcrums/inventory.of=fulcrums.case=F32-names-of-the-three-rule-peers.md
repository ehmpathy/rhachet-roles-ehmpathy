# F32 — the names of the three rule peers

## .the fork

the wisher asked for a forbid peer of `rule.require.most-common-denominator`, a forbid peer of `rule.require.directory.by-primary-noun`, and an avoid peer of `rule.prefer.symmetric-term-pairs`. what does each peer name?

| require / prefer | peer taken | peers weighed |
|---|---|---|
| `rule.require.most-common-denominator` | `rule.forbid.misplaced-operations` | `rule.forbid.premature-lift` — names one smell only (too high), misses a peer import from a peer's leaf (too low) |
| `rule.require.directory.by-primary-noun` | `rule.forbid.directory.by-secondary-noun` | `rule.forbid.directory.by-status` — names one cause; a concern or a verb splits peers just the same |
| `rule.prefer.symmetric-term-pairs` | `rule.avoid.asymmetric-term-pairs` | — the mirror name is the obvious read |

## .taken, and why at the time

each forbid or avoid pole names the defect its twin's test catches, so a reviewer can point at the line. `misplaced-operations` covers both smells of one placement rule. `by-secondary-noun` mirrors `by-primary-noun` word for word. each boots as say with its cure; each twin boots as ref (`rule.require.forbid-pole-on-boot-choice`).

## .rework

clean. a rename is one mvsafe per file and a sedreplace on refs; no code depends on them.

## .confidence

80%. least sure: `misplaced-operations`, since "misplaced" reads broad; a reader may expect it to cover more than the denominator.

## .where

`src/domain.roles/architect/briefs/practices/repo.structure/` · `src/domain.roles/architect/briefs/practices/ubiqlang/`

## .verdict

ruled by the wisher, 2026-11-27: the three names stand
