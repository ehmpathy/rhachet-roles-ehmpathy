# self-review r3: has-pruned-yagni (thorough)

## component-by-component review

### component 1: pretooluse.forbid-tmp-writes.sh

**was this explicitly requested?**
- wish: "writes into /tmp/* should be auto blocked"
- yes, a PreToolUse hook is the mechanism to block tool calls

**is this the minimum viable way?**
- alternative: use deny patterns in permissions.json
- problem: deny patterns don't support guidance messages
- verdict: hook is minimum for "block with guidance" requirement

**did we add abstraction?**
- no configuration file
- no plugin system
- no parametrization
- single hardcoded behavior
- verdict: no abstraction

**did we add "while we're here" features?**
each codepath examined:
- read stdin JSON: required to receive hook input
- extract file_path: required to detect Write/Edit targets
- extract command: required to detect Bash writes
- detect /tmp/ prefix: required for path check
- detect redirects: required for Bash writes
- detect tee/cp/mv: required for correctness (from assumptions review)
- emit stderr: required for guidance
- exit 2: required to block

no codepath is "while we're here". each serves the block+guide requirement.

**did we optimize early?**
- no cache for repeated paths
- no compiled regex
- no performance shortcuts
- simple string operations
- verdict: no premature optimization

---

### component 2: pretooluse.forbid-tmp-writes.test.sh

**was this explicitly requested?**
- not in wish directly
- required by project practice: all hooks have tests
- required for verification of criteria

**is this minimum?**
test cases trace to criteria:
- "Write to /tmp/* blocks" → criteria usecase.3
- "Write to .temp/* allows" → criteria usecase.4
- "Bash > /tmp/* blocks" → criteria usecase.3
- "guidance contains .temp/" → criteria "suggests .temp/ alternative"
- "empty stdin exits 2" → defensive behavior

no test cases beyond criteria. verdict: minimum.

**did we add extra tests "while we're here"?**
- no edge case speculation
- no fuzz tests
- no performance benchmarks
- verdict: no excess

---

### component 3: init.claude.permissions.jsonc update

**was this explicitly requested?**
- wish: "reads from /tmp/claude* should be auto allowed"
- yes, permission rules are the mechanism

**is this minimum?**
- cat: common read
- head: common read
- tail: common read (wish example uses tail)
- verdict: minimum set for typical read operations

**did we add extra permissions?**
- no less command
- no wc command
- no grep command
- verdict: only the three most common reads

**why not Read tool?**
- deferred as open item
- need to test if pattern works
- not added speculatively
- verdict: correct deferral

---

### component 4: getMechanicRole.ts hook registration

**was this explicitly requested?**
- implicitly required: hook must be registered to run
- without registration, hook is dead code

**is this minimum?**
- one hook entry
- standard timeout (PT5S, same as extant hooks)
- filter matches required tools (Write|Edit|Bash)
- verdict: minimum registration

---

### component 5: expanded Bash detection (tee, cp, mv)

**was this explicitly requested?**
- wish says "writes into /tmp/*" — does not specify how
- tee/cp/mv are write operations to /tmp

**why not YAGNI?**
- original blueprint only had redirect detection
- assumptions review found gap: tee, cp, mv bypass
- gap would violate wish intent (writes not blocked)
- therefore: necessary for correctness, not speculation

**could we remove it?**
- if removed: `echo data | tee /tmp/foo` succeeds
- this violates "writes into /tmp/* should be auto blocked"
- verdict: required

---

## what is NOT in the blueprint

these were considered and rejected:

**HARDNUDGE retry pattern**
- not requested
- wish wants "auto blocked", not "warned then allowed"
- correctly omitted

**Read tool permission**
- deferred as open item
- needs test before commit
- correctly omitted from initial scope

**.temp/ auto-create**
- not in wish
- labeled "out of scope"
- correctly omitted

**notification to caller**
- not requested
- simple block is sufficient
- correctly omitted

---

## summary

| component | explicitly requested | minimum | excess features | verdict |
|-----------|---------------------|---------|-----------------|---------|
| hook shell | yes | yes | none | keep |
| test shell | implicit | yes | none | keep |
| permissions | yes | yes | none | keep |
| registration | implicit | yes | none | keep |
| tee/cp/mv | necessary | yes | none | keep |

**verdict: no YAGNI issues found**

the blueprint contains only what is required to satisfy the wish and criteria. components trace to requirements. features not requested are deferred or omitted.
