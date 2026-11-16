# F4: the live suite is off by default, with no always-on real-brain proof

- fork: gate the live cases behind `BRAIN_LIVE_SCOPE=all` (off on ci) · keep one always-on live case beside the fake · a nightly job that runs the gated suite
- taken: gate all three. the wish states the outcome as "no live brain call in this suite on ci", with "a live run, if kept, sits behind a named opt-in flag". an always-on live case is the exact flake class the wish removes. the pipeline's own contract (thread, order, kernels, token counts) is proven on every run by the injected fake; the brain's skill to compress is a separate question, asked on demand
- the gate is not an absent-resource skip: it is a cost opt-in, named on every run by a todo row, and an absent key with the flag on still fails loud
- rework: clean. a nightly job is additive, and needs no change to the gate
- confidence: 95%
- where: `pressViaPipeline.integration.test.ts`, `src/.test/describeBrainLiveOnDemand.ts`
- verdict: held by the director, 2026-11-09 (seed S3). done = a green pr whose ci shows the live cases skipped by default, plus a gate test that passes with no live call. no live brain spend for the proof
- evidence that the compressor ran no default integration suite before this diff either: `compress.via.bhrain.contract.integration.test.ts:13` and `compress.via.bhrain.perfeval.integration.test.ts:1167` are `describe.skip` on main
