# howto: debug bash syntax errors faster

## .what

when tests fail with exit code 2 and empty stdout, check stderr for syntax errors before investigating logic.

## .the pattern

symptoms:
- tests fail with exit code 2
- stdout is empty (no error messages printed)
- skill never reaches any output statements

diagnosis:
```typescript
// always capture stderr in integration tests
const result = spawnSync('bash', [skillPath, ...args], {
  cwd: tempDir,
  encoding: 'utf-8',
  stdio: ['pipe', 'pipe', 'pipe'],
});

// check stderr FIRST when debugging
console.log('stderr:', result.stderr);
console.log('stdout:', result.stdout);
console.log('status:', result.status);
```

## .root cause

bash `set -euo pipefail` causes shell to exit immediately on syntax error — before any output statements run. exit code 2 from bash indicates syntax error.

## .common bash syntax traps

### regex with parentheses

```bash
# 🚫 broken — `)` inside [^)] confuses bash
if [[ "$HEADER" =~ ^[a-z]+\(([^)]+)\): ]]; then

# ✓ use sed instead
SCOPE=$(echo "$HEADER" | sed -n 's/^[a-z]*(\([^)]*\)):.*/\1/p')
```

### character classes with special chars

```bash
# 🚫 broken — `]` and `)` need special handling in []
if [[ "$x" =~ [^)]+]]; then

# ✓ escape or use different approach
if [[ "$x" =~ [^[:punct:]]+ ]]; then
```

## .faster debug flow

1. **check exit code** — if 2, suspect syntax error
2. **check stderr first** — bash syntax errors go to stderr
3. **look for line number** — bash error messages include line number
4. **validate skill** — run `bash -n skill.sh` to check syntax without executing

```bash
# validate syntax without running
bash -n git.commit.set.sh
```

## .prevention

1. use `bash -n` in CI to catch syntax errors before tests run
2. prefer sed/awk for complex regex instead of bash `[[ =~ ]]`
3. test regex patterns in isolation before embedding in shell code

## .see also

- howto.debug-hooks.[lesson].md
