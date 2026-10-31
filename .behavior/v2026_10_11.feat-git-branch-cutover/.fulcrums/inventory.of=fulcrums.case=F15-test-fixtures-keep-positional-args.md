# F15: the new suites' local test fixtures keep two positional args

- **the fork**: (a) recast every local fixture in the two new suites to one input object —
  `git({ dir, args })`, `runCutover({ scene, args })`, `getSubjects({ scene, ref })`, the meter
  writers — and rewrite each call site; (b) keep `(scene, x)` / `(dir, args)` on the local
  fixtures in this round, and catch the sweep as a dream
- **taken**: (b). the fixtures are file-local test closures with two args each, the first always
  the scene. the sweep touches ~200 call sites across ~2,300 lines of test, each a multi-line
  shape change (`git(d, [ … ])` → `git({ dir: d, args: [ … ] })`) that sedreplace cannot do in
  one pass, so it rides a round whose other concerns are behavioral. no prod contract changes,
  and the reviewer graded it a nitpick
- **rework**: clean — the fixtures have no caller outside their own file; a later sweep swaps
  signatures and call sites in one diff, with the suites as its proof
- **confidence**: 70% — `rule.require.input-context-pattern` names tests in its `.where`, and one
  other suite (`git.commit.sponsor`) shares the positional shape, so precedent is thin
- **where**: `git.branch.cutover.integration.test.ts`, `git.branch.uses.integration.test.ts`
- **dream**: `dreams/2026_10_21.fix-cutover-test-fixtures-to-input-objects.dream.md`
- **verdict**: —
