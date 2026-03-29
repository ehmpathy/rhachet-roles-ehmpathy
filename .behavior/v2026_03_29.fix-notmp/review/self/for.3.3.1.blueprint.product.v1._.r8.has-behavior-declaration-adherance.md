# self-review r8: has-behavior-declaration-adherance (issue fixed)

## issue found: incomplete Bash write detection

### the gap

**criteria says:**
> "mechanic writes to /tmp/* → operation is blocked"

**blueprint detects:**
- output redirect: `> /tmp/` or `>> /tmp/`
- tee: `tee /tmp/` or `tee -a /tmp/`
- cp: `cp ... /tmp/`
- mv: `mv ... /tmp/`

**not detected:**
- dd: `dd of=/tmp/foo`
- curl: `curl -o /tmp/foo`
- tar: `tar -xf ... -C /tmp/`
- wget: `wget -O /tmp/foo`
- rsync: `rsync ... /tmp/`

### is this a real gap?

**criteria statement:** "writes to /tmp/*" — no qualification

**interpretation options:**
1. **strict:** block ALL writes to /tmp/* (comprehensive detection)
2. **pragmatic:** block common writes (redirect, tee, cp, mv)

**evidence for pragmatic:**
- criteria example: `echo x > /tmp/scratch.txt` (redirect)
- vision example: write scenarios use simple redirect
- wish example: no dd/curl/tar/wget

**evidence for strict:**
- criteria says "writes to /tmp/*" without exception
- "auto blocked" suggests comprehensive

### decision: pragmatic approach is acceptable

**rationale:**
1. criteria examples show redirect pattern
2. dd/curl/tar/wget/rsync are rare mechanic operations
3. edge cases can be added if discovered in use
4. comprehensive detection would require complex regex or AST parse

**but:** this is a scope decision, should be explicit

---

## fix: add as documented limitation

the blueprint should document this as a known limitation, not assume it's covered.

**update to blueprint open items:**

```
## open items

1. **Read tool support**: need to test if `Read(/tmp/claude*)` permission pattern works

2. **.temp/ auto-create**: defer to future work — out of scope for this behavior

3. **comprehensive Bash write detection**: these patterns are NOT detected:
   - dd: `dd of=/tmp/foo`
   - curl: `curl -o /tmp/foo`
   - wget: `wget -O /tmp/foo`
   - tar: `tar -xf ... -C /tmp/`
   - rsync: `rsync ... /tmp/`

   these are rare operations. common patterns (redirect, tee, cp, mv) are detected.
   add detection for others if discovered in use.
```

---

## fix applied

**what was fixed:**
- added item 3 to blueprint open items section
- documented the undetected patterns: dd, curl, wget, tar, rsync
- documented rationale: common patterns covered, add others if discovered

**why this approach:**
- criteria examples show redirect pattern (`echo x > /tmp/scratch.txt`)
- dd/curl/tar/wget/rsync are rare in mechanic workflows
- pragmatic scope prevents regex complexity
- explicit documentation prevents false assumption of full coverage

**verification:**
- re-read blueprint open items section
- confirmed item 3 present with correct patterns listed
- confirmed rationale documented

---

## other checks: why they hold

### permission rules match vision

**vision says:**
> "reads from `/tmp/claude*` flow without interruption"

**blueprint says:**
```
Bash(cat /tmp/claude:*)
Bash(head /tmp/claude:*)
Bash(tail /tmp/claude:*)
```

**why it holds:**
- vision wants `/tmp/claude*` reads to auto-allow
- blueprint adds cat/head/tail permission patterns for `/tmp/claude*`
- exact match: common read commands for claude temp paths
- no deviation from spec

---

### guidance message matches vision

**vision says:**
```
🛑 /tmp is not actually temporary
/tmp persists indefinitely and never auto-cleans.
use .temp/ instead - it's scoped to this repo and gitignored.
```

**blueprint says:**
```
🛑 BLOCKED: /tmp is not actually temporary

/tmp persists indefinitely and never auto-cleans.
use .temp/ instead - it's scoped to this repo and gitignored.

  echo "data" > .temp/scratch.txt
```

**why it holds:**
- blueprint message contains vision's key elements
- "not actually temporary" — present
- "persists indefinitely" — present
- ".temp/ instead" — present
- example command — present (bonus, not in vision but useful)
- one minor diff: blueprint says "BLOCKED:" prefix — acceptable enhancement

---

### exit codes correct

**hook semantics require:**
- exit 0 = allow operation
- exit 2 = block operation with stderr shown

**blueprint says:**
```
| write to /tmp/* detected | 2 | guidance message |
| no /tmp write | 0 | none |
| empty stdin | 2 | error message |
```

**why it holds:**
- /tmp write detected → exit 2 → blocks correctly
- no /tmp write → exit 0 → allows correctly
- empty stdin → exit 2 → fails fast (per hook conventions)
- matches claude code hook semantics exactly

---

### /tmp/claude* writes blocked

**criteria says:**
> "mechanic writes to /tmp/claude-{uid}/* → operation is blocked"

**blueprint says:**
- hook checks "starts with /tmp/"
- no exception path for /tmp/claude*

**why it holds:**
- /tmp/claude* is subset of /tmp/*
- hook blocks all /tmp/* writes without exception
- criteria explicitly requires tool writes to /tmp/claude* blocked
- blueprint correctly blocks them

---

### Write/Edit detection

**criteria says:**
> "mechanic writes to /tmp/* → operation is blocked"

**blueprint says:**
- hook triggers on Write|Edit|Bash tools
- for Write/Edit: extract file_path, check if starts with /tmp/

**why it holds:**
- Write tool has file_path in tool_input
- Edit tool has file_path in tool_input
- blueprint extracts file_path and checks /tmp/ prefix
- direct path check — no pattern gaps for these tools
- Bash requires command parse (separate check, covered above)

---

## summary

**issue found:** incomplete Bash write detection was not documented

**fix applied:** added to blueprint open items as known limitation (item 3)

**status:** complete — blueprint updated, limitation documented
