# self-review: has-critical-paths-identified

review of critical paths for git.repo.test experience reproductions.

---

## critical paths identified

| critical path | description | why critical |
|---------------|-------------|--------------|
| unit pass | `--what unit` runs and shows pass | most common mechanic action |
| unit fail | `--what unit` shows failure clearly | mechanic must know what failed |
| scope filter | `--scope pattern` filters correctly | mechanic iterates on specific tests |
| integration unlock | keyrack auto-unlocks | removes manual step |
| log capture | full output in .log/ | mechanic can diagnose failures |

---

## verification checklist

### are the happy paths marked as critical?

✓ yes. unit pass is the primary happy path, marked critical.

### for each critical path, why must it be frictionless?

| path | friction impact |
|------|-----------------|
| unit pass | mechanic loses confidence if pass isn't clear |
| unit fail | mechanic can't fix what they can't see |
| scope filter | mechanic wastes time on irrelevant tests |
| integration unlock | mechanic blocks on credential fumble |
| log capture | mechanic can't diagnose without full output |

### what happens if each critical path failed?

| path | failure mode | user impact |
|------|--------------|-------------|
| unit pass | shows confused output | mechanic unsure if tests passed |
| unit fail | hides failure detail | mechanic can't diagnose |
| scope filter | runs all tests | wastes time, noise |
| integration unlock | cryptic auth error | mechanic blocks |
| log capture | output lost | mechanic can't diagnose after the fact |

---

## pit of success review

### unit pass path

| attribute | status | notes |
|-----------|--------|-------|
| narrower inputs | ✓ | `--what unit` is explicit |
| convenient | ✓ | no extra flags required |
| expressive | ✓ | `--scope` allows target selection |
| failsafes | ✓ | logs captured on all outcomes |
| failfasts | ✓ | absent command fails with hint |
| idempotency | ✓ | rerun is safe |

### scope filter path

| attribute | status | notes |
|-----------|--------|-------|
| narrower inputs | ✓ | pattern is a string |
| convenient | ✓ | optional, runs all if absent |
| expressive | ✓ | jest pattern syntax available |
| failsafes | ✓ | no match → exit 2 with hint |
| failfasts | ✓ | detected before test run completes |
| idempotency | ✓ | rerun with different scope is safe |

### integration unlock path

| attribute | status | notes |
|-----------|--------|-------|
| narrower inputs | ✓ | implicit unlock, no input |
| convenient | ✓ | auto-unlock, no manual step |
| expressive | n/a | no variation needed |
| failsafes | ✓ | unlock failure → exit 1 with hint |
| failfasts | ✓ | unlock happens before tests |
| idempotency | ✓ | unlock is idempotent |

### log capture path

| attribute | status | notes |
|-----------|--------|-------|
| narrower inputs | n/a | automatic |
| convenient | ✓ | always captured |
| expressive | n/a | no variation |
| failsafes | ✓ | log dir created with .gitignore |
| failfasts | n/a | capture is background |
| idempotency | ✓ | each run gets new timestamp |

---

## issues found

none. critical paths are complete and pit of success attributes verified.

---

## non-issues confirmed

1. **unit fail path** — marked critical because mechanic must see failure detail. verified: exit 2 + stats + tip + log paths.

2. **log capture on success** — different from lint which only logs on error. verified: vision explicitly requires "log on success AND failure".

3. **keyrack implicit unlock** — could be unexpected, but alternative (manual unlock) is worse. verified: output shows "keyrack: unlocked ehmpath/test" so user sees it happened.

