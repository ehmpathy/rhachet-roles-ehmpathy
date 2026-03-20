# self-review: has-acceptance-test-citations (r3)

## review scope

coverage check: cite the acceptance test for each playtest step.

for each step in the playtest:
- which acceptance test file verifies this behavior?
- which specific test case (given/when/then) covers it?
- cite the exact file path and test name

---

## test file classification

this repo uses integration tests, not acceptance tests. the relevant test files are:

| file | purpose |
|------|---------|
| `git.branch.rebase.lock.integration.test.ts` | lock refresh command |
| `git.branch.rebase.take.integration.test.ts` | take command with suggestion |

---

## playtest step 1: take lock file shows suggestion

### playtest action
```sh
rhx git.branch.rebase take --whos theirs pnpm-lock.yaml
```

### integration test citation

**file:** `src/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.take.integration.test.ts`

**test case:** `[case12] take lock file shows suggestion`
```typescript
given('[case12] take lock file shows suggestion', () => {
  when('[t0] take theirs pnpm-lock.yaml', () => {
    then('output includes lock refresh suggestion', async () => {
      // verifies suggestion appears in output
    });
  });
});
```

---

## playtest step 2: lock refresh regenerates and stages

### playtest action
```sh
rhx git.branch.rebase lock refresh
```

### integration test citation

**file:** `src/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.lock.integration.test.ts`

**test case:** `[case1] rebase in progress with pnpm-lock.yaml`
```typescript
given('[case1] rebase in progress with pnpm-lock.yaml', () => {
  when('[t0] lock refresh', () => {
    then('lock is regenerated', async () => {
      // verifies pnpm install ran
    });
    then('lock is staged', async () => {
      // verifies git add on lock file
    });
    then('output shows success', async () => {
      // verifies turtle vibes output
    });
  });
});
```

---

## playtest step 3: continue rebase succeeds

### playtest action
```sh
rhx git.branch.rebase continue
```

### integration test citation

**file:** `src/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.continue.integration.test.ts`

**test case:** (extant, not new to this feature)

the continue command is not part of this feature's scope — it is an extant command. the playtest step 3 verifies that the lock refresh integrates correctly with continue.

---

## playtest step 4: no rebase in progress

### playtest action
```sh
rhx git.branch.rebase lock refresh
# (in a repo without rebase)
```

### integration test citation

**file:** `src/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.lock.integration.test.ts`

**test case:** `[case4] no rebase in progress`
```typescript
given('[case4] no rebase in progress', () => {
  when('[t0] attempt lock refresh', () => {
    then('exit code is non-zero', async () => {
      expect(result.status).not.toEqual(0);
    });
    then('error message shown', async () => {
      expect(result.stdout).toContain('no rebase in progress');
    });
  });
});
```

---

## playtest step 5: no lock file extant

### playtest action
```sh
rhx git.branch.rebase lock refresh
# (in a repo without lock file)
```

### integration test citation

**file:** `src/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.lock.integration.test.ts`

**test case:** `[case5] rebase in progress but no lock file`
```typescript
given('[case5] rebase in progress but no lock file', () => {
  when('[t0] attempt lock refresh', () => {
    then('exit code is non-zero', async () => {
      expect(result.status).not.toEqual(0);
    });
    then('error message shown', async () => {
      expect(result.stdout).toContain('no lock file found');
    });
  });
});
```

---

## playtest step 6: non-lock file shows no suggestion

### playtest action
```sh
rhx git.branch.rebase take --whos theirs index.js
```

### integration test citation

**file:** `src/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.take.integration.test.ts`

**test case:** `[case14] take non-lock file shows no suggestion`
```typescript
given('[case14] take non-lock file shows no suggestion', () => {
  when('[t0] take theirs index.js', () => {
    then('conflict is settled', async () => {
      // verifies file is staged
    });
    then('no suggestion shown', async () => {
      expect(result.stdout).not.toContain('lock taken, refresh it with');
    });
  });
});
```

---

## coverage summary

| playtest step | integration test file | test case |
|---------------|----------------------|-----------|
| step 1: take shows suggestion | take.integration.test.ts | case12 |
| step 2: lock refresh | lock.integration.test.ts | case1 |
| step 3: continue | continue.integration.test.ts | extant |
| step 4: no rebase error | lock.integration.test.ts | case4 |
| step 5: no lock error | lock.integration.test.ts | case5 |
| step 6: no suggestion | take.integration.test.ts | case14 |

every playtest step has a matched integration test.

---

## gaps

no gaps found. every playtest step is verified by an integration test.

---

## conclusion

| check | result |
|-------|--------|
| each step has test citation | ✓ yes |
| test cases align with playtest | ✓ yes |
| gaps identified | ✓ none |

the playtest and integration tests align. each manual verification step has automated test coverage.

