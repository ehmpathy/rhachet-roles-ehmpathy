# self-review: has-questioned-questions

## question triage

### Q1: exact pattern - is `/tmp/claude*` the right glob?

**can answer via logic?** partially. the wish shows `/tmp/claude-1000/...` which suggests `claude-{uid}`.

**can answer via extant docs/code?** yes - claude code source or docs would confirm.

**verdict: [research]** - check claude code docs for temp directory pattern

---

### Q2: should writes to /tmp/claude* be allowed?

**can answer via logic?** yes.

agent tasks write output to `/tmp/claude-*/...`. if we block writes there, agent tasks break.

BUT: agent task writes happen via internal claude code mechanisms, not via Write/Edit/Bash tools. hooks only intercept tool calls. so:
- mechanic Write/Edit/Bash to /tmp/claude* → blocked by hook → fine
- claude code internal writes to /tmp/claude* → not via tools → unaffected

**verdict: [answered]** - block tool writes to /tmp/claude*. internal writes are unaffected.

---

### Q3: should we auto-create .temp/ when needed?

**can answer via logic?** yes.

if mechanic tries to write to .temp/ but it doesn't exist, the write fails. better UX: create it.

but: this is implementation detail, not vision scope.

**verdict: [answered]** - yes, create .temp/ if absent. defer to implementation.

---

### Q4: is .temp/ already gitignored in ehmpathy repos?

**can answer via extant code?** yes - check .gitignore.

**verdict: [research]** - check .gitignore in ehmpathy repos

---

### Q5: where are permissions configured?

**can answer via extant docs/code?** yes - claude code docs or settings.json.

**verdict: [research]** - check claude code permission configuration

---

### Q6: what's the exact mechanism for allow vs block?

**can answer via logic?** partially. based on my r2 review:
- allow: permission rules in settings.json (no prompt, proceed)
- block: PreToolUse hook with exit 2 (reject)

**verdict: [answered]** - two mechanisms. allow via permissions, block via hooks.

---

### Q7 (new): is the prompt due to sandbox or permissions?

**can answer via logic?** no. need to test or check docs.

**verdict: [research]** - understand why /tmp paths trigger prompts

---

### Q8 (new): can permissions be path-specific?

**can answer via extant docs/code?** yes - check permission format.

current permissions are command-prefix based. unclear if path patterns are supported.

**verdict: [research]** - check if Read(/tmp/claude*) pattern is valid

---

## summary

| question | verdict | note |
|----------|---------|------|
| exact /tmp/claude* pattern | [research] | check claude code docs |
| writes to /tmp/claude* | [answered] | block tool writes, internals unaffected |
| auto-create .temp/ | [answered] | yes, defer to implementation |
| .temp/ gitignored | [research] | check .gitignore |
| permission config location | [research] | check claude code docs |
| allow vs block mechanisms | [answered] | permissions vs hooks |
| sandbox vs permissions | [research] | test or check docs |
| path-specific permissions | [research] | check permission format |

## update vision?

yes - the vision's "open questions" section needs update to reflect this triage.

questions [answered] should move out of "open questions".
questions [research] should stay with clear labels.
no questions need [wisher] - all are answerable via research.
