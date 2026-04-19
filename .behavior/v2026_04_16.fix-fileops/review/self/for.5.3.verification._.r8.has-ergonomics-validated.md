# self-review r8: has-ergonomics-validated

## vision input/output specification

from 1.vision.yield.md:

### planned input

| skill | input | expected |
|-------|-------|----------|
| mvsafe | `--literal 'a.[ref].md' 'b.[ref].md'` | file moved |
| mvsafe | `'a.\[ref\].md' 'b.\[ref\].md'` | file moved (escape) |
| rmsafe | `--literal 'old.[ref].md'` | file removed |
| cpsafe | `--literal 'a.[ref].md' 'b.[ref].md'` | file copied |
| globsafe | `--pattern '**/*.[ref].md' --literal` | files found |

### planned output (zero match with brackets)

```
🐢 crickets...

🐚 mvsafe
   ├─ from: file.[ref].md
   ├─ into: newname.[ref].md
   ├─ files: 0
   └─ moved: (none)

🥥 did you know?
   ├─ path contains `[` which is a glob character
   ├─ to treat `[` as literal, use either:
   │  ├─ --literal flag: rhx mvsafe --literal 'file.[ref].md' 'newname.[ref].md'
   │  └─ escape syntax: rhx mvsafe 'file.\[ref\].md' 'newname.\[ref\].md'
   └─ see: rhx mvsafe --help
```

## actual implementation

### actual input

checked mvsafe.sh:55-57, 67-76:
- `--literal` flag: accepted (with `-l` short form)
- escape syntax: works via standard bash escape

| skill | flag | short | escape |
|-------|------|-------|--------|
| mvsafe | `--literal` | `-l` | `\[` `\]` |
| rmsafe | `--literal` | `-l` | `\[` `\]` |
| cpsafe | `--literal` | `-l` | `\[` `\]` |
| globsafe | `--literal` | (none) | `[[]` `[]]` |

### actual output (zero match with brackets)

checked mvsafe.sh:241-253:

```
🥥 did you know?
   ├─ path contains `[` which is a glob character
   ├─ to treat `[` as literal, use either:
   │  ├─ --literal flag: rhx mvsafe --literal '$FROM' '$INTO'
   │  └─ escape syntax: rhx mvsafe '$FROM_ESCAPED' ...
   └─ see: rhx mvsafe --help
```

## drift analysis

| element | vision | actual | drift? |
|---------|--------|--------|--------|
| flag name | `--literal` | `--literal` | none |
| short form | not specified | `-l` added | enhancement |
| escape syntax | `\[` `\]` | `\[` `\]` | none |
| hint emoji | `🥥` | `🥥` | none |
| hint structure | treestruct | treestruct | none |
| hint content | flag + escape examples | flag + escape examples | none |

### globsafe escape syntax difference

| vision | actual |
|--------|--------|
| `\[` | `[[]` |

**why the difference?**

globsafe uses glob patterns where `\[` would be interpreted differently. the character class escape `[[]` is the correct glob syntax to match literal `[`.

**is this a regression?** no - the vision specified escape syntax generically. globsafe uses glob-appropriate escapes.

## ergonomics validation

### does input match?

yes. the `--literal` flag is implemented exactly as specified. the `-l` short form is an enhancement not in vision, but follows convention.

### does output match?

yes. the hint output matches the vision specification:
- same emoji (`🥥`)
- same treestruct format
- same content (flag + escape examples)
- same help reference

### did design change?

minor enhancements only:
1. `-l` short form added (convention)
2. globsafe uses `[[]` escape (glob-correct)

no regressions from vision specification.

## why it holds

1. **input matches:** `--literal` flag implemented as specified
2. **output matches:** hint format and content match vision
3. **enhancements documented:** `-l` short form, globsafe escape syntax
4. **no drift:** implementation follows vision ergonomics

## conclusion

ergonomics validated. implementation matches vision specification with minor enhancements that improve usability.
