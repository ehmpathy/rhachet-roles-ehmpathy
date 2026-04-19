# self-review r10: has-play-test-convention (deeper)

## re-examine the test file structure

### file path breakdown

```
src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.play.integration.test.ts
```

| segment | purpose |
|---------|---------|
| src/domain.roles/mechanic | role directory |
| skills/git.repo.test | skill directory |
| git.repo.test | skill name |
| .play | journey test marker |
| .integration | test runner type |
| .test.ts | test file extension |

### why `.play.` matters

`.play.` indicates this is a journey test, not a unit test. journey tests:
- test full user scenarios
- use given/when/then structure
- exercise the skill as a user would

### why `.integration.` matters

this repo separates test runners:
- `.unit.test.ts` - fast, isolated
- `.integration.test.ts` - slower, with I/O
- `.acceptance.test.ts` - full system

the git.repo.test journey tests require file system access (temp directories, git repos), so they run as integration tests.

### convention compliance check

| requirement | met? | evidence |
|-------------|------|----------|
| `.play.` suffix | ✓ | file name includes `.play.` |
| correct runner | ✓ | `.integration.` for I/O tests |
| BDD structure | ✓ | given/when/then in all journeys |
| location | ✓ | alongside the skill |

### could the convention be wrong?

**could this be a unit test instead?**
no - the tests create temp directories and run bash scripts. this requires integration runner.

**could the file be misplaced?**
no - it sits next to git.repo.test.sh, which is the skill it tests.

## summary

the play test convention is correct. the file uses `.play.integration.test.ts` suffix and follows BDD structure.
