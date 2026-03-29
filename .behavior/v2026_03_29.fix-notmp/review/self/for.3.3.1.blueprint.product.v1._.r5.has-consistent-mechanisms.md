# self-review r5: has-consistent-mechanisms (deeper)

## the question

> could we reuse an extant component instead of a new one?

let me examine this more carefully.

---

## observation: shared boilerplate across hooks

all extant PreToolUse hooks have this structure:

```bash
# 1. read stdin
STDIN_INPUT=$(cat)
if [[ -z "$STDIN_INPUT" ]]; then exit 2; fi

# 2. extract fields
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty')
CONTENT=$(echo "$STDIN_INPUT" | jq -r '.tool_input.<field> // empty')

# 3. check condition
if [[ <condition> ]]; then
  # 4. block with message
  { echo "🛑 BLOCKED: ..."; } >&2
  exit 2
fi

# 5. allow
exit 0
```

this boilerplate is duplicated in:
- pretooluse.forbid-stderr-redirect.sh (~30 lines)
- pretooluse.forbid-suspicious-shell-syntax.sh (~100 lines)
- pretooluse.forbid-terms.gerunds.sh (~200 lines)
- pretooluse.forbid-terms.blocklist.sh (~100 lines)

our new hook will add another ~50 lines with similar structure.

### should we extract shared boilerplate?

**option 1: extract a shared "hook framework"**

```bash
source ./hook-framework.sh
hook_init  # read stdin, parse json
check_condition "$FILE_PATH" "starts_with" "/tmp/"
hook_block "BLOCKED: /tmp is not temporary" "use .temp/ instead"
```

**why we didn't:**
- wish didn't ask for refactor
- bash has no good module system
- source adds failure modes
- self-contained hooks are easier to debug

**option 2: merge into extant hook**

could we add /tmp check to `pretooluse.forbid-suspicious-shell-syntax.sh`?

**why we didn't:**
- that hook blocks shell syntax patterns
- /tmp writes are not shell syntax
- merge would confuse purpose
- separate hooks are easier to enable/disable

**option 3: add to `pretooluse.check-permissions.sh`**

could we add /tmp deny to permissions logic?

**why we didn't:**
- permissions.jsonc supports deny patterns
- but deny patterns don't show guidance messages
- we need guidance to explain .temp/ alternative
- hook with exit 2 is the correct mechanism for guidance

---

## verdict on boilerplate duplication

the boilerplate duplication is **intentional, not oversight**.

reasons:
1. **bash has no good abstraction** — sourced functions add complexity
2. **each hook is self-contained** — copy/paste debug works
3. **test files are collocated** — each hook has its own tests
4. **refactor was not requested** — wish asks for /tmp behavior, not hook framework

this is the **same decision** made by all extant hooks. we follow the established pattern.

---

## mechanism uniqueness check

### what is new in our hook?

| mechanism | new? | extant? |
|-----------|------|---------|
| stdin read | no | same as all hooks |
| json parse | no | same as all hooks |
| file_path extract | no | same as gerunds.sh |
| command extract | no | same as stderr-redirect.sh |
| path prefix check | **yes** | not in any hook |
| redirect pattern check | **yes** | not for /tmp paths |
| tee/cp/mv check | **yes** | not in any hook |
| guidance format | no | same format as all hooks |

the **new mechanisms** are:
1. check if file_path starts with /tmp/
2. check if command writes to /tmp/

these are distinct checks not covered by any extant hook.

---

## could we extend an extant hook instead?

### forbid-suspicious-shell-syntax.sh

**could extend:** no
- that hook blocks syntax patterns (metacharacters)
- /tmp is a path, not syntax
- merge would confuse purpose

### forbid-terms.blocklist.sh

**could extend:** no
- that hook blocks terms in content
- /tmp is a path target, not content term
- merge would confuse purpose

### forbid-stderr-redirect.sh

**could extend:** no
- that hook blocks 2>&1 pattern
- /tmp writes are different concern
- merge would confuse purpose

### check-permissions.sh

**could extend:** technically possible
- could add /tmp deny logic
- but loses guidance message (deny = silent block)
- hook exit 2 shows stderr to user

---

## summary

| question | answer |
|----------|--------|
| does extant hook do this? | no — /tmp check is new |
| duplicate extant utilities? | no — reuse patterns, new logic |
| could reuse extant component? | no — /tmp is distinct concern |
| is boilerplate duplication ok? | yes — follows established pattern |

**verdict: no mechanism duplication**

the new hook adds a distinct capability (/tmp write block) that no extant hook provides. the shared boilerplate follows established patterns intentionally.
