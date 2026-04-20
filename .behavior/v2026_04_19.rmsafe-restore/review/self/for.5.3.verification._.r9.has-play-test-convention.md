# self-review: has-play-test-convention (r9)

## repo convention check

searched for `.play.test.ts` files: none found

this repo uses `.integration.test.ts` convention instead.

## extant test file convention

files in `src/domain.roles/mechanic/skills/claude.tools/`:
- cpsafe.integration.test.ts
- globsafe.integration.test.ts
- grepsafe.integration.test.ts
- mkdirsafe.integration.test.ts
- mvsafe.integration.test.ts
- **rmsafe.integration.test.ts** (my file)
- sedreplace.integration.test.ts
- symlink.integration.test.ts
- teesafe.integration.test.ts

all skill tests use `.integration.test.ts` suffix.

## my test file follows convention

file: `rmsafe.integration.test.ts`
location: `src/domain.roles/mechanic/skills/claude.tools/`

matches extant pattern exactly.

## why `.play.` not used

this repo does not have a separate "play test" runner.
all journey tests live in `.integration.test.ts` files.
the jest config runs these with `--testPathPatterns`.

## conclusion

test file follows repo convention (`.integration.test.ts`).
no `.play.` suffix because repo does not use that pattern.
