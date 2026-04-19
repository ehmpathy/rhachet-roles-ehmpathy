# self-review: has-questioned-requirements

## requirements questioned

### 1. "literal wins" heuristic

**who said this?** I proposed it. The wish suggested three options:
1. escape brackets before glob expansion
2. add `--literal` flag
3. use different mechanism for single-file vs glob operations

**what evidence supports it?** User intuition: "if my file exists, operate on it"

**what if we didn't do this?** Users would need `--literal` flag or manual bracket escape.

**is scope misdirected?** Yes. Upon closer code review:

```bash
is_glob_pattern() {
  [[ "$pattern" == *"*"* || "$pattern" == *"?"* || "$pattern" == *"["* ]]
}
```

The simplest fix: remove `[` from glob detection. Then `file.[ref].md` would be treated as literal path and the extant literal-path branch would handle it.

**verdict: ISSUE FOUND**

**how I fixed it**: revised vision to propose simpler fix - remove `[` from `is_glob_pattern()` instead of complex "literal wins" heuristic.

### 2. file existence check before glob expansion

**what evidence?** Current code ALREADY has separate branches for literal vs glob. The bug is just that `[` triggers the glob branch incorrectly.

**could we simplify?** Yes:
- Option A: Remove `[` from `is_glob_pattern()` - simple, might break intentional `[abc]` globs
- Option B: Check file existence first - safer, handles edge cases

**verdict: CLARIFIED**

**why it holds**: the vision now documents both approaches with explicit tradeoffs. Option A (remove `[`) is simpler and preferred. Option B remains as alternative.

### 3. "zero new flags needed"

**who said this?** My preference for ergonomics.

**what if we didn't do this?** `--literal` and `--glob` flags would make intent explicit. More keystrokes, less magic.

**verdict: HOLDS**

**why it holds**: explicit flags add friction for 99% case. The simple fix (remove `[` from glob detection) achieves the goal without flags. Vision still mentions flags as alternative for future consideration.

### 4. globsafe uses same fix

**assumption:** globsafe needs the same fix as mvsafe/rmsafe.

**is this true?** No! `globsafe` is explicitly a glob tool (`--pattern` arg). Users expect glob behavior.

**verdict: ISSUE FOUND**

**how I fixed it**: revised vision to separate the two problems:
- mvsafe/rmsafe: remove `[` from glob detection (paths should be literal by default)
- globsafe: document escape syntax (`[[]` for literal `[`), or add `--literal` flag

## summary

| requirement | verdict | action |
|-------------|---------|--------|
| "literal wins" heuristic | ISSUE | replaced with simpler "remove `[` from glob detection" |
| file existence check | CLARIFIED | documented as alternative approach |
| zero new flags | HOLDS | simple fix achieves goal without flags |
| same fix for globsafe | ISSUE | separated as different problem with different solution |

## lessons for next time

1. read the extant code before proposing solutions - the literal-path branch already existed
2. question whether different tools need different fixes - globsafe is fundamentally a glob tool
3. simpler is better - one line change vs complex heuristic
