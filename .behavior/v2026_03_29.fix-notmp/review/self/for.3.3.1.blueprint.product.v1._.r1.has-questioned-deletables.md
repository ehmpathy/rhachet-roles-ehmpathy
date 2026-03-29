# self-review r1: has-questioned-deletables

## feature traceability

### feature 1: auto-allow reads from /tmp/claude*

**traces to criteria?** yes
- usecase.1 in criteria: "mechanic reads from /tmp/claude-{uid}/* → file contents shown immediately"
- vision: "reads from `/tmp/claude*` flow without interruption"
- wish: "reads from /tmp/claude* should be auto allowed"

**verdict: keep** — directly required by wish and criteria

---

### feature 2: auto-block writes to /tmp/*

**traces to criteria?** yes
- usecase.3 in criteria: "mechanic writes to /tmp/* → operation is blocked"
- vision: "writes to `/tmp/*` are blocked with an explanation"
- wish: "writes into /tmp/* should be auto blocked, in favor of .temp/"

**verdict: keep** — directly required by wish and criteria

---

### feature 3: guidance message with .temp/ alternative

**traces to criteria?** yes
- usecase.3 in criteria: "guidance message suggests .temp/ alternative"
- vision: "nudge message explains why"
- wish: "in favor of .temp/"

**verdict: keep** — directly required by criteria

---

### feature 4: block writes to /tmp/claude* (not just /tmp/other*)

**traces to criteria?** yes
- vision section "edgecases": "write to /tmp/claude* → [answered] block tool writes - internal writes unaffected"
- criteria usecase.3: "mechanic writes to /tmp/claude-{uid}/* → operation is blocked"

**verdict: keep** — explicitly covered in criteria

---

## component traceability

### component 1: pretooluse.forbid-tmp-writes.sh

**can be removed?** no
- this is the mechanism that blocks writes
- without it, we cannot fulfill the criteria

**verdict: keep** — essential

---

### component 2: pretooluse.forbid-tmp-writes.test.sh

**can be removed?** no
- tests prove the behavior works
- without tests, we cannot verify fulfillment

**verdict: keep** — essential for verification

---

### component 3: permission rules in init.claude.permissions.jsonc

**can be removed?** no
- these are the mechanism to auto-allow reads
- without them, reads will still prompt

**verdict: keep** — essential

---

### component 4: hook registration in getMechanicRole.ts

**can be removed?** no
- without registration, hook never runs

**verdict: keep** — essential

---

## simplification opportunities

### opportunity 1: combine read permission with write block?

**considered**: use a single hook to handle both read and write
**rejected**: permissions are the correct mechanism for allow — hooks are for block
- permissions: settings.json allows, no code runs
- hooks: code runs to block
- two mechanisms for two behaviors is correct

**verdict: no change** — current design is minimal

---

### opportunity 2: remove HARDNUDGE pattern?

**considered**: always block /tmp writes, no retry window
**current blueprint**: does not use HARDNUDGE — simple block

**verdict: correct** — blueprint already simple

---

### opportunity 3: remove Read tool permission?

**current blueprint**: defers Read tool permission as open item
**considered**: remove from scope entirely

**verdict: keep as open item** — need to test if pattern works before we decide

---

## issues found and fixed

none — blueprint is minimal

---

## non-issues (why they hold)

1. **four files changed**: minimal — each serves distinct purpose
2. **two mechanisms (permissions + hook)**: correct — allow vs block use different mechanisms
3. **test file**: required for verification, not bloat
4. **guidance message**: required by criteria, not feature creep
