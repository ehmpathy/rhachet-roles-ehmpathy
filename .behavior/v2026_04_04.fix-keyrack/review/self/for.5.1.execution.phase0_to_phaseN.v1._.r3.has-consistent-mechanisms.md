# self-review: has-consistent-mechanisms (r3)

## deeper inspection

the prior review covered interface consistency (SDK vs CLI). this review digs into code structure and patterns.

## mechanism-by-mechanism review

### 1. keyrack.get() SDK usage

**code added:**
```typescript
const keyGrant = await keyrack.get({
  for: { key: 'XAI_API_KEY' },
  owner: 'ehmpath',
  env: 'prep',
});

if (keyGrant.attempt.status !== 'granted') {
  console.error(keyGrant.emit.stdout);
  process.exit(2);
}

process.env.XAI_API_KEY = keyGrant.attempt.grant.key.secret;
```

**pattern check:**

| aspect | question | answer |
|--------|----------|--------|
| error output | what do other keyrack callers use? | bash: custom error messages |
| error output | what does SDK provide? | `result.emit.stdout` — formatted message |
| error output | which did we use? | `result.emit.stdout` ✅ (wisher specified) |
| exit code | what do hooks use for block? | exit 2 |
| exit code | what did we use? | exit 2 ✅ |
| secret path | what's the SDK shape? | `attempt.grant.key.secret` |
| secret path | what did we use? | `attempt.grant.key.secret` ✅ |

**verdict:** consistent with SDK contract.

### 2. keyrack fill in keyrack.ehmpath.sh

**code added:**
```bash
./node_modules/.bin/rhachet keyrack fill "${FILL_ARGS[@]}"
```

**pattern check:**

| aspect | question | answer |
|--------|----------|--------|
| path | how do other operations call rhachet? | `$repo_root/node_modules/.bin/rhachet` or `./node_modules/.bin/rhachet` |
| path | which did we use? | `./node_modules/.bin/rhachet` ✅ (matches cwd context) |
| flags | what flags does fill accept? | `--owner`, `--prikey`, `--env`, `--key`, `--refresh` |
| flags | which did we use? | all appropriate flags ✅ |

**verdict:** consistent with shell executable patterns.

### 3. apikeys.env removal

**code removed:**
```bash
if [[ -z "${XAI_API_KEY+x}" && -f ~/.config/rhachet/apikeys.env ]]; then
  source ~/.config/rhachet/apikeys.env
fi
```

**pattern check:**

| aspect | question | answer |
|--------|----------|--------|
| mechanism | do other hooks source env files? | no — other hooks delegate to TypeScript or CLI |
| mechanism | is this pattern used elsewhere? | no — this was the only instance |

**verdict:** removal is correct. no pattern violation.

### 4. token rename via sedreplace

**pattern check:**

| aspect | question | answer |
|--------|----------|--------|
| tool | what tool is used for bulk renames? | sedreplace skill |
| tool | what did we use? | sedreplace ✅ |
| scope | does sedreplace handle all instances? | yes — all src/ files updated |

**verdict:** consistent with codebase rename pattern.

## no duplicated mechanisms found

all new code uses codebase patterns:
- TypeScript uses SDK imports
- bash uses CLI calls
- renames use sedreplace
- exit codes match hook conventions

## conclusion

implementation is consistent with codebase mechanisms. no duplication. no new patterns introduced when old would suffice.
