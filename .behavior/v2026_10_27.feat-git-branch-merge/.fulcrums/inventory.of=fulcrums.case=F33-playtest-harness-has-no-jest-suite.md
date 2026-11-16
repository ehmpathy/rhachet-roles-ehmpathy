# F33 — the by-hand playtest harness carries no jest suite

- **fork**: peer `repo-rules` (5.3 i002) cites `rule.require.jest-tests-for-skills` against `.agent/repo=.this/role=any/skills/playtest.git.branch.catchup.sh`. (a) no suite; (b) a suite under `.agent/`; (c) a suite under `src/` that drives the `.agent/` file
- **taken**: (a). `jest.integration.config.ts` excludes `**/.agent/**` on purpose (its comment: `.agent/` holds caches and actor brain dirs with foreign suites), so (b) would never run. no repo-local skill carries one (`cicd.action.act.sh`, `show.claude.debug.sh`). (c) puts a dev harness's test in a role dir it does not belong to. the harness drives the verb, whose every exit is graded by the catchup suites; its own walk is pasted verbatim in the 5.3 self-reviews
- **rework**: clean. a suite can land later with no change to the harness
- **risk**: low. an arg-parse slip in the harness fails loud at the next by-hand run; it ships to no consumer (`.agent/repo=.this/` is never built into `dist/`)
- **confidence**: 80%
- **where**: `.agent/repo=.this/role=any/skills/playtest.git.branch.catchup.sh`; peer `repo-rules` i002 nitpick.2
- **verdict**: taken by the driver: an execution fork (seed S7)
