# F43 — an empty openrouter reply fails an llm suite; the fix is upstream

## .the fork

- **mask it here:** wrap the librarian brain asks in a retry on `no usable reply`
- **fix it at the source:** the openrouter atom's floor walk should move on from a defective reply,
  as its readme promises; reseed it upstream, and leave the callers as they are

raised by the 5.3 full integration run (2026-10-08 06:20): 7 failures in `checkRetention` and
`clusterKernels`, both llm suites outside this route — one empty reply from provider `DekaLLM`,
and one 60s llm timeout. alone, both suites pass 18/18.

## .taken — fix at the source, and why at the time

- the defect is in `rhachet-brains-openrouter@0.1.3` (the latest): the reply check runs after the
  floor walk, so one bad host fails the whole ask (`getOneSuppliedCompletion.js`)
- a retry in the callers would hide the next host-level defect too (rule.require.solve-at-cause)
- this route chose openrouter for these brains at the wisher's ask; the swap is right, and it
  surfaced the library defect

## .rework

**clean** — once the atom hops on a bad reply, the callers need no change.

## .confidence — 80%

## .where

`.dream/v2026_10_08.reseed.openrouter-floor-moves-on-from-an-empty-reply.md`
