# handoff: git.repo.get

**date**: 2026-03-17
**branch**: vlad/git.repo.get

---

## completed

### multi-repo search
- `files --repos 'org/*' --words 'pattern'` — search files with content across repos
- `lines --repos 'org/*' --words 'pattern'` — search lines across repos
- default `*/*` when `--words` specified without `--in` or `--repos`

### extended regex support
- added `-E` flag to all `git grep` commands
- enables ERE patterns like `hello|world` (alternation)
- test coverage in case17 (24 tests total, all passing)

### tree structure termination
- fixed last items to use `└─` instead of `├─`

### permissions
- added multi-repo files search example to permissions.jsonc

---

## known issues: rhachet quoting bugs

### issue 1: shell metacharacters

**symptom**: `rhx git.repo.get files --words 'DomainEntity|DomainLiteral'` fails with:
```
/bin/bash: line 1: DomainLiteral: command not found
```

**root cause**: `node_modules/rhachet/dist/domain.operations/invoke/executeSkill.js` only quotes args with spaces, not shell metacharacters like `|`.

### issue 2: glob expansion

**symptom**: `rhx git.repo.get files --paths '**/*.test.ts'` expands the glob before reaching skill.

**workaround**: use simpler globs like `src/*.ts` instead of `**/*.ts`.

### fix needed (rhachet upstream)

```javascript
// current (broken)
.map((arg) => (arg.includes(' ') ? `"${arg}"` : arg))

// fix (quote any non-alphanumeric)
.map((arg) => (/[^a-zA-Z0-9_\-\.\/]/.test(arg) ? `"${arg}"` : arg))
```

**workarounds**: patterns work when calling the skill directly (tests pass), but may fail via `rhx`.

---

## pending

### playtest approval
```sh
rhx route.stone.set --stone 5.5.playtest.v1 --as approved
```

### commit quota
```sh
git.commit.uses set --quant N --push allow
```

### then commit + push
```sh
printf 'feat(skill): add git.repo.get multi-repo search and regex support

- add files/lines multi-repo search via --repos glob
- default to */* when --words specified without --in or --repos
- add -E flag to git grep for extended regex (|, +, etc)
- fix tree structure termination (last items use └─)
- 24 integration tests, all passing' | rhx git.commit.set -m @stdin --mode apply --push
```

---

## file changes

| file | change |
|------|--------|
| `src/.../git.repo.get/git.repo.get.operations.sh` | multi-repo search, -E flag |
| `src/.../git.repo.get/git.repo.get.integration.test.ts` | 24 tests (case17 = regex) |
| `src/.../git.repo.get/__snapshots__/*.snap` | 23 snapshots |
| `src/.../inits/init.claude.permissions.jsonc` | multi-repo example |
| `.behavior/.../2.1.criteria.blackbox.md` | multi-repo criteria |

---

## test status

```
24 passed, 24 total
23 snapshots
```

run: `npm run test:integration -- git.repo.get.integration.test.ts`

---

## playtest results (dogfooded 2026-03-17)

| step | command | result |
|------|---------|--------|
| 1 | repos --repos 'ehmpathy/*' | ✓ |
| 2 | repos --repos 'sql-*' | ✓ |
| 3 | files --in ehmpathy/domain-objects | ✓ |
| 4 | files --paths 'src/*.ts' | ✓ |
| 5 | lines --words 'DomainEntity' | ✓ |
| 6 | lines --radius 3 | ✓ |
| 7 | lines --paths 'package.json' | ✓ |
| 8 | repos 'nonexistent/*' | ✓ |
| 9 | lines --words 'NONEXISTENT' | ✓ |
| 10 | files --in unknown/repo | ✓ |
| 11 | repos (default */*) | ✓ |

all 11 playtest steps pass.
