# F17 — render details that drifted from the approved vision are recorded in the yield

- **fork:** edit the approved vision to match the shipped render · leave the vision as approved and
  record each drift in the yield, with its reason
- **taken:** record in the yield. the director approved `1.vision`; an edit after approval would
  change a contract no one re-read. the drifts:
  - the grove branch sits after the scope preview, not after keyrack: a run that matches 0 files
    must fail fast before it can wait (clamped `[case4]`, `[case3] [t5]`)
  - the no-flock line reads `grove: ⚠️ unbounded (flock not found; install util-linux to bound
    suites)`: it names the fix
  - the heartbeat now re-lists the holders, which honors `case=2 [t4]` "its next heartbeat names
    the new holder" (clamped `[case2] [t1]`); the contract table's "holders once" is the weaker
    sense of the two
- **rework:** clean — prose in one file
- **confidence:** 85%
- **raised by:** peer i004 — enroll-impl-behavior-intent blockers.2 and .3
- **verdict:** awaited
