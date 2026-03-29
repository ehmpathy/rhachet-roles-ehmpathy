# self-review r6: has-behavior-declaration-coverage

## vision requirements check

### vision requirement 1: reads from /tmp/claude* flow without interruption

**vision statement:**
> "reads from `/tmp/claude*` flow without interruption"

**blueprint coverage:**
- init.claude.permissions.jsonc adds:
  - `Bash(cat /tmp/claude:*)`
  - `Bash(head /tmp/claude:*)`
  - `Bash(tail /tmp/claude:*)`

**verdict: covered** ✓

---

### vision requirement 2: writes to /tmp/* are blocked with explanation

**vision statement:**
> "writes to `/tmp/*` are blocked with an explanation"

**blueprint coverage:**
- pretooluse.forbid-tmp-writes.sh detects /tmp writes
- blocks with exit 2
- guidance message explains why

**verdict: covered** ✓

---

### vision requirement 3: nudge message explains .temp/ alternative

**vision statement:**
> "use .temp/ instead - it's scoped to this repo and gitignored"

**blueprint coverage:**
- guidance message contract includes:
  ```
  use .temp/ instead - it's scoped to this repo and gitignored.

    echo "data" > .temp/scratch.txt
  ```

**verdict: covered** ✓

---

## criteria usecase check

### usecase.1: read from claude temp directory

**criteria:**
> "mechanic reads from /tmp/claude-{uid}/* → file contents shown immediately"
> "no permission prompt appears"

**blueprint coverage:**
- permission rules auto-allow cat/head/tail for /tmp/claude*
- no hook intercepts reads (hook only checks writes)

**verdict: covered** ✓

---

### usecase.2: read from non-claude temp paths

**criteria:**
> "mechanic reads from /tmp/other-stuff → permission prompt appears"

**blueprint coverage:**
- no permission rule for /tmp/other*
- default behavior: prompts for /tmp/other* reads

**note:** blueprint does not add permissions for non-claude paths, so default prompt behavior remains.

**verdict: covered** ✓ (via omission — correct behavior)

---

### usecase.3: write to /tmp (blocked)

**criteria:**
> "mechanic writes to /tmp/* → operation is blocked"
> "guidance message explains why"
> "guidance message suggests .temp/ alternative"
> "guidance shows example command"

**blueprint coverage:**
- hook detects Write/Edit with file_path in /tmp/*
- hook detects Bash with redirect/tee/cp/mv to /tmp/*
- blocks with exit 2
- guidance message includes:
  - why: "/tmp persists indefinitely and never auto-cleans"
  - alternative: ".temp/"
  - example: `echo "data" > .temp/scratch.txt`

**verdict: covered** ✓

---

### usecase.3 subcase: write to /tmp/claude-{uid}/*

**criteria:**
> "mechanic writes to /tmp/claude-{uid}/* → operation is blocked"

**blueprint coverage:**
- hook checks if file_path starts with /tmp/
- /tmp/claude* starts with /tmp/, so blocked
- no exception for /tmp/claude* tool writes

**verdict: covered** ✓

---

### usecase.4: write to .temp/ (allowed)

**criteria:**
> "mechanic writes to .temp/* → file is created"

**blueprint coverage:**
- hook only blocks /tmp/* paths
- .temp/* is not /tmp/*, so allowed
- no permission changes needed (already allowed)

**note:** ".temp/ auto-create if absent" is deferred as open item (out of scope for this behavior)

**verdict: covered** ✓ (write allowed; auto-create deferred)

---

## exchange boundary check

### read exchanges

| criteria | blueprint |
|----------|-----------|
| cat /tmp/claude-1000/... → auto-allowed | permission rule ✓ |
| tail /tmp/claude-1000/... → auto-allowed | permission rule ✓ |
| head /tmp/claude-1000/... → auto-allowed | permission rule ✓ |
| cat /tmp/other-process/... → prompt | no rule (default) ✓ |

### write exchanges (blocked)

| criteria | blueprint |
|----------|-----------|
| echo x > /tmp/scratch.txt → blocked | hook detects redirect ✓ |
| echo x > /tmp/claude-1000/... → blocked | hook detects redirect ✓ |
| tee /tmp/foo → blocked | hook detects tee ✓ |
| cp file /tmp/foo → blocked | hook detects cp ✓ |
| mv file /tmp/foo → blocked | hook detects mv ✓ |

### write exchanges (allowed)

| criteria | blueprint |
|----------|-----------|
| echo x > .temp/scratch.txt → allowed | not blocked by hook ✓ |

---

## gaps found

**none.**

all vision requirements and criteria usecases are addressed in the blueprint.

---

## open items confirmed

1. **Read tool support** — deferred correctly
2. **.temp/ auto-create** — deferred correctly

these are not gaps; they are intentionally out of scope.

---

## summary

| requirement | source | covered? |
|-------------|--------|----------|
| auto-allow /tmp/claude* reads | vision | ✓ |
| block /tmp/* writes | vision | ✓ |
| guidance message | vision | ✓ |
| read exchange coverage | criteria | ✓ |
| write block exchange | criteria | ✓ |
| write allow exchange | criteria | ✓ |

**verdict: full coverage**

all behavior requirements are addressed. no gaps found.
