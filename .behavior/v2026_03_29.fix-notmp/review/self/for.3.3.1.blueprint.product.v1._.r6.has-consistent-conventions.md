# self-review r6: has-consistent-conventions (deeper)

## internal code conventions

### header block format

extant pattern:
```bash
#!/usr/bin/env bash
######################################################################
# .what = <one-line description>
#
# .why  = <reason paragraph>
#
# .how  = <implementation summary>
#
# usage:
#   <usage instructions>
#
# guarantee:
#   <guarantee list>
######################################################################
```

**our blueprint:** follows same structure

**verdict: consistent**

---

### variable name conventions

extant pattern:
- config constants: UPPER_SNAKE_CASE (HARDNUDGE_WINDOW_SECONDS)
- extracted values: UPPER_SNAKE_CASE (STDIN_INPUT, TOOL_NAME, FILE_PATH, CONTENT)
- local variables: UPPER_SNAKE_CASE

**our variables:**
- STDIN_INPUT ✓
- TOOL_NAME ✓
- FILE_PATH ✓
- COMMAND ✓

**verdict: consistent**

---

### function name conventions

extant pattern:
- lowercase with underscores: find_claude_dir, is_allowed, appears_unquoted

**our functions:** (if any needed)
- none planned — simple linear flow

**verdict: consistent** (no functions needed)

---

### comment style

extant pattern:
```bash
# failfast: if no input, error
# skip if not Write or Edit
# extract file path
```

**our comments:** will follow same terse style

**verdict: consistent**

---

### error message format

extant pattern:
```bash
echo "ERROR: PreToolUse hook received no input via stdin" >&2
```

**our errors:** will follow same "ERROR: <message>" format

**verdict: consistent**

---

## name choice review

### hook name: pretooluse.forbid-tmp-writes

**extant patterns:**
- pretooluse.forbid-stderr-redirect
- pretooluse.forbid-suspicious-shell-syntax
- pretooluse.forbid-terms.gerunds
- pretooluse.forbid-terms.blocklist
- pretooluse.forbid-planmode

**analysis:**
- prefix: `pretooluse.forbid-` ✓ matches extant
- target: `tmp-writes` — describes blocked action

**alternative considered:** `pretooluse.forbid-tmp-path`
- rejected: "writes" is clearer about what is blocked
- "path" could imply reads too

**verdict: consistent**

---

### permission names: Bash(cat /tmp/claude:*)

**extant patterns:**
- `Bash(cat:*)` — allows all cat
- `Bash(npx rhachet run --skill git.release:*)` — narrower prefix

**our pattern:** `Bash(cat /tmp/claude:*)`
- follows narrower prefix pattern
- restricts to specific path

**alternative considered:** `Bash(cat /tmp/claude-*:*)`
- rejected: dash is in path, colon is prefix delimiter
- `/tmp/claude:*` matches `/tmp/claude-1000/...`

**verdict: consistent**

---

### guidance message terms

**terms used:**
- "/tmp" — standard unix path
- ".temp/" — ehmpathy scratch convention
- "repo" — domain term
- "gitignored" — git concept

**extant equivalents:**
- no extant hooks mention /tmp or .temp/
- "repo" used in permission patterns
- "gitignored" used in .gitignore

**verdict: no term conflicts**

---

## structural conventions

### file location

extant: `src/domain.roles/mechanic/inits/claude.hooks/`
ours: same

**verdict: consistent**

### test file location

extant: collocated with hook in same directory
ours: same

**verdict: consistent**

### config file convention

some hooks have config files:
- terms.gerunds.allowlist.jsonc
- terms.blocklist.jsonc
- syntax.suspicious.jsonc

**our hook:** no config file needed
- /tmp prefix is hardcoded
- .temp/ alternative is hardcoded
- no customization required per wish

**verdict: acceptable** (config not needed for simple block)

---

## summary

| convention | extant | ours | verdict |
|------------|--------|------|---------|
| header block | .what/.why/.how | same | consistent |
| variable names | UPPER_SNAKE | UPPER_SNAKE | consistent |
| function names | lower_snake | (none) | N/A |
| comment style | terse `#` | terse `#` | consistent |
| error format | ERROR: msg | ERROR: msg | consistent |
| hook name | forbid-* | forbid-tmp-writes | consistent |
| permission format | Bash(cmd:*) | Bash(cmd path:*) | consistent |
| file location | claude.hooks/ | claude.hooks/ | consistent |

**verdict: no convention divergence**

all internal code conventions follow extant patterns. no new terms conflict with extant terminology.
