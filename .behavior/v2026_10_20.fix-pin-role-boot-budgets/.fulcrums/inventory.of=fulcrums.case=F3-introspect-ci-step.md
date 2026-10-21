# F3 — `repo introspect` as its own ci step

- fork: (a) rely on the extant `build` step, which already runs introspect; (b) split it out as a named step
- taken: (b), in `test-types` of `.github/workflows/.test.yml`. coverage already existed; the split makes a red gate read as a red gate
- risk: `.test.yml` may be a declapract-managed file; a re-stamp could undo the split (coverage stays, the name goes)
- rework: clean — revert one step
- confidence: 75%
- verdict: awaited
