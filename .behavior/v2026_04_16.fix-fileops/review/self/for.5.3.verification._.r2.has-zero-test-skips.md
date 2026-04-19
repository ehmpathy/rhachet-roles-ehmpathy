# self-review r2: has-zero-test-skips (deep)

## scope of verification

this PR modifies:
- mvsafe.sh, rmsafe.sh, cpsafe.sh, globsafe.sh (prod code)
- git.repo.test.integration.test.ts (flaky test fix)

## skip search - modified test file

```bash
grep -E '\.skip\(|\.only\(' src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.integration.test.ts
```

**result:** no matches

## skip search - related test files

```bash
grep -E '\.skip\(|\.only\(' src/domain.roles/mechanic/skills/claude.tools/*.test.ts
```

**result:** no matches (fileops integration tests clean)

## skip search - entire repo

```bash
grep -rE '\.skip\(|\.only\(' src/ --include='*.test.ts' -l
```

**result:** 18 files with skips found, but:
- none are in `claude.tools/` (fileops skills)
- none are in files modified by this PR
- all are in unrelated `.scratch/` or other feature directories

## why pre-extant skips are not this PR's scope

the 18 files with skips are:
1. `.scratch/` directories (archived/deprecated code)
2. librarian skills (brief.condense, brief.compress)
3. ecologist skills (distill)
4. other unrelated features

**these are not related to our fileops changes.** per verification stone:
- we must fix failures **in our scope**
- pre-extant skips in unrelated code are out of scope

## credential bypasses

searched for:
```bash
grep -E 'if.*!.*cred|if.*!.*key.*return' src/domain.roles/mechanic/skills/claude.tools/*.test.ts
```

**result:** no matches

## summary

- [x] no `.skip()` in modified files
- [x] no `.only()` in modified files
- [x] no credential bypasses in fileops tests
- [x] pre-extant skips are in unrelated code (out of scope)

zero skips in our scope.
