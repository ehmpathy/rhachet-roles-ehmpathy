# self-review r10: has-play-test-convention (deep)

## question: should this PR have play tests?

### what is a play test?

play tests (`.play.test.ts`) verify user journeys - multi-step workflows that exercise the feature as a user would.

### does this fix require play tests?

**no.** this is a defect fix, not a new feature.

the fix:
1. adds `--literal` flag to four skills
2. adds hint when brackets cause zero matches

this is a single-step fix, not a multi-step journey. integration tests verify the flag works.

## what tests were added/modified?

### test files changed

```bash
git diff main --name-only | grep 'test.ts'
```

| file | type | change |
|------|------|--------|
| mvsafe.integration.test.ts | integration | added `--help` test |
| rmsafe.integration.test.ts | integration | added `--help` test |
| cpsafe.integration.test.ts | integration | added `--help` test |
| getMechanicRole.test.ts | unit | unrelated |
| git.repo.test.integration.test.ts | integration | unrelated |
| git.repo.test.play.integration.test.ts | play | unrelated |

### play test changes

the only play test file changed is `git.repo.test.play.integration.test.ts`, but this is unrelated to the fileops fix - it's part of concurrent work on git.repo.test skill.

## convention verification

### repo convention

```bash
git ls-files '*.play.*test.ts'
# result: src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.play.integration.test.ts
```

this repo uses `.play.integration.test.ts` suffix for play tests that run under the integration jest config.

### fileops skill extant tests

```bash
ls src/domain.roles/mechanic/skills/claude.tools/*.test.ts
```

```
cpsafe.integration.test.ts
globsafe.integration.test.ts
grepsafe.integration.test.ts
mkdirsafe.integration.test.ts
mvsafe.integration.test.ts
rmsafe.integration.test.ts
sedreplace.integration.test.ts
symlink.integration.test.ts
```

all fileops skills use `.integration.test.ts` suffix. no play tests exist for fileops skills.

### should fileops have play tests?

**no.** fileops skills are single-operation utilities:
- mvsafe: move file(s)
- rmsafe: remove file(s)
- cpsafe: copy file(s)
- globsafe: find files

these are not multi-step journeys. integration tests verify the operations work.

## checklist

- [x] are journey tests in the right location? (not applicable - no journeys)
- [x] do they have the `.play.` suffix? (not applicable - no journeys)
- [x] is fallback convention used? (not applicable - no journeys)

## why it holds

1. **defect fix:** this PR fixes a bug, not adds a journey
2. **single operation:** `--literal` flag is a single-step fix
3. **integration coverage:** extant tests verify flag parse, glob bypass, operations
4. **repo convention:** fileops skills use `.integration.test.ts`, not `.play.test.ts`
5. **no journey:** a file move is not a multi-step workflow

## conclusion

play test convention check passes:
- no play tests required for this defect fix
- no play tests added
- extant tests use correct `.integration.test.ts` convention
