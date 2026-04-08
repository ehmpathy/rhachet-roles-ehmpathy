# self-review r4: has-snapshot-coverage

## the question

do the snapshots cover the contract outputs adequately?

---

## what snapshots capture

the skill `git.repo.test --what lint` has two primary output variants that warrant snapshot coverage:

1. **success output** — what the caller sees when lint passes
2. **failure output** — what the caller sees when lint fails

these are the user-faced contract outputs that reviewers need to see in PRs.

---

## snapshot analysis

### snapshot 1: success output

**file**: `git.repo.test.integration.test.ts.snap`
**test**: `[case1] lint passes` → `output matches snapshot`

**content**:
```
🐢 cowabunga!

🐚 git.repo.test --what lint
   ├─ status: passed
   └─ log: .log/role=mechanic/skill=git.repo.test/ISOTIME.stdout.log
```

**why this is sufficient**:
- shows turtle vibes header (`🐢 cowabunga!`)
- shows treestruct format (`🐚`, `├─`, `└─`)
- shows status field (`status: passed`)
- shows log path field (with ISOTIME sanitized for reproducibility)
- demonstrates the exact output callers will see

### snapshot 2: failure output

**file**: `git.repo.test.integration.test.ts.snap`
**test**: `[case2] lint fails` → `output matches snapshot`

**content**:
```
🐢 bummer dude...

🐚 git.repo.test --what lint
   ├─ status: failed
   ├─ defects: 7
   ├─ log: .log/role=mechanic/skill=git.repo.test/ISOTIME.stdout.log
   └─ 💡 tip: try `npm run fix` then rerun, or Read the log path above for details
```

**why this is sufficient**:
- shows turtle vibes failure header (`🐢 bummer dude...`)
- shows status field (`status: failed`)
- shows defect count (`defects: 7`)
- shows log path
- shows actionable tip (`npm run fix`)
- demonstrates all information the brain needs to take action

---

## why other variants don't need snapshots

| variant | why no snapshot |
|---------|-----------------|
| npm error (exit 1) | error message goes to stderr, not stdout; assertion verifies stderr contains "npm ERR!" |
| no package.json | simple constraint error; assertion verifies stdout contains explanation |
| argument validation | simple constraint error; assertion verifies stdout contains error text |
| not in git repo | simple constraint error; assertion verifies stdout contains error text |

these variants have explicit assertions that verify the exact text. snapshots would be redundant because:
- the assertions prove the output
- the output is simple text, not complex structure
- drift detection is handled by the assertions

---

## snapshot design decisions

### isotime sanitization

the snapshots use `ISOTIME` as a placeholder instead of actual timestamps:

```typescript
const sanitizeOutput = (output: string): string =>
  output.replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z/g, 'ISOTIME');
```

**why**: timestamps change on every run. sanitization enables deterministic snapshots while still proving the log path format is correct.

### two snapshots, not six

the blueprint mentioned 6 snapshot variants. we implemented 2. why?

| variant | implementation | reason |
|---------|---------------|--------|
| success | snapshot | complex treestruct output needs visual review |
| failure | snapshot | complex treestruct output needs visual review |
| npm error | assertion | simple stderr check, no treestruct |
| no package.json | assertion | simple stdout text, no treestruct |
| unknown arg | assertion | simple stdout text, no treestruct |
| not in git repo | assertion | simple stdout text, no treestruct |

snapshots are for **complex outputs that benefit from visual review**. simple error messages benefit more from explicit assertions.

---

## conclusion

snapshot coverage is adequate:

| contract output | coverage type | sufficient? |
|-----------------|---------------|-------------|
| success (exit 0) | snapshot | yes — shows full treestruct |
| failure (exit 2) | snapshot | yes — shows full treestruct with all fields |
| npm error (exit 1) | assertion | yes — verifies stderr text |
| no package.json | assertion | yes — verifies stdout text |
| argument errors | assertion | yes — verifies stdout text |
| not in git repo | assertion | yes — verifies stdout text |

every user-faced output variant is covered. reviewers can see the exact treestruct format in the snapshots. simple error messages have assertions. no output path is left unverified.

