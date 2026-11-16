# F15 · live delivery test tier: none in this pr (QB3)

- fork: (a) none — a fake `rhx` on PATH covers delivery · (b) one opt-in tier that enrolls a haiku clone and delivers a real alert, under $0.50, no oauth token, off by default
- taken: (a). delivery is `clone say`'s own contract, tested in rhachet; this skill's contract is the verdict branch, which the fake covers on every verdict. no test bills a brain, so the three tiers hold trivially
- rework: clean — (b) adds one test file and a env flag; no prod code changes
- risk: low — a test tier; none bills a brain, no oauth token
- confidence: 85% — a real `clone say` into a real tty is the one seam the fake cannot prove
- where: `src/domain.roles/mechanic/skills/git.pull.watch/*.integration.test.ts`; a dream holds (b)
- verdict: best-guessed at the lean (commander, S2: hows land at their leans)
