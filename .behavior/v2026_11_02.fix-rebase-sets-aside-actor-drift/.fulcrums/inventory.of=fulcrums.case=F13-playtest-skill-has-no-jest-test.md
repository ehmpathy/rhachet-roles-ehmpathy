# F13 — the playtest harness: a jest test of its own, or none

## .the fork
- (a) no jest test for `.agent/repo=.this/role=any/skills/playtest.rebase.unstaged.sh`; the paths it walks are each proven by `git.branch.rebase.unstaged.integration.test.ts`
- (b) add a jest `.integration.test.ts` that runs the playtest per `--path` and snapshots it

## .taken
(a). the harness is a byhand aid for the verification stone: it prints a real run so a reviewer can read it. every path it walks (E1–E6, E18, E19, E35) is a case in the unstaged suite with asserts and a snapshot. a test of the harness would run the same skill twice and prove the harness's own print, not the skill.

jest's `testMatch` excludes `**/.agent/**` (`jest.integration.config.ts`), so a collocated test would never run in ci; to place it in `src/` would test a dev aid from the shipped tree. the repo's other `repo=.this` skills (`cicd.action.act.sh`, `show.claude.debug.sh`) carry none either.

## .rework
clean: (b) is one additive test file plus a `testMatch` line.

## .confidence
80%. `rule.require.jest-tests-for-skills` scopes "any executable in `skills/`"; read literally, it covers this file.

## .verdict
open: disputed at 5.3 (repo-rules, nitpick 2).

## .where
`.agent/repo=.this/role=any/skills/playtest.rebase.unstaged.sh`, `jest.integration.config.ts` (testMatch).
