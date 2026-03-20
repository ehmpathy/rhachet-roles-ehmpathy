# self-review: has-contract-output-variants-snapped (r6)

## review scope

for each new or modified public contract:
- is there a dedicated snapshot file?
- does the snapshot capture what the caller would actually see?
- does it exercise the success case?
- does it exercise error cases?
- does it exercise edge cases and variants?

---

## why it holds

### lock refresh contract — complete snapshot coverage

**contract:** `rhx git.branch.rebase lock refresh`

**snapshot file:** `git.branch.rebase.lock.integration.test.ts.snap`

verified via direct inspection of the snapshot file:

| snapshot key | output type | covers |
|--------------|-------------|--------|
| `[case1] pnpm-lock.yaml with pnpm` | success stdout | pnpm refresh |
| `[case2] package-lock.json with npm` | success stdout | npm refresh |
| `[case3] yarn.lock with yarn` | success stdout | yarn refresh |
| `[case4] no rebase in progress` | error stdout | guard: rebase check |
| `[case5] no lock file extant` | error stdout | guard: lock file check |
| `[case6] pnpm-lock but pnpm not installed` | error stdout | guard: pm availability |
| `[case7] yarn.lock but yarn not installed` | error stdout | guard: pm availability |
| `[case9] install fails` | error stdout | guard: install success |

**what the caller would see:** each snapshot captures the full stdout output with turtle vibes format. example from case1:

```
🐢 shell yeah!

🐚 git.branch.rebase lock refresh
   ├─ detected: pnpm
   ├─ run: pnpm install
   ├─ staged
   │  └─ pnpm-lock.yaml ✓
   └─ done
```

---

### take suggestion modification — complete snapshot coverage

**contract modification:** `rhx git.branch.rebase take` now shows suggestion for lock files

**snapshot file:** `git.branch.rebase.take.integration.test.ts.snap`

verified via direct inspection:

| snapshot key | output type | covers |
|--------------|-------------|--------|
| case1 (updated) | success stdout | includes suggestion |
| case12.t0 | success stdout | pnpm-lock suggestion |
| case12.t1 | success stdout | package-lock suggestion |
| case12.t2 | success stdout | yarn.lock suggestion |
| case13 | success stdout | multiple files, once |
| case14 | success stdout | non-lock, no suggestion |

**what the caller would see:** example from case12:

```
├─ lock taken, refresh it with: ⚡
│  └─ rhx git.branch.rebase lock refresh
```

---

### no blind spots

checked for absent variants:

| possible variant | covered? |
|------------------|----------|
| --help output | no — but this is a subsubcommand, help is at parent level |
| empty input | yes — case5 (no lock file) |
| invalid subcommand | yes — case10 (unknown subcommand) |

the --help case is handled by the parent `git.branch.rebase.sh` dispatcher, not by `lock.sh`. the lock subcommand only handles `refresh` and errors on unknown.

---

## conclusion

| contract | snapshot file | variants | coverage |
|----------|---------------|----------|----------|
| lock refresh | lock.integration.test.ts.snap | 9 | complete |
| take suggestion | take.integration.test.ts.snap | 6 | complete |

all public contract output variants have snapshot coverage. reviewers can see actual CLI output in PR diffs.

