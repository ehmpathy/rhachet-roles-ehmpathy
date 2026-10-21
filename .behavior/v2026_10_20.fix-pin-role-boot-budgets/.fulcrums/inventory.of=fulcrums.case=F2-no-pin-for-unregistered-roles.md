# F2 — no pin for ecologist + librarian

- fork: (a) add a boot.yml + pin to each, or (b) report them unmeasurable and pin naught
- taken: (b). `getRoleRegistry.ts` registers neither; no consumer boots them; `roles cost --all` sweeps neither. a new boot.yml would change what they boot — out of the wish's bound ("the pin cuts naught")
- guard: the test's `[case0]` fails if a registered role lacks a boot spec, so a future registration of either must carry a boot.yml, and then a pin
- rework: clean — add a boot.yml + pin later
- confidence: 80% — the wish lists both under "every role measured"
- where: `src/domain.roles/getRoleRegistry.ts`
- verdict: awaited
