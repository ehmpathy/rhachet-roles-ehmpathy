# review: has-pruned-backcompat (r4)

reviewed blueprint line by line for backwards compatibility that was not explicitly requested. cited wish line numbers for each decision.

---

## methodology

the wish document establishes what should be preserved vs changed:

**wish line 9**: "the 'found immediately' case works correctly"
- this explicitly states extant behavior is correct
- implies: preserve "found immediately" output format

**wish line 19-23**: lists what's absent (new features to add)
- commit-based freshness
- await with poll UI
- timeout diagnostics
- found after wait message

**wish line 77-83**: shows "found immediately" output format
```
🫧 and then...

🌊 release: chore(release): v1.3.0
   ...
```
- this is the extant format we must preserve

**conclusion from methodology**: the wish asks us to ADD new capabilities, not CHANGE extant output. any "backwards compat" would be assumption, not requirement.

---

## concern 1: print_transition() retained

**blueprint line 93**: `└── [○] print_transition()  # retain: used for immediate finds`

**did wisher request this compat?**
- **wish line 9**: "the 'found immediately' case works correctly"
- **wish line 77-83**: shows the format print_transition() emits

**verdict**: NOT backwards compat. wish explicitly says extant behavior is correct. we reuse it, not preserve it for compat.

---

## concern 2: git.release.sh call site refactor

**blueprint lines 96-104**: call sites modified to invoke and_then_await

**did wisher request output compat?**
- **wish line 77-83**: shows "found immediately" output → `🫧 and then...` + blank + `🌊`
- blueprint and_then_await emits identical output when found immediately

**is this backwards compat or correct behavior?**
- it's correct behavior. output matches wish specification.
- no "to be safe" assumption.

**verdict**: NOT backwards compat. output matches wish specification exactly.

---

## concern 3: extant tag await loop replaced

**blueprint line 102**: `├── [-] inline tag await poll loop (lines 874-895)`

**did wisher request we preserve extant loop behavior?**
- **NO**. wish line 19-23 lists extant behavior as DEFICIENT
- wish explicitly asks to FIX the deficiency

**what does extant loop do?**
- no poll UI
- no freshness check
- no timeout diagnostics

**verdict**: NOT backwards compat. wish explicitly asks to replace deficient behavior with richer behavior.

---

## concern 4: _gh_with_retry unchanged

**blueprint line 78**: `└── [○] _gh_with_retry()  # retain: used by all gh calls`

**is this a backwards compat decision?**
- **NO**. function is unchanged ([○] = retain). no modification means no compat concern.
- we don't "preserve" it for compat — we simply don't touch it.

**verdict**: NOT backwards compat. no change means no compat concern.

---

## concern 5: output indentation

**blueprint output shapes (lines 249-279)**:
- await uses 3-space indent
- watch uses 6-space indent

**did wisher specify indentation?**
- **wish lines 45-51**: show 3-space indent for await: `   ├─ 💤 5s in await`
- this is explicit in wish, not assumed

**verdict**: NOT backwards compat. indentation matches wish specification.

---

## concern 6: exit code semantics

**blueprint contracts (lines 230-235)**:
- found: exit 0
- timeout: exit 2

**did wisher specify exit codes?**
- **wish line 120**: "exit 2: timeout (constraint)"
- explicit in wish

**verdict**: NOT backwards compat. exit codes match wish specification.

---

## open questions for wisher

**none found.**

every "compat" decision traced to explicit wish line. no assumptions "to be safe".

---

## summary

| concern | did wisher request? | verdict |
|---------|---------------------|---------|
| print_transition() retained | wish line 9, 77-83 | correct reuse, not compat |
| call site refactor | wish line 77-83 | matches spec, not compat |
| tag loop replaced | wish line 19-23 | explicit fix, not compat |
| _gh_with_retry unchanged | N/A (no change) | no compat concern |
| output indentation | wish line 45-51 | matches spec, not compat |
| exit codes | wish line 120 | matches spec, not compat |

**conclusion**: no backwards compatibility was assumed "to be safe". every decision traces to explicit wish lines. no open questions to flag.

