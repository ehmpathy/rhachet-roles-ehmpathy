# self-review r6: has-contract-exhaustiveness

## the question

is every user-faced contract output path covered by tests with snapshots or assertions?

---

## contract definition

the skill `git.repo.test --what lint` has one contract:

**input**: `rhx git.repo.test --what lint [--when hook.onStop]`
**outputs**: varies by scenario (see below)

---

## exhaustive output path analysis

### path 1: lint passes (exit 0)

| aspect | coverage |
|--------|----------|
| exit code | assertion: `expect(result.exitCode).toBe(0)` |
| stdout format | snapshot: treestruct with success vibes |
| stderr | assertion: `expect(result.stderr).toBe('')` |
| log file created | assertion: file extant check |

**test location**: [case1] lines 86-163

### path 2: lint fails (exit 2)

| aspect | coverage |
|--------|----------|
| exit code | assertion: `expect(result.exitCode).toBe(2)` |
| stdout format | snapshot: treestruct with failure vibes |
| defect count | assertion: `expect(result.stdout).toContain('defects: 7')` |
| log path | assertion: `expect(result.stdout).toContain('.log/')` |
| tip | assertion: `expect(result.stdout).toContain('npm run fix')` |
| stderr | assertion: `expect(result.stderr).toBe('')` |

**test location**: [case2] lines 166-266

### path 3: npm malfunction (exit 1)

| aspect | coverage |
|--------|----------|
| exit code | assertion: `expect(result.exitCode).toBe(1)` |
| stderr | assertion: `expect(result.stderr).toContain('npm ERR!')` |

**test location**: [case3] lines 269-294

### path 4: no package.json (exit 2)

| aspect | coverage |
|--------|----------|
| exit code | assertion: `expect(result.exitCode).toBe(2)` |
| stdout | assertion: `expect(result.stdout).toContain('no package.json')` |

**test location**: [case4] lines 297-318

### path 5: --what omitted (exit 2)

| aspect | coverage |
|--------|----------|
| exit code | assertion: `expect(result.exitCode).toBe(2)` |
| stdout | assertion: `expect(result.stdout).toContain('--what is required')` |

**test location**: [case7] lines 406-420

### path 6: --what invalid value (exit 2)

| aspect | coverage |
|--------|----------|
| exit code | assertion: `expect(result.exitCode).toBe(2)` |
| stdout | assertion: `expect(result.stdout).toContain("only 'lint'")` |

**test location**: [case7] lines 424-438

### path 7: not in git repo (exit 2)

| aspect | coverage |
|--------|----------|
| exit code | assertion: `expect(result.status).toBe(2)` |
| stdout | assertion: `expect(result.stdout).toContain('not in a git repository')` |

**test location**: [case8] lines 442-461

### path 8: log directory findsert

| aspect | coverage |
|--------|----------|
| log dir created | assertion: `expect(fs.existsSync(logDir)).toBe(true)` |
| .gitignore created | assertion: `expect(fs.existsSync(gitignorePath)).toBe(true)` |
| .gitignore content | assertion: `expect(content).toContain('*')` |

**test location**: [case5] lines 321-371

### path 9: log file content

| aspect | coverage |
|--------|----------|
| log file extant | assertion: file read succeeds |
| log content | assertion: `expect(logContent).toContain('7 problems')` |

**test location**: [case6] lines 374-401

---

## coverage matrix

| scenario | exit code | stdout | stderr | side effects |
|----------|-----------|--------|--------|--------------|
| lint passes | ✓ | ✓ snapshot | ✓ empty | ✓ log file |
| lint fails | ✓ | ✓ snapshot | ✓ empty | ✓ log file |
| npm error | ✓ | n/a | ✓ error | n/a |
| no package.json | ✓ | ✓ text | n/a | n/a |
| --what omitted | ✓ | ✓ text | n/a | n/a |
| --what invalid | ✓ | ✓ text | n/a | n/a |
| not in git repo | ✓ | ✓ text | n/a | n/a |
| log findsert | n/a | n/a | n/a | ✓ dir + gitignore |
| log content | n/a | n/a | n/a | ✓ file content |

---

## conclusion

every user-faced contract output path is covered:

- **9 distinct scenarios** tested
- **27 then blocks** with assertions
- **2 snapshots** for complex treestruct outputs
- **all exit codes** verified (0, 1, 2)
- **all stdout variants** verified (success, failure, errors)
- **all stderr variants** verified (empty, error)
- **all side effects** verified (log dir, gitignore, log content)

no output path is left unverified. the contract is exhaustively tested.

