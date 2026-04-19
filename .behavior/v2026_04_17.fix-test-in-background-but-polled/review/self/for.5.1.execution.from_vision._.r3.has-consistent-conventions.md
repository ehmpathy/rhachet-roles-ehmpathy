# self-review: has-consistent-conventions

reviewed for name and pattern consistency.

## name conventions

### hook file name

extant pattern: `pretooluse.forbid-{what}.sh`
- `pretooluse.forbid-stderr-redirect.sh`
- `pretooluse.forbid-suspicious-shell-syntax.sh`
- `pretooluse.forbid-sedreplace-special-chars.sh`
- `pretooluse.forbid-terms.gerunds.sh`
- `pretooluse.forbid-tmp-writes.sh`
- `pretooluse.forbid-planmode.sh`

ours: `pretooluse.forbid-test-background.sh`

**verdict:** matches pattern. `forbid-{what}` where what is `test-background`.

### test file name

extant pattern: `{hook}.test.sh`
- `pretooluse.forbid-stderr-redirect.test.sh`
- `pretooluse.forbid-suspicious-shell-syntax.test.sh`

ours: `pretooluse.forbid-test-background.test.sh`

**verdict:** matches pattern.

### variable names

extant pattern: SCREAMING_SNAKE for bash vars
- `STDIN_INPUT`
- `COMMAND`
- `TOOL_NAME`

ours:
- `STDIN_INPUT`
- `TOOL_NAME`
- `RUN_IN_BACKGROUND`
- `COMMAND`
- `IS_TEST_SKILL`

**verdict:** matches pattern.

### comment style

extant pattern: lowercase, no period at end
- `# read JSON from stdin`
- `# extract command from stdin JSON`

ours:
- `# read JSON from stdin (Claude Code passes input via stdin)`
- `# extract tool name`
- `# check if command is rhx git.repo.test...`

**verdict:** matches pattern.

### error message style

extant pattern: emoji + description + guidance
```
🛑 BLOCKED: Command contains '2>&1' (stderr redirect to stdout).

stderr redirect hides error messages...

Please remove '2>&1' from your command and try again.
```

ours:
```
🛑 BLOCKED: git.repo.test must run in foreground

background + poll wastes tokens...

fix: remove run_in_background from your Bash tool call
```

**verdict:** matches pattern.

## summary

| convention | extant | ours | match |
|------------|--------|------|-------|
| file name | `pretooluse.forbid-{what}.sh` | same | yes |
| test name | `{hook}.test.sh` | same | yes |
| var names | SCREAMING_SNAKE | same | yes |
| comments | lowercase, no period | same | yes |
| error msg | emoji + desc + guidance | same | yes |

all name conventions match extant patterns.
