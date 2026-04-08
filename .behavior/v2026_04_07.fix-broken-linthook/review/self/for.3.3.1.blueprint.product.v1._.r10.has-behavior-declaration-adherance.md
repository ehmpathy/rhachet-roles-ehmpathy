# self-review r10: has-behavior-declaration-adherance

## deeper adherence review

paused. re-read blueprint with fresh eyes, line by line.

---

## potential misinterpretation check

### 1. "only lint supported" — is this correct?

**wish says**: "create a new skill that's run, e.g., `rhx git.repo.test --what lint`"

**vision says**: "--what required. which test to run."

**vision usecases**: only mentions `--what lint`

**vision future section**: "rhx git.repo.test --what types / --what unit"

**blueprint says**: "[+] validate --what lint (only lint supported)"

**question**: is "only lint supported" correct, or should we support types/unit/format now?

**analysis**: the vision mentions future values (`--what types`, `--what unit`) but all criteria test only `--what lint`. the wish says "e.g." which implies lint is the example. the future section says "future — defer to later iteration" for `--what all`.

**verdict**: "only lint supported" is correct for this iteration. future values are deferred.

### 2. stderr handle — re-examination

**vision contract**:
```
skill stderr:   empty
```

**criteria usecase.1**: "stderr is empty"
**criteria usecase.2**: "stderr is empty"
**criteria usecase.3**: "stderr captures the npm error"

**blueprint test section**:
- usecase.3: "exit 1, stderr contains error"

**question**: does blueprint correctly distinguish normal vs malfunction stderr?

**blueprint contracts section**:
```
stderr: empty (lint output goes to log file)
```

**issue found**: blueprint contracts section says "stderr: empty" but test usecase.3 expects stderr to contain error.

**resolution**: the contracts section describes normal operation. the test section correctly handles the malfunction case. the implementation will:
- normal operation (pass/fail): stderr empty
- malfunction (npm error): stderr contains error

this is the correct behavior. the contracts section could be more explicit but the test coverage is correct.

**verdict**: adheres. test coverage correctly specifies different behavior for malfunction.

### 3. log file name — re-examination

**vision says**:
```
.log/role=mechanic/skill=git.repo.test/{isotime}.{stdout,stderr}.log
```

**blueprint says**:
```
.log/role=mechanic/skill=git.repo.test/{isotime}.stdout.log
.log/role=mechanic/skill=git.repo.test/{isotime}.stderr.log
```

**question**: is the blueprint interpretation correct?

**analysis**: vision uses brace expansion `{stdout,stderr}` which expands to two files. blueprint lists them explicitly. this is correct.

**verdict**: adheres.

### 4. defect count format — not specified

**criteria says**: "stdout shows defect count"

**blueprint says**: "parse defect count (if lint failed)"

**question**: how should defect count be parsed? what format?

**analysis**: eslint outputs a summary line like "X problems (Y errors, Z warnings)". the blueprint says "parse defect count" which implies extract the number. exact parse logic is implementation detail.

**verdict**: adheres. parse logic is implementation detail.

### 5. isotime format — not specified

**vision says**: `2026-04-07T14-32-01Z`

**blueprint says**: `{isotime}` placeholder

**question**: is the isotime format correct?

**analysis**: vision shows format with hyphens instead of colons (filesystem-safe). blueprint uses placeholder. implementation will use this format.

**verdict**: adheres. format is shown in vision example.

### 6. hook order — verification

**blueprint says**:
```
getMechanicRole.ts
└─ hooks.onBrain.onStop
   ├─ [○] pnpm run --if-present fix
   └─ [+] rhx git.repo.test --what lint
```

**question**: is hook order correct? should lint run before or after fix?

**wish says**: "instead, we should create a new skill"

**analysis**: fix runs first makes sense — auto-fix what can be fixed, then check what remains. this is the correct order.

**verdict**: adheres. fix before lint is correct.

### 7. permission pattern — verification

**blueprint says**:
```jsonc
"Bash(npx rhachet run --skill git.repo.test:*)",
"Bash(rhx git.repo.test:*)"
```

**extant pattern** (from init.claude.permissions.jsonc):
```jsonc
"Bash(npx rhachet run --skill show.gh.test.errors:*)",
```

**question**: is the permission pattern correct?

**analysis**: follows extant pattern with `:*` suffix for wildcard args.

**verdict**: adheres to extant convention.

---

## final check: vision output format

re-read vision example output:

```
🐢 bummer dude...

🐚 git.repo.test --what lint
   ├─ status: failed
   ├─ defects: 7
   ├─ log: .log/role=mechanic/skill=git.repo.test/2026-04-07T14-32-01Z.stderr.log
   └─ tip: try `npm run fix` then rerun, or Read the log path above for details
```

**check each element**:

1. "🐢 bummer dude..." — blueprint: `print_turtle_header` ✓
2. "🐚 git.repo.test --what lint" — blueprint: `print_tree_start` ✓
3. "status: failed" — blueprint: `print_tree_branch (status, ...)` ✓
4. "defects: 7" — blueprint: `print_tree_branch (..., defects, ...)` ✓
5. "log: ..." — blueprint: `print_tree_branch (..., log)` ✓
6. "tip: try `npm run fix`..." — blueprint: `print_tip (npm run fix)` ✓

**verdict**: all elements covered.

---

## summary

| adherence check | result |
|----------------|--------|
| only lint supported | ✓ correct for this iteration |
| stderr normal vs malfunction | ✓ test coverage correct |
| log file format | ✓ matches vision |
| defect count | ✓ parse is impl detail |
| isotime format | ✓ shown in vision |
| hook order | ✓ fix before lint |
| permission pattern | ✓ follows convention |
| output format | ✓ all elements covered |

## verdict

blueprint adheres to the behavior declaration. no misinterpretations found. all spec elements are correctly represented.
