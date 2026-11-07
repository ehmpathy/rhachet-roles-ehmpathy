# F12 — dispute behavior-intent-coverage i001 blocker.1 (the clamps exist)

- **fork:** concede and add clamps that already exist · dispute with the cited tests
- **taken:** dispute. the reviewer reports that no test runs N+1 suites against a bound of N and
  none kills a holder mid-run. both are in `git.repo.test.grove.integration.test.ts`, a target of
  that very review (`input.scope.json`, last `targetFiles` entry):
  - wish clamp 1: `[case2] N+1 suites against a bound of N` — three trees, bound 2; asserts all
    exit 0, max live suites = 2, and the third names its wait (`⏳ … wait for one`, holders) then
    claims (`🎫 slot.N claimed after`)
  - wish clamp 2: `[case3] [t0] the holder is sent SIGKILL mid-run` — asserts the waiter claims
    within 5s and exits 0. proven red then green in the 5.1 execution yield
- the sub-items it lists are covered there too: default bound from cores (`[case6] [t0]`),
  invalid override (`[case5] [t0..t3]`), pool dir created 1777 (`[case1]`) or uncreatable
  (`[case6] [t2]`), stale holder past 30m (`[case2] [t2]`), waiter ctrl-c'd mid-wait (`[case3]
  [t2]`), `--what all` reach (`[case3] [t4]`, `[case6] [t1]`), scoped bypass (`[case4]`), frees
  on sigterm (`[case3] [t3]`) and kill -9 (`[case3] [t0]`). no-flock is F4, an itemized alterpath
- **rework:** clean — no artifact change rides on it
- **confidence:** 95%
- **verdict:** —
