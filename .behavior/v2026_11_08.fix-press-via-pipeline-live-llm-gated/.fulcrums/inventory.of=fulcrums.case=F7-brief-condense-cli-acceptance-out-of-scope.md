# F7: no acceptance suite or output snapshots for the brief.condense cli in this diff

- fork: add a `brief.condense` acceptance test that snaps its turtle, json, plan/apply, and error outputs · leave the cli's coverage to its own task
- taken: leave it. this diff changes `brief.condense.ts` by one line: the call to `pressViaPipeline` now passes `{ compressor: compressViaBhrain }`, the same function it called before. no output, flag, or code path of the cli changes, so no output variant can drift
- every cli run asks a live brain (`brief.condense.ts:132-141` → `compressViaBhrain`), so an acceptance suite spends money on each run. the director declined live brain spend for this route (seed S3)
- the cli's extant suite, `brief.condense.integration.test.ts`, is a `describe.skip` on main, untouched here. the gap predates this diff
- rework: clean. an acceptance suite is additive, and would use `describeBrainLiveOnDemand` for its live cases with no change to this diff
- confidence: 90%
- where: `src/domain.roles/librarian/skills/brief.condense/brief.condense.ts:140`
- caught: `dreams/2026_11_09.fix-brief-condense-cli-acceptance.dream.md`
- verdict: open
