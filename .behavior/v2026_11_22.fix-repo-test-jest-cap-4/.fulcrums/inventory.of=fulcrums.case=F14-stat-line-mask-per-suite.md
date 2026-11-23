# F14: the `suites:` stat line keeps each suite's extant mask

## .the fork
- **a.** the workers suite shows `suites: 1 files`, as the play, against and base suites do. The scope suite masks it to `suites: N files`, because its count varies by jest version. `1 files` is the skill's extant stat line, pre-route
- **b.** adopt one mask across the dir, and fix the `1 files` grammar in the skill, as a 5.3 peer lane (snapshot-blemishes) suggested

## .taken
**a.** The workers suite matches the majority shape (play, against, base). A dir-wide mask would edit suites this route does not touch. The grammar fix lives in the skill's stat line and would re-snap every suite that prints it. Both changes belong to the tree redesign, already caught as a dream (`dreams/v2026_11_22.fix.one-status-row-per-run-tree.md`); this fulcrum adds the `1 files` line to it.

## .rework
clean for the mask: one `.replace(/suites: \d+ files/g, 'suites: N files')` in `asStableOutput`, then a resnap. The grammar fix ripples to every suite's snaps.

## .confidence
80%.

## .where
`git.repo.test.workers.integration.test.ts` `asStableOutput`; the skill's stats branch.

## .verdict
awaits wisher review.
