# F13 — the skill suites' config-bag harnesses keep their shape

- **fork:** split each pre-extant config-bag fixture — `runInTempGitRepo` in the main suite (13
  options), `setupFixture` in the play suite (7 options) — into leaf builders that each case
  composes, in this branch · keep the config bag as the contract each case calls, and fix the
  defects inside it
- **taken:** keep the bag. both fixtures predate this branch (`git diff origin/main`: 4 lines of
  grove isolation per file before the peer rounds). a case-composed split rewrites every case of
  an 1800-line and a 3300-line suite, which `rule.prefer.scouts-honor` calls a smuggled refactor
  (blocker) when ridden into an unrelated change
- **what did ride along, under scouts honor:**
  - main suite (i001): git setup fails loud (`runGitOrFail`), a signal death never reads as exit
    1 (`asExitCode`), each snapshot-only then gained an assertion, `sanitizeOutput` takes a named
    arg, the keyrack mask keeps its error class
  - play suite (i002): the body of `setupFixture` is now leaf writers — `setFakeRhx`,
    `setFakeNpm`, `setFakeJestListTests`, `setExecutable`, `getOneRealRhxPath`; the two keyrack
    flags became one discriminant (`mockKeyrack: 'unlock' | 'locked'`); `asSkillArgs` and
    `asExitCode` are named transformers; no `let`, no `else`; mock output is read from files, so
    no fixture text becomes shell syntax
  - scope suite (i003): `runWithScope` composes named leaves — `runGitOrFail`, `asExitCode`,
    `asSkillArgs`, `setFakeRhxRefusal`; spawns carry a timeout; an integration run must take the
    fake keyrack (a type union), so no case consults the host
- **rework:** clean — a follow-up branch can let each case call the leaves directly; no caller
  sits outside the file
- **confidence:** 85%
- **raised by:** peer i001 — arch-smell-scopeleaks nitpick.1 · peer i002 —
  arch-opport-decomposition blocker.1 · peer i003 — arch-opport-decomposition blocker.1 (scope
  suite)
- **verdict:** —
