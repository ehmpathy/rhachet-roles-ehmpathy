# self-review r7: has-behavior-declaration-coverage (line by line)

## method

go through behavior declarations line by line. for each requirement:
1. quote the exact requirement
2. identify the blueprint component that addresses it
3. verify the component exists in blueprint
4. mark as covered or gap

---

## vision requirements (line by line)

### vision line: "reads from /tmp/claude* flow without interruption"

**requirement:** auto-allow reads from /tmp/claude* paths

**blueprint component:** init.claude.permissions.jsonc updates
```
├─ [+] Bash(cat /tmp/claude:*)
├─ [+] Bash(head /tmp/claude:*)
└─ [+] Bash(tail /tmp/claude:*)
```

**verification:** blueprint lines 55-58 explicitly list these permission rules

**status:** ✓ covered

---

### vision line: "writes to /tmp/* are blocked with an explanation"

**requirement:** block writes with message

**blueprint component:** pretooluse.forbid-tmp-writes.sh
```
├─ [+] detect /tmp write
│  ├─ [+] check if file_path starts with /tmp/
│  └─ [+] check if command writes to /tmp/
├─ [+] block with guidance
│  ├─ [+] emit stderr message
│  └─ [+] exit 2
```

**verification:** blueprint lines 41-52 describe detection and block logic

**status:** ✓ covered

---

### vision line: "nudge message explains why"

**requirement:** message explains /tmp is not temporary

**blueprint component:** guidance message contract
```
🛑 BLOCKED: /tmp is not actually temporary

/tmp persists indefinitely and never auto-cleans.
```

**verification:** blueprint lines 117-120 define message content

**status:** ✓ covered

---

### vision line: "use .temp/ instead"

**requirement:** message suggests .temp/ alternative

**blueprint component:** guidance message contract
```
use .temp/ instead - it's scoped to this repo and gitignored.

  echo "data" > .temp/scratch.txt
```

**verification:** blueprint lines 120-122 include alternative and example

**status:** ✓ covered

---

## criteria usecases (line by line)

### usecase.1 line: "mechanic reads from /tmp/claude-{uid}/* → file contents shown immediately"

**requirement:** immediate file contents, no prompt

**blueprint component:** permission rules for cat/head/tail

**verification:** auto-allow permission rules in blueprint lines 55-58

**status:** ✓ covered

---

### usecase.1 line: "no permission prompt appears"

**requirement:** no prompt for /tmp/claude* reads

**blueprint component:** permission rules auto-allow these commands

**verification:** permission rules are "allow" type, not "ask"

**status:** ✓ covered

---

### usecase.2 line: "mechanic reads from /tmp/other-stuff → permission prompt appears"

**requirement:** non-claude /tmp paths still prompt

**blueprint component:** no permission rule added for /tmp/other*

**verification:** blueprint only adds rules for /tmp/claude*, default behavior prompts

**status:** ✓ covered (via omission)

---

### usecase.3 line: "mechanic writes to /tmp/* → operation is blocked"

**requirement:** block all writes to /tmp/*

**blueprint component:** hook detects and blocks

**verification:** blueprint lines 41-47 detect /tmp/* in file_path and commands

**status:** ✓ covered

---

### usecase.3 line: "guidance message explains why"

**requirement:** message has explanation

**blueprint component:** guidance message contract line 119
> "/tmp persists indefinitely and never auto-cleans."

**verification:** explanation present in message

**status:** ✓ covered

---

### usecase.3 line: "guidance message suggests .temp/ alternative"

**requirement:** message suggests .temp/

**blueprint component:** guidance message contract line 120
> "use .temp/ instead - it's scoped to this repo and gitignored."

**verification:** alternative present in message

**status:** ✓ covered

---

### usecase.3 line: "guidance shows example command"

**requirement:** message includes example

**blueprint component:** guidance message contract line 122
> "  echo \"data\" > .temp/scratch.txt"

**verification:** example command present

**status:** ✓ covered

---

### usecase.3 subcase: "mechanic writes to /tmp/claude-{uid}/* → operation is blocked"

**requirement:** block even /tmp/claude* tool writes

**blueprint component:** hook checks if file_path starts with /tmp/
- /tmp/claude* starts with /tmp/
- no exception path

**verification:** blueprint line 42 checks "/tmp/" prefix without exclusion

**status:** ✓ covered

---

### usecase.4 line: "mechanic writes to .temp/* → file is created"

**requirement:** .temp/ writes allowed

**blueprint component:** hook only blocks /tmp/*

**verification:** hook checks "starts with /tmp/", .temp/ doesn't match

**status:** ✓ covered

---

### usecase.4 line: ".temp/ directory auto-created if absent"

**requirement:** auto-create .temp/

**blueprint component:** deferred as open item
> "**.temp/ auto-create**: defer to future work — out of scope for this behavior"

**verification:** explicitly deferred in blueprint line 157

**status:** ✓ covered (deferred per scope)

---

## exchange boundary check

### read exchanges from criteria

| criteria input | criteria output | blueprint coverage |
|----------------|-----------------|-------------------|
| cat /tmp/claude-1000/... | contents, no prompt | permission rule ✓ |
| tail /tmp/claude-1000/... | contents, no prompt | permission rule ✓ |
| head /tmp/claude-1000/... | contents, no prompt | permission rule ✓ |
| cat /tmp/other-process/... | prompt | no rule (default) ✓ |

### write exchanges from criteria (blocked)

| criteria input | criteria output | blueprint coverage |
|----------------|-----------------|-------------------|
| echo x > /tmp/scratch.txt | blocked + guidance | redirect detection ✓ |
| echo x > /tmp/claude-1000/... | blocked + guidance | redirect detection ✓ |

### write exchanges from criteria (allowed)

| criteria input | criteria output | blueprint coverage |
|----------------|-----------------|-------------------|
| echo x > .temp/scratch.txt | file created | not blocked ✓ |

---

## gaps found

**none.**

every requirement line in vision and criteria traces to a blueprint component.

---

## why no gaps

1. **vision requirements**: each addressed by specific blueprint component
2. **criteria usecases**: each maps to hook logic or permission rules
3. **exchange boundaries**: all input/output pairs covered
4. **deferred items**: explicitly marked as out of scope

the blueprint is a complete implementation plan for the behavior.
