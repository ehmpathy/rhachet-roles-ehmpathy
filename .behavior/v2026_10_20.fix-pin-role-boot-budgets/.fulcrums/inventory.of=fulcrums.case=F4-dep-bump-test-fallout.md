# F4 — fix the rhachet 1.50 test fallout here

- fork: (a) fix in this pr; (b) split into a separate pr
- taken: (a). the bump is the install cure's precondition; without the fixes ci is red on this pr
- the three: hooks-reachable + permissions-propagate now read `.claude/settings.of.repo.json` (rhachet 1.50 links `settings.json` to the human's grove settings); mechanic boot.yml test asserts the `<briefs.ref base="…">` roster rhachet now emits
- rework: clean — test reads only
- confidence: 85%
- verdict: awaited
