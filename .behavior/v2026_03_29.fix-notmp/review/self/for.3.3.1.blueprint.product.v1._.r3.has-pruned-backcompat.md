# self-review r3: has-pruned-backcompat

## backwards compatibility concerns scan

### concern 1: prior /tmp writes now blocked

**what changes?**
- before: mechanic can write to /tmp/*
- after: mechanic blocked from /tmp/* with guidance

**did wisher explicitly request this break?**
- wish: "writes into /tmp/* should be auto blocked"
- yes, explicitly requested

**is there evidence prior behavior was needed?**
- no evidence anyone relied on /tmp writes
- /tmp writes are poor practice (files persist indefinitely)
- .temp/ is the correct scratch location

**verdict: intentional break, not backcompat concern**

---

### concern 2: hook runs on all Write|Edit|Bash

**what changes?**
- before: no hook intercepts these tools for /tmp check
- after: hook runs, checks path, allows or blocks

**performance impact?**
- hook runs on every Write/Edit/Bash call
- adds latency (jq parse, string match)
- typical hook time: <100ms

**did wisher request performance consideration?**
- no performance requirements in wish
- hook overhead is negligible vs tool execution time

**verdict: acceptable overhead, not backcompat concern**

---

### concern 3: new permission rules for cat/head/tail

**what changes?**
- before: cat/head/tail on /tmp/claude* prompted or denied
- after: auto-allowed

**is this a break?**
- no, it's permission expansion
- operations that were blocked now succeed
- operations that succeeded still succeed

**verdict: additive change, no break**

---

### concern 4: guidance message format

**what changes?**
- before: no guidance message
- after: specific message format with .temp/ example

**could message format break tools?**
- hook outputs to stderr
- Claude Code shows stderr to caller
- no machine-readable format assumed

**verdict: no backcompat concern**

---

## potential backcompat concerns NOT in blueprint

### not addressed: Read tool for /tmp paths

**current state:**
- Read tool may prompt for /tmp/claude* paths
- blueprint does not add Read permission

**why not backcompat?**
- deferred as "open item"
- needs test before commit
- not a regression — current behavior preserved

---

### not addressed: other /tmp read commands

**commands not covered:**
- less /tmp/claude*
- wc /tmp/claude*
- grep pattern /tmp/claude*

**why not backcompat?**
- these were not auto-allowed before
- not auto-allowed after
- current behavior preserved

---

## summary

| concern | intentional? | wisher requested? | verdict |
|---------|--------------|-------------------|---------|
| /tmp writes blocked | yes | yes | not backcompat issue |
| hook overhead | N/A | N/A | acceptable |
| permission expansion | N/A | yes | additive, no break |
| guidance message | N/A | yes | no concern |

**verdict: no unintended backcompat issues**

the only "break" is intentional: /tmp writes are now blocked. this is explicitly requested in the wish. all other changes are additive.
