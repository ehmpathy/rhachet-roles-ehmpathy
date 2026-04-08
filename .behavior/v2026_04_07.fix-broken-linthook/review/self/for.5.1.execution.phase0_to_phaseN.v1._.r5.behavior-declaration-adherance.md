# self-review r5: behavior-declaration-adherance

## re-read with fresh eyes

paused. re-read vision, criteria, blueprint. then compared each file changed in this pr line-by-line.

## files changed in this pr

from git status:
1. `src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.sh`
2. `src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.integration.test.ts`
3. `src/domain.roles/mechanic/getMechanicRole.ts` (onStop hook)
4. `src/domain.roles/mechanic/inits/init.claude.permissions.jsonc`

## vision adherance

### vision: "exit code 2 that forces brain to address broken lint issues"

from git.repo.test.sh line 196:
```bash
exit 2
```

**verified**: exit 2 emitted on lint failure. matches vision.

### vision: "stdout summary only, not raw lint output"

from git.repo.test.sh line 138:
```bash
npm run test:lint > "$STDOUT_LOG" 2> "$STDERR_LOG" || NPM_EXIT_CODE=$?
```

raw npm output redirected to log files. skill stdout shows only turtle vibes summary.

**verified**: matches vision.

### vision: "consistent vibes"

from git.repo.test.sh line 169:
```bash
print_turtle_header "cowabunga!"
```

uses print_turtle_header and print_tree_branch from output.sh.

**verified**: matches vision.

### vision: "save tokens"

output is approximately 5-7 lines:
```
🐢 bummer dude...

🐚 git.repo.test --what lint
   ├─ status: failed
   ├─ defects: 7
   ├─ log: .log/role=mechanic/skill=git.repo.test/2026-04-07T14-32-01Z.stdout.log
   └─ 💡 tip: try `npm run fix` then rerun, or Read the log path above for details
```

versus raw eslint output which can be 100+ lines.

**verified**: matches vision intent.

## criteria adherance

### usecase.1: lint passes

| criterion | implementation | verified |
|-----------|----------------|----------|
| exit code 0 | line 173: `exit 0` | ✓ |
| turtle success summary | line 169: `print_turtle_header "cowabunga!"` | ✓ |
| status: passed | line 171: `print_tree_branch "status" "passed"` | ✓ |
| log path shown | line 172: `echo "   └─ log: $REL_STDOUT_LOG"` | ✓ |
| stderr empty | no output to stderr in success path | ✓ |

### usecase.2: lint fails

| criterion | implementation | verified |
|-----------|----------------|----------|
| exit code 2 | line 196: `exit 2` | ✓ |
| turtle failure summary | line 190: `print_turtle_header "bummer dude..."` | ✓ |
| status: failed | line 192: `print_tree_branch "status" "failed"` | ✓ |
| defect count | line 193: `print_tree_branch "defects" "$DEFECT_COUNT"` | ✓ |
| log path shown | line 194: `print_tree_branch "log" "$REL_STDOUT_LOG"` | ✓ |
| npm run fix tip | line 195: tip text shown | ✓ |
| stderr empty | no output to stderr in constraint path | ✓ |

### usecase.3: npm error (malfunction)

| criterion | implementation | verified |
|-----------|----------------|----------|
| exit code 1 | line 187: `exit 1` | ✓ |
| error summary | line 179-184: turtle header + tree output | ✓ |
| stderr has error | line 186: `cat "$STDERR_LOG" >&2` | ✓ |

### usecase.4: no package.json

| criterion | implementation | verified |
|-----------|----------------|----------|
| exit code 2 | line 110: `exit 2` | ✓ |
| explains absent package.json | lines 107-109: error message | ✓ |

note: criteria says exit 2 for "constraint" (user must fix). this is correct — no package.json is a constraint, not a malfunction.

### usecase.5: log directory findsert

| criterion | implementation | verified |
|-----------|----------------|----------|
| log dir created | line 117: `mkdir -p "$LOG_PATH"` | ✓ |
| .gitignore created | lines 120-123: findsert pattern | ✓ |
| self-ignore pattern | line 122: `echo "*"` (ignores all in dir) | ✓ |

### usecase.6: --when context hint

| criterion | implementation | verified |
|-----------|----------------|----------|
| behavior identical with --when | line 48-50: parses but does not use | ✓ |

the skill parses --when but does not alter behavior. future use only.

### usecase.7: log file content

| criterion | implementation | verified |
|-----------|----------------|----------|
| log has npm stdout | line 138: `> "$STDOUT_LOG"` | ✓ |
| log has npm stderr | line 138: `2> "$STDERR_LOG"` | ✓ |
| isotime in filename | line 128-130: `${ISOTIME}.stdout.log` | ✓ |

## blueprint adherance

### file structure

| blueprint | actual | matches |
|-----------|--------|---------|
| `skills/git.repo.test/git.repo.test.sh` | created at this path | ✓ |
| `skills/git.repo.test/git.repo.test.integration.test.ts` | created at this path | ✓ |
| `getMechanicRole.ts` hooks.onStop | modified to use git.repo.test | ✓ |
| `init.claude.permissions.jsonc` | permission added | ✓ |

### codepath implementation

| blueprint component | implementation location | verified |
|---------------------|------------------------|----------|
| parse args (--what, --when) | lines 35-68 | ✓ |
| validate --what lint | lines 82-87 | ✓ |
| validate git repo | lines 92-97 | ✓ |
| validate package.json | lines 104-111 | ✓ |
| findsert log directory | line 117 | ✓ |
| findsert .gitignore | lines 119-123 | ✓ |
| generate isotime filename | lines 128-130 | ✓ |
| run npm test:lint | line 138 | ✓ |
| capture stdout → log | line 138 `> "$STDOUT_LOG"` | ✓ |
| capture stderr → log | line 138 `2> "$STDERR_LOG"` | ✓ |
| parse defect count | lines 143-157 | ✓ |
| emit turtle vibes | lines 169-196 | ✓ |
| exit 0/1/2 | lines 173, 187, 196 | ✓ |

### hook replacement

blueprint says: replace `pnpm run --if-present fix` with `rhx git.repo.test --what lint`

from getMechanicRole.ts lines 107-111:
```typescript
onStop: [
  {
    command: './node_modules/.bin/rhx git.repo.test --what lint',
    timeout: 'PT60S',
  },
],
```

**verified**: old hook replaced (not added alongside).

### permissions

blueprint says add:
```jsonc
"Bash(npx rhachet run --skill git.repo.test:*)",
"Bash(rhx git.repo.test:*)"
```

from init.claude.permissions.jsonc lines 223-225:
```jsonc
// git.repo.test - run lint check
"Bash(npx rhachet run --skill git.repo.test:*)",
"Bash(rhx git.repo.test:*)",
```

**verified**: both permission patterns added with comment.

## test coverage verification

| usecase | test coverage |
|---------|---------------|
| usecase.1 (lint passes) | given '[case1] lint passes' — 5 then blocks | ✓ |
| usecase.2 (lint fails) | given '[case2] lint fails' — 7 then blocks | ✓ |
| usecase.3 (npm error) | given '[case3] npm error' — 3 then blocks | ✓ |
| usecase.4 (no package.json) | given '[case4] no package.json' — 2 then blocks | ✓ |
| usecase.5 (log dir findsert) | given '[case5] log directory findsert' — 3 then blocks | ✓ |
| usecase.6 (--when hint) | covered implicitly via all tests that accept --when | ✓ |
| usecase.7 (log content) | given '[case6] log file content' — 2 then blocks | ✓ |

## potential deviations found

none. implementation matches vision, criteria, and blueprint exactly.

## conclusion

every element of the behavior declaration is implemented correctly:
- vision goals: exit code 2, token-efficient summary, consistent vibes
- criteria usecases 1-7: all implemented and tested
- blueprint components: all files created/modified as specified
- hook replacement: old fix hook replaced with git.repo.test
- permissions: both patterns added

no deviations from the spec found.
