# self-review r4: has-pruned-backcompat (focused)

## the question

> did we add backwards compatibility measures that were not requested?

backcompat measures would look like:
- fallback paths for old behavior
- deprecation warns instead of hard blocks
- support for legacy formats
- gradual migration logic

## blueprint scan for backcompat measures

### pretooluse.forbid-tmp-writes.sh

**contains backcompat?** no

the hook has no:
- "if old format" branches
- deprecation warns
- legacy path support
- migration mode

it simply: detects /tmp write → blocks → shows guidance.

**why no backcompat needed?**
- this is new behavior, not a replacement
- no prior hook for /tmp writes existed
- no legacy format to support

---

### init.claude.permissions.jsonc update

**contains backcompat?** no

the update adds three new permission entries:
```
Bash(cat /tmp/claude:*)
Bash(head /tmp/claude:*)
Bash(tail /tmp/claude:*)
```

no removal, no replacement, no migration.

**why no backcompat needed?**
- additive change
- new permissions don't affect old permissions
- no format change

---

### getMechanicRole.ts hook registration

**contains backcompat?** no

adds one hook entry. no removal of prior hooks. no "if version X" logic.

**why no backcompat needed?**
- new hook, not a replacement
- registration format unchanged

---

### guidance message

**contains backcompat?** no

fixed message format. no "old style" or "new style" variants.

**why no backcompat needed?**
- first time this message exists
- no prior format to support

---

## could we have added backcompat unnecessarily?

### scenario 1: "allow /tmp writes with deprecation warn first"

we could have done:
```
if write to /tmp:
  warn "deprecated, use .temp/"
  allow anyway
```

**why we didn't:**
- wish says "auto blocked", not "warned"
- soft deprecation was not requested
- hard block is correct

### scenario 2: "grandfather extant /tmp writes"

we could have done:
```
if /tmp/claude* write:
  allow (internal operations)
if /tmp/other write:
  block
```

**why we didn't:**
- wish says "/tmp/*" blocked, not "/tmp/other*"
- tool writes to /tmp/claude* are blocked
- internal writes bypass tools anyway

### scenario 3: "keep Read tool prompts as fallback"

we could have done:
```
add Read(/tmp/claude*) permission
but keep Bash reads as fallback
```

**why we didn't:**
- Read tool support is deferred
- needs test first
- no fallback logic added

---

## verdict

**no backcompat measures were added**

the blueprint implements the wish directly:
- block /tmp writes (no soft deprecation)
- allow /tmp/claude reads (no fallback paths)
- show guidance (no legacy formats)

**no backcompat was requested, and none was added.**
