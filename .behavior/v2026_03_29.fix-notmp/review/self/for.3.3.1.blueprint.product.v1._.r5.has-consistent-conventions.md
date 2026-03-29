# self-review r5: has-consistent-conventions

## extant name conventions

### hook file names

extant pattern: `pretooluse.<action>-<target>.sh`

| extant | pattern analysis |
|--------|------------------|
| pretooluse.forbid-stderr-redirect.sh | pretooluse.[forbid]-[stderr-redirect] |
| pretooluse.forbid-suspicious-shell-syntax.sh | pretooluse.[forbid]-[suspicious-shell-syntax] |
| pretooluse.forbid-terms.gerunds.sh | pretooluse.[forbid]-[terms.gerunds] |
| pretooluse.forbid-terms.blocklist.sh | pretooluse.[forbid]-[terms.blocklist] |
| pretooluse.forbid-planmode.sh | pretooluse.[forbid]-[planmode] |
| pretooluse.check-permissions.sh | pretooluse.[check]-[permissions] |

**our name:** pretooluse.forbid-tmp-writes.sh

**check:**
- prefix: `pretooluse.` ✓
- action: `forbid-` ✓ (matches forbid-stderr-redirect, forbid-terms.*, etc.)
- target: `tmp-writes` ✓ (describes what is blocked)

**verdict: consistent**

---

### test file names

extant pattern: `<hook-name>.test.sh`

| extant | pattern |
|--------|---------|
| pretooluse.forbid-terms.gerunds.test.sh | [hook].test.sh |
| pretooluse.forbid-terms.blocklist.test.sh | [hook].test.sh |
| pretooluse.forbid-stderr-redirect.test.sh | [hook].test.sh |
| pretooluse.forbid-suspicious-shell-syntax.test.sh | [hook].test.sh |

**our name:** pretooluse.forbid-tmp-writes.test.sh

**verdict: consistent**

---

### permission pattern format

extant pattern: `Bash(<command> <args>:*)`

| extant | pattern |
|--------|---------|
| Bash(cat:*) | Bash([cmd]:*) |
| Bash(head:*) | Bash([cmd]:*) |
| Bash(tail:*) | Bash([cmd]:*) |
| Bash(npx rhachet run --skill git.release:*) | Bash([cmd prefix]:*) |

**our names:**
- Bash(cat /tmp/claude:*)
- Bash(head /tmp/claude:*)
- Bash(tail /tmp/claude:*)

**check:**
- format: `Bash([cmd] [arg prefix]:*)` ✓
- matches extant pattern with argument prefix

**verdict: consistent**

---

### hook registration format

extant pattern in getMechanicRole.ts:

```typescript
{
  command: './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/<name>',
  timeout: 'PT5S',
  filter: { what: '<tools>', when: 'before' },
}
```

**our registration:**

```typescript
{
  command: './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-tmp-writes',
  timeout: 'PT5S',
  filter: { what: 'Write|Edit|Bash', when: 'before' },
}
```

**check:**
- command format: ✓ same
- timeout: `PT5S` ✓ same as extant hooks
- filter.what: `Write|Edit|Bash` ✓ (gerunds.sh uses `Write|Edit`, we add Bash)
- filter.when: `before` ✓ same

**verdict: consistent**

---

### guidance message format

extant pattern:

```
🛑 BLOCKED: <reason>

<explanation paragraph>

<alternative command>
```

**our message:**

```
🛑 BLOCKED: /tmp is not actually temporary

/tmp persists indefinitely and never auto-cleans.
use .temp/ instead - it's scoped to this repo and gitignored.

  echo "data" > .temp/scratch.txt
```

**check:**
- emoji prefix: `🛑` ✓
- keyword: `BLOCKED:` ✓
- explanation paragraph: ✓
- alternative example: ✓

**verdict: consistent**

---

### directory structure

extant: `src/domain.roles/mechanic/inits/claude.hooks/`

**our files:**
- src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-tmp-writes.sh
- src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-tmp-writes.test.sh

**verdict: consistent**

---

## term check

### do we introduce new terms?

| our term | extant equivalent? | verdict |
|----------|-------------------|---------|
| /tmp | no extant term | new (but well-known unix path) |
| .temp/ | no extant term | new (ehmpathy convention) |
| forbid-tmp-writes | matches forbid-* pattern | consistent |

**why new terms are acceptable:**
- /tmp is a standard unix path, not a domain term
- .temp/ is the ehmpathy scratch convention, documented
- no extant hooks deal with these paths

---

## summary

| convention | extant | ours | verdict |
|------------|--------|------|---------|
| hook filename | pretooluse.forbid-*.sh | pretooluse.forbid-tmp-writes.sh | consistent |
| test filename | *.test.sh | *.test.sh | consistent |
| permission format | Bash([cmd]:*) | Bash([cmd] /tmp/claude:*) | consistent |
| registration format | { command, timeout, filter } | { command, timeout, filter } | consistent |
| message format | 🛑 BLOCKED: ... | 🛑 BLOCKED: ... | consistent |
| directory | claude.hooks/ | claude.hooks/ | consistent |

**verdict: no convention divergence**

all names and patterns follow extant conventions.
