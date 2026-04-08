# self-review r9: has-behavior-declaration-adherance

## adherence check

reviewed blueprint line by line to verify it matches the spec correctly.

---

## vision adherence

### vision says: summary output format

```
🐢 bummer dude...

🐚 git.repo.test --what lint
   ├─ status: failed
   ├─ defects: 7
   ├─ log: .log/role=mechanic/skill=git.repo.test/2026-04-07T14-32-01Z.stderr.log
   └─ tip: try `npm run fix` then rerun, or Read the log path above for details
```

**blueprint shows**:
```
├─ [+] emit turtle vibes summary
│  ├─ [←] source claude.tools/output.sh
│  ├─ [+] print_turtle_header (cowabunga/bummer)
│  ├─ [+] print_tree_start (git.repo.test --what lint)
│  ├─ [+] print_tree_branch (status, defects, log)
│  └─ [+] print_tip (npm run fix)
```

**adherence check**:
- header: "bummer dude..." → `print_turtle_header (cowabunga/bummer)` ✓
- root: "git.repo.test --what lint" → `print_tree_start (git.repo.test --what lint)` ✓
- branches: status, defects, log → `print_tree_branch (status, defects, log)` ✓
- tip: "try npm run fix" → `print_tip (npm run fix)` ✓

**verdict**: adheres to vision format.

### vision says: log file path

```
.log/role=mechanic/skill=git.repo.test/{isotime}.{stdout,stderr}.log
```

**blueprint shows**:
```
.log/role=mechanic/skill=git.repo.test/{isotime}.stdout.log
.log/role=mechanic/skill=git.repo.test/{isotime}.stderr.log
```

**adherence check**: blueprint uses `.stdout.log` and `.stderr.log` suffixes. vision uses `{stdout,stderr}` which expands to these two files.

**verdict**: adheres correctly.

### vision says: exit codes

```
exit code: 0 = pass, 2 = constraint (defects found)
```

**blueprint shows**:
```
exit code:
  0 = passed
  1 = malfunction (npm error)
  2 = constraint (lint failed)
```

**adherence check**: vision mentions 0 and 2. blueprint adds 1 for npm errors. this is correct — the vision focused on success/failure, blueprint adds error case.

**verdict**: adheres and extends correctly.

---

## criteria adherence

### usecase.2 says: defect count

```
then(stdout shows defect count)
```

**blueprint shows**:
```
├─ [+] parse defect count (if lint failed)
...
├─ [+] print_tree_branch (status, defects, log)
```

**adherence check**: blueprint parses defect count and includes in output.

**verdict**: adheres.

### usecase.2 says: tip

```
then(stdout shows tip to try `npm run fix`)
```

**blueprint shows**:
```
└─ [+] print_tip (npm run fix)
```

**question**: vision says "try `npm run fix` then rerun, or Read the log path above for details" — is full tip in blueprint?

**blueprint contracts section**:
```
stdout: turtle vibes summary
  ...
  └─ tip (npm run fix)
```

**issue**: the tip in vision is more detailed than blueprint specifies. vision says "try `npm run fix` then rerun, or Read the log path above for details".

**resolution**: this is implementation detail. the blueprint captures the essence "tip = npm run fix". the exact text is an impl choice. no blueprint change needed.

**verdict**: adheres (essence captured, text is impl detail).

### usecase.5 says: self-ignore

```
then(.gitignore contains self-ignore pattern)
```

**blueprint shows**:
```
├─ [+] findsert .gitignore with self-ignore
...
.log/role=mechanic/skill=git.repo.test/.gitignore  # findsert, self-ignore
```

**adherence check**: blueprint explicitly mentions self-ignore.

**verdict**: adheres.

### usecase.3 says: stderr captures npm error

```
then(stderr captures the npm error)
```

**blueprint shows**:
```
usecase.3 = npm error
├─ given: temp repo with broken test:lint command
├─ when: rhx git.repo.test --what lint
└─ then: exit 1, stderr contains error
```

**question**: wait — the vision says "skill stderr: empty" but criteria says "stderr captures the npm error".

**check vision**:
```
outputs:
  skill stdout:   turtle vibes summary
  skill stderr:   empty
```

**check criteria usecase.3**:
```
then(stderr captures the npm error)
```

**potential conflict**: vision says stderr empty, criteria says stderr captures error for npm error case.

**resolution**: for usecase.3 (npm error / malfunction), the behavior is different from usecase.1/2 (pass/fail). when npm itself errors, it makes sense for stderr to contain that error. the "stderr empty" in vision applies to normal operation (pass/fail), not malfunction.

**blueprint adherence**: the test coverage says `then: exit 1, stderr contains error` which matches criteria. this is correct behavior for malfunction case.

**verdict**: adheres. the blueprint correctly handles malfunction differently from normal operation.

---

## hook registration adherence

### wish says: "add to mechanic onStop hooks"

**blueprint shows**:
```
getMechanicRole.ts
└─ hooks.onBrain.onStop
   ├─ [○] pnpm run --if-present fix
   └─ [+] rhx git.repo.test --what lint
```

**adherence check**: blueprint adds hook after extant fix hook.

**verdict**: adheres.

---

## summary

| spec element | blueprint adherence |
|-------------|---------------------|
| output format | ✓ matches vision |
| log file path | ✓ matches vision |
| exit codes | ✓ extends correctly |
| defect count | ✓ matches criteria |
| tip message | ✓ essence captured |
| self-ignore | ✓ explicit |
| malfunction stderr | ✓ correctly different |
| hook placement | ✓ after fix hook |

## verdict

blueprint adheres to the behavior declaration. the apparent conflict between "stderr empty" and "stderr captures error" is resolved by context — normal operation vs malfunction have different behaviors, both correctly specified in the blueprint.
