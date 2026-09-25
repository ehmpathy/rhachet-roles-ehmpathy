# F6 — the 480-cell product is walked in two staged boxes

**rework** clean · **status** open · **confidence** 85%

## .the fork, stated fairly

five orthogonal axes give `4 × 4 × 3 × 5 × 2 = 480` cells.

⚠️ **this read 384 until review r5**, when axis D gained a fifth value (`bad-regex` — the file
parses, one term does not compile). ✅ **and the re-count is evidence FOR this fulcrum, not against
it:** the staged layout absorbed a new axis value as one extra column per table plus a re-tally.
a flat table would have needed 96 new rows placed by hand.

| option | why rejected / taken |
|---|---|
| **two staged boxes: an 80-cell gate box, then a 6-cell cost box over the live cells** | ✅ **taken** — complete, and a reviewer can actually read it |
| one flat 480-row table | rejected — complete and unreadable; a reviewer cannot grade what they cannot scan |
| drop the two thin axes down to three | rejected — the dropped axes are where two critipaths live (`case=3`, `case=1`'s load pair) |

## .taken, and why at the time

`rule.require.dimensional-decomposition` earns its completeness "by construction" from the walked
product, and `howto.experience.decompose` warns that a matrix nobody reads is over-ceremony.

the two-stage split keeps both: **every** cell carries a verdict, and the grid stays scannable.
the split is presentational — it drops no cell, and the void it exposes (nudge state is void for
`clean` content) is itself recorded as a discovery rather than a gap.

## .rework, and why clean

it is a document layout. a reviewer who wants the flat 480 rows gets them from the same axes with
no change to any verdict.

## .confidence, and why it is 85%

the method brief's worked example uses a single 18-cell box, so a two-stage walk has no precedent
in the briefs. the 15% is the chance a reviewer grades the split as an evasion of the walk rather
than a presentation of it.

⚠️ **the mitigation is on the page.** `1.vision.experience.dimensions.md` states the split is
presentational and never a skip; `case=_.md` tallies all 64 stage-1 cells to a total that checks.

## .where

- `1.vision.experience.dimensions.md` `.the product`
- `1.vision.experience.case=_.md` `.stage 1` / `.stage 2`

## .the verdict

*(unruled — awaits the council)*
