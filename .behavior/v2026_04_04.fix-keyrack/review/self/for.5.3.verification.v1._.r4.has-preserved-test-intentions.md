# self-review: has-preserved-test-intentions (r4)

## question: did i preserve test intentions?

### tests touched

1. **keyrack.ehmpath.integration.test.ts** — assertions changed
2. **git.commit.push.integration.test.ts** — token name changed in fixtures
3. **git.commit.set.integration.test.ts** — token name changed in references
4. **git.release.*.integration.test.ts** — token name changed in references
5. **git.branch.rebase.take.integration.test.ts** — unrelated (lock refresh feature)

### analysis per test file

#### keyrack.ehmpath.integration.test.ts

**before (git show main:...keyrack.ehmpath.integration.test.ts):**
```typescript
expect(first.stdout).toContain('keyrack: init for owner ehmpath');
expect(first.stdout).toContain('key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: configure...');
expect(first.exitCode).toBe(0);
```

**after (current):**
```typescript
expect(first.stdout).toContain('keyrack: init for owner ehmpath');
expect(first.stdout).toContain('fill keys from keyrack.yml');
expect(first.stdout).toContain('keyrack fill complete');
expect(first.exitCode).toBe(0);
```

**before intention:** verify init outputs "keyrack: init for owner ehmpath" + "key X: configure..." + exit 0

**after intention:** verify init outputs "keyrack: init for owner ehmpath" + "fill keys from keyrack.yml" + "keyrack fill complete" + exit 0

**is intention preserved?** yes — both verify "keyrack init works and fills keys"

**why message changed:** implementation changed from manual REQUIRED_KEYS loop to `keyrack fill` command. the skill now delegates to keyrack fill instead of manual key iteration.

**did i weaken assertions?** no. the new assertions still verify:
- init runs successfully (exit 0) — unchanged
- init message appears — unchanged
- keys are filled (message appears) — different message, same intention
- idempotent on second run — verified separately in test

#### git.commit.push.integration.test.ts

**what changed:**
```diff
- EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN
+ EHMPATHY_SEATURTLE_GITHUB_TOKEN
```

**original intention:** verify git.commit.push uses the correct github token

**is intention preserved?** yes.

**why:** the token was renamed (requirement from vision.md to remove _PROD_ from prep env name). the test still verifies the same behavior — "push uses the github token from keyrack".

#### git.commit.set.integration.test.ts, git.release.*.integration.test.ts

same as above — token name changed, test intention preserved.

#### git.branch.rebase.take.integration.test.ts

**what changed:** significant — lock refresh auto-run feature

**is this related to keyrack?** no. this is a separate feature (auto-refresh lock files in rebase).

**review conclusion:** out of scope for keyrack behavior review.

### forbidden patterns check

| forbidden pattern | found? | evidence |
|-------------------|--------|----------|
| weaken assertions | no | new assertions verify same behaviors |
| remove test cases | no | all cases preserved, some added |
| change expected values to match broken output | no | changes match intentional code changes |
| delete tests that fail | no | no tests deleted |

### requirements change documentation

the keyrack.ehmpath.sh change from manual iteration to `keyrack fill` is documented:
- wish.md: "update guardBorder.onWebfetch.ts to use keyrack SDK"
- vision.md: "shell wrapper omits credential logic entirely"
- blueprint: "keyrack fill --owner ehmpath --env prep"

### conclusion

**why it holds:**

1. token rename = data change, not assertion weaken
2. keyrack.ehmpath.sh assertions changed because implementation changed (documented requirement)
3. git.branch.rebase.take tests are unrelated to keyrack behavior
4. no assertions were weakened to hide bugs
5. all test intentions preserved — verify credential flow works

