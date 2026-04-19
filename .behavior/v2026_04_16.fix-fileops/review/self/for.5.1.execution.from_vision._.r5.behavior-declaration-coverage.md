# self-review r5: behavior-declaration-coverage

## line-by-line verification

### change summary

```
cpsafe.sh   | 47 insertions, 1 deletion
globsafe.sh | 41 insertions, 1 deletion
mvsafe.sh   | 47 insertions, 1 deletion
rmsafe.sh   | 48 insertions, 2 deletions
Total: 179 insertions, 4 deletions
```

### vision requirement: "did you know?" format

vision specifies:
```
🥥 did you know?
   ├─ path contains `[` which is a glob character
   ├─ to treat `[` as literal, use either:
   │  ├─ --literal flag: rhx mvsafe --literal 'file.[ref].md' 'newname.[ref].md'
   │  └─ escape syntax: rhx mvsafe 'file.\[ref\].md' 'newname.\[ref\].md'
   └─ see: rhx mvsafe --help
```

**mvsafe.sh implementation (lines 247-256):**
```bash
echo "🥥 did you know?"
echo "   ├─ path contains \`[\` which is a glob character"
echo "   ├─ to treat \`[\` as literal, use either:"
echo "   │  ├─ --literal flag: rhx mvsafe --literal '$FROM' '$INTO'"
echo "   │  └─ escape syntax: rhx mvsafe '$FROM_ESCAPED' ..."
echo "   └─ see: rhx mvsafe --help"
```

**verdict:** matches vision format exactly (treestruct, coconut emoji, both options shown).

### vision requirement: header examples

vision specifies:
```
#   mvsafe.sh --literal 'file.[ref].md' 'dest.[ref].md'      # literal brackets
#   mvsafe.sh 'file.\[ref\].md' 'dest.\[ref\].md'            # escaped brackets
```

**verified in each file:** YES - exact format.

### vision requirement: help output

vision specifies examples and --literal documentation.

**verified:** each skill now has `--help|-h` handler with:
- usage line with `--literal`
- options section with `--literal` description
- examples section with both approaches

### original wish addressed?

wish said: `mvsafe should treat paths as literal strings when passed as arguments`

**implementation:** `--literal` flag makes this opt-in. Wisher approved this approach.

## verification complete

all vision requirements traced to implementation lines. no gaps found.
