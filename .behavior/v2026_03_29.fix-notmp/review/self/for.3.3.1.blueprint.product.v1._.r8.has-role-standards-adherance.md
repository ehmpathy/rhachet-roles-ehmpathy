# self-review r8: has-role-standards-adherance

## relevant rule directories

the blueprint involves:
- a bash hook
- permission rules
- test file
- guidance message to user

relevant mechanic briefs:
1. `code.prod/pitofsuccess.errors` — exit code semantics, fail-fast
2. `code.prod/readable.comments` — header block format
3. `code.test/frames.behavior` — test structure requirements
4. `lang.terms` — variable naming, forbidden terms
5. `lang.tones` — seaturtle message conventions

---

## check 1: pitofsuccess.errors

### rule.require.exit-code-semantics

**rule says:**
- exit 0 = success
- exit 1 = malfunction (external error)
- exit 2 = constraint (user must fix)

**blueprint says:**
```
| write to /tmp/* detected | 2 | guidance message |
| no /tmp write | 0 | none |
| empty stdin | 2 | error message |
```

**evaluation:**
- blocked write → exit 2 (constraint: user should use .temp/) ✓ correct
- no issue → exit 0 (success) ✓ correct
- empty stdin → exit 2 (constraint: hook misconfigured) ✓ correct

**why it holds:**
exit 2 for blocked write is correct because it's a constraint the user must fix (use .temp/ instead).
not exit 1 because it's not a malfunction — it's intentional block.

---

### rule.require.fail-fast

**rule says:**
guard clauses with early returns/exits for invalid state

**blueprint says:**
- empty stdin → exit 2 (first check)
- non-Write/Edit/Bash → exit 0 (skip)

**why it holds:**
blueprint shows fail-fast pattern — empty stdin exits immediately.
tool type check exits early if not relevant tool.

---

## check 2: readable.comments

### rule.require.what-why-headers

**rule says:**
every procedure needs `.what`, `.why` in header

**blueprint shows codepath pattern:**
```
pretooluse.forbid-tmp-writes.sh
├─ [+] read stdin JSON
│  └─ [←] reuse pattern from pretooluse.forbid-terms.gerunds.sh
```

**evaluation:**
blueprint references extant hook pattern. extant hooks have proper headers.
implementation should include:
```bash
######################################################################
# .what = block writes to /tmp/* with guidance message
#
# .why  = /tmp is not actually temporary; .temp/ is the correct scratch space
#
# usage:
#   piped from claude code PreToolUse hook
#
# guarantee:
#   - blocks Write/Edit/Bash to /tmp/*
#   - exit 2 with guidance message
######################################################################
```

**why it holds:**
blueprint explicitly references reuse of extant hook pattern which includes headers.
implementation will follow same format.

---

## check 3: test structure

### rule.require.given-when-then

**blueprint test codepaths:**
```
pretooluse.forbid-tmp-writes.test.sh
├─ [←] reuse test structure from pretooluse.forbid-terms.gerunds.test.sh
├─ [+] test: Write to /tmp/* blocks
├─ [+] test: Bash > /tmp/* blocks (redirect)
...
```

**evaluation:**
blueprint references extant test structure.
extant tests in this codebase use bash test functions, not jest.
bash hook tests don't use given/when/then — they use simple assertions.

**why it holds:**
bash executables don't follow typescript test patterns.
blueprint correctly references extant bash test structure.
this is acceptable for bash hooks.

---

## check 4: lang.terms

### rule.forbid.gerunds

**blueprint text review:**
- "forbid-tmp-writes" — not a gerund, "writes" is noun here
- codepath descriptions use imperatives: "read", "extract", "detect", "block"

**why it holds:**
no gerunds detected in blueprint.
hook name uses "writes" as noun (the writes), not verb (-ing form).

---

### rule.require.treestruct

**blueprint file names:**
- `pretooluse.forbid-tmp-writes.sh` — follows pattern
- `pretooluse.forbid-tmp-writes.test.sh` — follows pattern

**why it holds:**
follows extant convention: `pretooluse.{action}.sh`
matches extant hooks like `pretooluse.forbid-stderr-redirect.sh`

---

## check 5: lang.tones

### guidance message review

**blueprint message:**
```
🛑 BLOCKED: /tmp is not actually temporary

/tmp persists indefinitely and never auto-cleans.
use .temp/ instead - it's scoped to this repo and gitignored.

  echo "data" > .temp/scratch.txt
```

**seaturtle conventions check:**
- lowercase used ✓
- clear explanation ✓
- actionable guidance ✓
- example command ✓

**potential issue: no seaturtle emoji?**

the guidance message uses :stop_sign: but not seaturtle vibes.
however, this is a block message — per briefs:

| vibe phrase | meaning |
|-------------|---------|
| bummer dude | unfortunate |

**should the message use seaturtle vibes?**

extant hooks (pretooluse.forbid-stderr-redirect) use similar pattern without turtle emoji.
hooks are machine-generated messages, not human conversation.
the stop sign emoji is appropriate for a block message.

**why it holds:**
guidance follows extant hook conventions.
not a conversation context — it's a system block message.
seaturtle vibes are for human chat, not system messages.

---

## summary

| standard | status | notes |
|----------|--------|-------|
| exit-code-semantics | ✓ holds | exit 2 for constraint correct |
| fail-fast | ✓ holds | empty stdin exits immediately |
| what-why-headers | ✓ holds | references extant pattern |
| test structure | ✓ holds | bash tests don't use gwt |
| forbid-gerunds | ✓ holds | no gerunds detected |
| treestruct naming | ✓ holds | follows extant hook naming |
| seaturtle guidance | ✓ holds | system message, not conversation |

**no issues found.**

all mechanic role standards are satisfied. blueprint follows extant conventions.
