# F14 — grove isolation is set at module load, with no teardown

- **fork:** call `setGroveIsolation()` at module load in each skill suite · move it into
  `beforeAll` with an `afterAll` that restores `process.env`
- **taken:** module load. jest gives each test file its own `process.env`: `createProcessObject`
  sets `newProcess.env = createProcessEnv()` (jest-util 29.7.0,
  `build/createProcessObject.js:101`), a copy per file. so a pin set in one file cannot reach
  another file, even in one worker. the one suite that must see the true default,
  `[case6] [t0]` (grove), deletes `GIT_REPO_TEST_SLOTS` from its own spawn env and asserts the
  core-derived bound
- **rework:** clean — a two-line move per file, seven files
- **confidence:** 90%
- **raised by:** peer i002 — behavior-intent-coverage nitpick.2
- **verdict:** —
