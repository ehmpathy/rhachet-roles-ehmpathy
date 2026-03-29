# self-review r3: has-questioned-questions

## method

for each question in the vision, ask:
- can this be answered via logic now?
- can this be answered via extant docs or code now?
- should this be answered via external research later?
- does only the wisher know the answer?

---

## question triage

### Q1: exact pattern for /tmp/claude*

**can answer now?** yes - wish shows `/tmp/claude-1000/...`

**status:** [answered] - pattern is `/tmp/claude-{uid}/`

---

### Q2: should writes to /tmp/claude* be allowed?

**can answer now?** yes - via logic

agent tasks write via internal claude mechanisms, not via tools. hooks only intercept tool calls. block tool writes, internal writes unaffected.

**status:** [answered] - block tool writes

---

### Q3: auto-create .temp/?

**can answer now?** yes - implementation detail

**status:** [answered] - yes, create if absent

---

### Q4: is .temp/ gitignored?

**can answer now?** yes - read .gitignore line 9

**status:** [answered] - yes

---

### Q5: where are permissions configured?

**can answer now?** yes - read .claude/settings.json

**status:** [answered] - settings.json permissions.allow/deny/ask

---

### Q6: can permissions be path-specific?

**can answer now?** partially

- Write/Edit: [answered] yes, glob patterns work
- Bash: [answered] command prefix patterns
- Read: [research] unclear, no examples in extant config

**status:** partially [answered], Read is [research]

---

### Q7: sandbox vs permissions - why prompts?

**can answer now?** no - need to test or check claude code docs

**status:** [research] - requires external verification

---

### Q8: does Read(/tmp/claude*) work?

**can answer now?** no - no examples in extant config, need to test

**status:** [research] - requires testing

contingency:
- if yes: add to permissions.allow
- if no: only Bash allowed, Read will prompt (acceptable)

---

## summary

| question | status | verdict |
|----------|--------|---------|
| exact pattern | [answered] | `/tmp/claude-{uid}/` |
| writes to /tmp/claude* | [answered] | block tool writes |
| auto-create .temp/ | [answered] | yes |
| .temp/ gitignored | [answered] | yes |
| permissions config | [answered] | settings.json |
| path-specific perms | partial | Write/Edit yes, Read unclear |
| sandbox vs permissions | [research] | need to test |
| Read path patterns | [research] | need to test |

no [wisher] questions - wish was clear and specific.

---

## issues found and fixed

1. vision had stale "see open questions" in edgecases → fixed
2. assumption #1 redundant with answered #4 → consolidated
3. research question lacked contingency → added
4. answered #6 mixed clear and unclear → split

---

## non-issues (why they hold)

remaining [research] questions cannot be answered via logic or extant code. they require external verification (run test, read claude code docs). correctly marked.
