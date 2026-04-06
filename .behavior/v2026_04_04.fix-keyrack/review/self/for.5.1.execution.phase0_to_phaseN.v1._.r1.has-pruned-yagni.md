# self-review: has-pruned-yagni

## summary

**verdict**: no YAGNI detected

all changes align with the prescribed scope from the blueprint.

## review

### prescribed scope (from blueprint)

1. add `XAI_API_KEY` to mechanic keyrack.yml
2. replace hardcoded apikeys.env with keyrack SDK in guardBorder.onWebfetch.ts
3. rename `EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN` → `EHMPATHY_SEATURTLE_GITHUB_TOKEN`
4. replace REQUIRED_KEYS array with `keyrack fill` in keyrack.ehmpath.sh

### actual changes (src/ only)

| file | change | in scope? |
|------|--------|-----------|
| `src/contract/cli/guardBorder.onWebfetch.ts` | keyrack SDK integration | ✅ yes (item 2) |
| `src/domain.roles/mechanic/keyrack.yml` | add XAI_API_KEY + rename | ✅ yes (items 1, 3) |
| `src/domain.roles/mechanic/inits/keyrack.ehmpath.sh` | replace REQUIRED_KEYS with keyrack fill | ✅ yes (item 4) |
| `src/domain.roles/mechanic/inits/keyrack.ehmpath.integration.test.ts` | update test expectations | ✅ yes (test for item 4) |
| `posttooluse.guardBorder.onWebfetch.sh` | remove apikeys.env source | ✅ yes (cleanup for item 2) |
| `keyrack.operations.sh` | token rename | ✅ yes (item 3) |
| `git.commit.push.sh` | token rename | ✅ yes (item 3) |
| `git.commit.push.integration.test.ts` | token rename | ✅ yes (test for item 3) |
| `git.commit.set.integration.test.ts` | token rename | ✅ yes (test for item 3) |
| `git.release.*.integration.test.ts` | token rename | ✅ yes (test for item 3) |
| `__test_assets__/keyrack-repo/.agent/keyrack.yml` | token rename | ✅ yes (fixture for item 3) |
| `git.branch.rebase.take` snapshot | rebase conflict resolution | ✅ necessary (from main merge) |

### extras check

**Q: was extra code added that was not explicitly requested?**

no. the blueprint enumerated:
- files to modify
- codepath changes
- test coverage updates

all changes match the blueprint. no "future flexibility" abstractions. no "while we're here" additions.

**Q: is this the minimum viable way to satisfy the requirement?**

yes. the implementation:
- uses keyrack SDK as prescribed
- removes only the hardcoded apikeys.env logic
- renames the token without additional refactor work
- updates tests to match new behavior

**Q: did we add features "while we're here"?**

no. the only changes outside the 4 prescribed items are:
- test fixture updates (required for tests to pass)
- snapshot regeneration (required for CI)
- rebase conflict resolution (required to merge)

all are necessary, not optional.

## conclusion

implementation is minimal and aligned with scope. no YAGNI detected.
