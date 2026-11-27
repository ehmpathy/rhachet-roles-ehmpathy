# F13: no blackbox acceptance suite for git.repo.test in this wish

- fork: add a `blackbox/*.acceptance.test.ts` that drives `rhx git.repo.test` through the built package, or leave the skill's coverage at its direct `bash git.repo.test.sh` integration suites
- taken: leave it. the gap predates this wish (no such suite existed before), and the wish's behavior is fully driven through the same executable the `rhx` entry runs. the one path a blackbox suite adds is the `--skill/--repo/--role` pass-through, which this wish does not touch. the live `rhx git.repo.test --what types` run (through the built `dist/`) shows the bound line, and `rhx git.repo.test --timeout 5m` shows the guard
- caught as `dreams/v2026_11_22.fixup.git-repo-test-blackbox-suite.md`
- rework: clean. a new test file
- confidence: 85%
- verdict: open
