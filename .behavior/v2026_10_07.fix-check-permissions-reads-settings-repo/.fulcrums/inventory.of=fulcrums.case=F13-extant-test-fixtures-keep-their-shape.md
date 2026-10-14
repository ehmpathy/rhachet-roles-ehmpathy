# F13 — extant test fixtures keep their shape in this change

- **fork**: (a) leave the extant single-arg test procedures `composeVerdict`, `decide`,
  `decideAndReadAudit`, `seedClaudeSettings`, `runRealHook` as they are · (b) recast each to
  `(input: { ... })` in this change
- **taken**: (a). none of the five is on this diff (`git diff -U0` shows no `+` line for any of
  their definitions); each predates the change. `decide` alone has well over a hundred call sites
  in the extant suite. a recast of them all is the large out-of-scope cleanup that
  `rule.prefer.scouts-honor` bounds ("do not smuggle a refactor into an unrelated change"). every
  test procedure this change authors takes a named input (`runCheck`, `runDecide`, `runNotify`,
  `runInit`, `runOperation`, `genFixture`, `without`, `readJson`, `seedBoth`) or is an `as*`
  single-value transformer (`asAllowSettings`, `asStderrMasked`, `asOutputMasked`)
- **rework**: clean — a mechanical recast, best as its own change
- **confidence**: 90%
- **where**: peer review r004 (arch-opport-decomposition), i003 nitpick.1
- **verdict**: —
