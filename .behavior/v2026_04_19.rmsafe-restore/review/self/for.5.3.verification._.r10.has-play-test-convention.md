# self-review: has-play-test-convention (r10)

## deeper review of test convention

### I examined the repo test structure

searched for `.play.` test files:
- `glob: **/*.play.test.ts` → no matches
- `glob: **/*.play.integration.test.ts` → no matches

### I examined the jest config

this repo has two jest configs:
- `jest.unit.config.ts` - runs `.test.ts` files
- `jest.integration.config.ts` - runs `.integration.test.ts` files

no separate "play" test runner exists.

### why the fallback convention is correct

the guide says:
> "if not supported, is the fallback convention used?"

fallback convention = put journey tests in `.integration.test.ts`

my test file uses this fallback:
- file: `rmsafe.integration.test.ts`
- location: same directory as skill (`claude.tools/`)
- structure: given/when/then (BDD pattern)

### consistency with peer skills

| skill | test file |
|-------|-----------|
| cpsafe | cpsafe.integration.test.ts |
| mvsafe | mvsafe.integration.test.ts |
| globsafe | globsafe.integration.test.ts |
| grepsafe | grepsafe.integration.test.ts |
| **rmsafe** | **rmsafe.integration.test.ts** |

all use `.integration.test.ts` - consistent.

### why .play. would be wrong here

if I named it `rmsafe.play.integration.test.ts`:
- it would not match jest config pattern
- tests would not run
- breaks repo convention

## conclusion

fallback convention used correctly.
no `.play.` suffix because repo does not support it.
file matches peer skill test conventions.
