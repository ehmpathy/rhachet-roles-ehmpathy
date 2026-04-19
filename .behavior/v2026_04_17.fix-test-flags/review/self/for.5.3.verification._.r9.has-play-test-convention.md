# self-review r9: has-play-test-convention

## journey test file check

### test file added/modified

| file | suffix | convention? |
|------|--------|-------------|
| git.repo.test.play.integration.test.ts | `.play.integration.test.ts` | ✓ |

### verification

the journey test file uses `.play.integration.test.ts` suffix:
- `.play.` - indicates journey test
- `.integration.` - runs with integration runner
- `.test.ts` - standard test suffix

this matches the convention.

### location check

file is at: `src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.play.integration.test.ts`

this is the correct location - alongside the skill it tests.

### BDD structure check

the test file uses BDD conventions:
- `describe('git.repo.test')` - top-level describe
- `given('[caseN]')` - scenario context
- `when('[tN]')` - action
- `then('...')` - assertion

all journey tests follow the convention.

## summary

journey test files use correct `.play.integration.test.ts` suffix and BDD structure.
