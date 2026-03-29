# self-review r4: has-consistent-mechanisms

## search for extant mechanisms

### extant PreToolUse hooks

| hook | purpose | tools | pattern type |
|------|---------|-------|--------------|
| pretooluse.forbid-stderr-redirect.sh | block 2>&1 | Bash | command pattern |
| pretooluse.forbid-suspicious-shell-syntax.sh | block =(), <(), >() | Bash | command pattern |
| pretooluse.forbid-terms.gerunds.sh | block -ing words | Write/Edit | content pattern |
| pretooluse.forbid-terms.blocklist.sh | block forbidden terms | Write/Edit | content pattern |
| pretooluse.forbid-planmode.sh | plan mode control | * | tool name |
| pretooluse.check-permissions.sh | permission checks | * | complex |

### does any extant hook handle /tmp paths?

**no.**

searched for:
- path detection in Bash hooks → none
- /tmp references → none
- file_path checks in hooks → gerunds.sh checks file_path but for allowlist paths, not block

our new hook is for a distinct purpose: block writes to /tmp/*

---

## mechanism-by-mechanism review

### mechanism 1: stdin JSON read

**extant pattern:**
```bash
STDIN_INPUT=$(cat)
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: ..." >&2
  exit 2
fi
```

**our blueprint:** reuse this exact pattern

**verdict: consistent** — marked as [←] reuse in blueprint

---

### mechanism 2: tool name extraction

**extant pattern:**
```bash
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")
```

**our blueprint:** will use same pattern

**verdict: consistent** — standard jq extraction

---

### mechanism 3: file_path extraction for Write/Edit

**extant pattern (gerunds.sh line 46):**
```bash
FILE_PATH=$(echo "$STDIN_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")
```

**our blueprint:** will use same pattern

**verdict: consistent** — marked as [←] reuse in blueprint

---

### mechanism 4: command extraction for Bash

**extant pattern (stderr-redirect.sh line 34):**
```bash
COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")
```

**our blueprint:** will use same pattern

**verdict: consistent** — standard jq extraction

---

### mechanism 5: block with guidance message

**extant pattern (stderr-redirect.sh lines 43-53):**
```bash
{
  echo ""
  echo "🛑 BLOCKED: ..."
  echo ""
  echo "explanation"
  echo ""
} >&2
exit 2
```

**our blueprint:** will use same format

**verdict: consistent** — guidance message contract matches extant style

---

### mechanism 6: permission rules format

**extant pattern (init.claude.permissions.jsonc):**
```jsonc
"Bash(cat:*)"
"Bash(head:*)"
"Bash(tail:*)"
```

**our blueprint:**
```jsonc
"Bash(cat /tmp/claude:*)"
"Bash(head /tmp/claude:*)"
"Bash(tail /tmp/claude:*)"
```

**verdict: consistent** — same format, narrower prefix

---

### mechanism 7: hook registration

**extant pattern (getMechanicRole.ts):**
```typescript
{
  command: './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/...',
  timeout: 'PT5S',
  filter: { what: 'Write|Edit|Bash', when: 'before' },
}
```

**our blueprint:** same format

**verdict: consistent** — same registration structure

---

## could we reuse an extant hook?

### option: extend forbid-suspicious-shell-syntax.sh?

that hook blocks shell metacharacters. /tmp writes are not shell syntax.

**verdict: different purpose, separate hook correct**

### option: extend forbid-terms.blocklist.sh?

that hook blocks terms in content. /tmp is not a term block.

**verdict: different purpose, separate hook correct**

### option: extend check-permissions.sh?

that hook handles permission logic. /tmp block is simpler (path prefix check).

**verdict: overkill, separate hook correct**

---

## summary

| mechanism | extant pattern? | our approach | verdict |
|-----------|-----------------|--------------|---------|
| stdin read | yes | reuse | consistent |
| tool extraction | yes | reuse | consistent |
| file_path extraction | yes | reuse | consistent |
| command extraction | yes | reuse | consistent |
| guidance format | yes | reuse | consistent |
| permission format | yes | extend | consistent |
| hook registration | yes | extend | consistent |

**verdict: no duplicate mechanisms**

the new hook is for a distinct purpose (/tmp path block) not covered by extant hooks. all implementation patterns reuse extant mechanisms for consistency.
