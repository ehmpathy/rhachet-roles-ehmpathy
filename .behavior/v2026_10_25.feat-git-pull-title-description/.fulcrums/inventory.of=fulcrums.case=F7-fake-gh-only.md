# F7 — the fake gh is the gate; a live-api suite is opt-in

- fork: A. a real-api case as a gate on the stone · B. the fake gh suites as the gate; a real-api
  case only when a named flag targets it
- taken: B, ruled. the commander set it 2026-10-31 and the director applied it to 5.3 (2026-11-02):
  a live-api suite runs only when a named flag targets it, never as a gate, and #1143 stays untouched
- what stands on it:
  - the gate: the stub suites (title, description, git.pull) and the acceptance journey through
    `rhachet run` on the stub gh cover the contract on every ci run
  - the opt-in: `git.pull/git.pull.real.integration.test.ts` names no pull. a runner names one via
    `GIT_PULL_REAL_TARGET='<owner/repo>#<n>'`; with no flag it throws a ConstraintError and reads or
    writes no pull. ci excludes it, beside #1143's real comment suite. its first run is a human one,
    later; its masked snapshot lands then
- rework: clean. to make it a gate later is a config line and a target
- confidence: 90% (ruled)
- where: `git.pull.title/`, `git.pull.description/`, `git.pull/` suites; `jest.integration.config.ts`
- verdict: ruled B by the commander (2026-10-31), applied by the director at the 5.3 halt; it
  disputes 5.3 i002 r4 blocker.1 (live caller journey snapped). the 5.3 halt is lifted
