# review: has-ergonomics-validated (r9)

## approach

1. no repros artifact exists — used vision spec as source
2. compared vision ergonomics to implemented behavior
3. identified any drift and assessed whether improvement or regression

## vision spec ergonomics

### read ergonomics (vision lines 60-62)

```
**for reads:**
- input: `cat /tmp/claude-1000/...` or `tail /tmp/claude-*`
- output: file contents, no prompt
```

### write ergonomics (vision lines 64-66)

```
**for writes:**
- input: `echo x > /tmp/foo`
- output: blocked message with .temp/ alternative
```

### block message (vision lines 32-37)

```
human: echo "data" > /tmp/scratch.txt
claude: [blocked]
        🛑 /tmp is not actually temporary
        /tmp persists indefinitely and never auto-cleans.
        use .temp/ instead - it's scoped to this repo and gitignored.
```

## actual implementation ergonomics

### read behavior

| input | output |
|-------|--------|
| `cat /tmp/claude-1000/...` | exit 0, no stderr |
| `tail /tmp/claude-*` | exit 0, no stderr |

matches vision: no prompt, contents flow through.

### write behavior

| input | output |
|-------|--------|
| `echo x > /tmp/foo` | exit 2, block message to stderr |

matches vision: blocked with message.

### block message (actual)

```
🛑 BLOCKED: /tmp is not actually temporary

/tmp persists indefinitely and never auto-cleans.
use .temp/ instead - it's scoped to this repo and gitignored.

  echo "data" > .temp/scratch.txt
```

## drift analysis

| element | vision | actual | drift? |
|---------|--------|--------|--------|
| block indicator | `🛑 /tmp is not...` | `🛑 BLOCKED: /tmp is not...` | yes — added "BLOCKED:" |
| explanation | 2 lines, dense | 2 lines, with blank lines | yes — added whitespace |
| example command | not shown | `echo "data" > .temp/scratch.txt` | yes — added example |

### Q: is this drift a regression or improvement?

A: **improvement**.

1. **"BLOCKED:" prefix**: clearer semantic signal
   - vision had just emoji
   - actual has emoji + word
   - user immediately grasps intent

2. **whitespace**: better readability
   - vision was dense
   - actual has visual room between lines
   - easier to scan

3. **example command**: actionable guidance
   - vision said "use .temp/" but no example
   - actual shows copy-paste command
   - user can immediately act

### Q: should vision be updated?

A: yes. the implementation improved on the vision. the blueprint (3.3.1) already documents the actual format. the vision should be updated to match, but this is cosmetic — the behavior is correct.

## ergonomic validation

### input ergonomics

| aspect | expected | actual | valid? |
|--------|----------|--------|--------|
| read input | `cat /tmp/...` | same | yes |
| write input | `echo x > /tmp/foo` | same | yes |

### output ergonomics

| aspect | expected | actual | valid? |
|--------|----------|--------|--------|
| read output | no prompt | exit 0, silent | yes |
| write output | blocked + .temp/ | exit 2 + message | yes |
| message clarity | explains why | explains why + example | yes (improved) |

## why it holds

1. **input matches**: same commands as vision
2. **output matches**: same behavior as vision
3. **drift is improvement**: clearer indicator, better space, actionable example
4. **no regressions**: all improvements, no degradations
5. **blueprint is source of truth**: 3.3.1 documents actual format

ergonomics validated. drift is improvement, not regression.

