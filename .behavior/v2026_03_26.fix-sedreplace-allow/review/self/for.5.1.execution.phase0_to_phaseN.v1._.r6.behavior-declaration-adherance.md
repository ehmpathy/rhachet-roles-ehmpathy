# self-review round 6: behavior-declaration-adherance

## objective

deeper scrutiny for potential deviations from spec.

## potential issues examined

### issue 1: redirect detection at start

**concern**: does `[^<]>` catch `>` at the very start of stripped output?

**analysis**:
- `[^<]>` requires a character before `>`
- stripped output always starts with rhx prefix (verified at line 55)
- therefore `>` can never be at position 0
- real redirect like `rhx skill > file` has ` >` which matches `[^<]>` (space is not `<`)

**verdict**: not a deviation. regex is correct for all valid rhx commands.

### issue 2: command substitution in single quotes

**concern**: `rhx --old '$(whoami)'` has literal `$(...)` that wouldn't execute, but we block it.

**analysis**:
- blueprint says: "check for command substitution FIRST (before quote strip)"
- blueprint says: "$( anywhere → exit 0"
- test case N5 explicitly verifies: "rhx with $() in single quotes is still blocked (safe)"
- test comment: "even if it would be literal in execution, we reject at hook level"

**verdict**: intentional conservative behavior. matches spec.

### issue 3: escape sequences

**concern**: what about `\|` (escaped pipe) in unquoted context?

**analysis**:
- backslash-escaped pipe outside quotes is shell syntax that still needs caution
- our sed strip `s/'[^']*'//g` does not handle escapes
- however, typical rhx usage quotes arguments: `--old 'pattern\|alt'`
- unquoted `\|` in an rhx command is unusual and warrants caution

**verdict**: conservative to block. not a deviation.

### issue 4: nested quotes

**concern**: what about `"it's valid"` (single quote inside double quotes)?

**analysis**:
- sed strip processes double quotes first, then single quotes
- `"it's valid"` → double quote match removes entire segment
- result is correct: no false positive from the `'` inside

**verdict**: sed order handles correctly.

### issue 5: empty quotes

**concern**: what about `''` or `""` (empty quotes)?

**analysis**:
- `s/'[^']*'//g` matches empty single quotes: `''` → removed
- `s/"[^"]*"//g` matches empty double quotes: `""` → removed
- edge case E2 tests empty command, not empty quotes
- but `rhx --old '' --new ''` would be valid input

**test**: `rhx sedreplace --old '' --new '' --glob 'src/**'`
- after strip: `rhx sedreplace --old  --new  --glob `
- no dangerous operators, would be allowed
- this is correct behavior

**verdict**: empty quotes handled correctly.

## deviations found

none after deeper scrutiny.

## why this holds

each potential edge case was examined:
1. redirect regex correct for all rhx commands
2. command substitution block is intentional conservative behavior
3. escape approach is conservative
4. nested quotes handled by sed order
5. empty quotes handled correctly

all behaviors match specification or are intentionally conservative for security.
