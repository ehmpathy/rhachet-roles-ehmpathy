# F2: how the deterministic test reaches pressViaPipeline

- fork: inject a compressor via a `context` arg (with a default, or required) · jest.mock `compressViaBhrain` · a recorded-reply cache fixture · a fake in the integration grain
- taken: inject via a **required** `context: { compressor }` (a noun, like the kin `context.brain` in `decideIsContentAdmissible.ts:12`); `brief.condense.ts:129` passes `compressViaBhrain`. reasons:
  - dependency injection is the repo's paved pattern, and mocks are forbidden
  - a cache fixture would couple the test to the cache key hash
  - a default would need an eager value import of `compress.via.bhrain`, whose load-time `createCache` mkdirs a dir. that would put an fs write into a unit test
- rework: clean. one arg, one prod caller
- confidence: 92%
- where: `pressViaPipeline.ts`, `brief.condense.ts:129`, `pressViaPipeline.test.ts`
- verdict: open
