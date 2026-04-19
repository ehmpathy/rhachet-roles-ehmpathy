# self-review r9: has-ergonomics-validated (deep)

## approach

I opened:
1. 1.vision.yield.md - the planned ergonomics
2. each skill's shell code - the actual implementation
3. compared input/output line by line

## vision specification

from 1.vision.yield.md lines 176-192:

```
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

## actual implementation per skill

### mvsafe.sh (lines 247-252)

```bash
echo "🥥 did you know?"
echo "   ├─ path contains \`[\` which is a glob character"
echo "   ├─ to treat \`[\` as literal, use either:"
echo "   │  ├─ --literal flag: rhx mvsafe --literal '$FROM' '$INTO'"
echo "   │  └─ escape syntax: rhx mvsafe '$FROM_ESCAPED' ..."
echo "   └─ see: rhx mvsafe --help"
```

| element | vision | actual | match? |
|---------|--------|--------|--------|
| emoji | 🥥 | 🥥 | yes |
| structure | treestruct | treestruct | yes |
| flag example | `--literal 'file.[ref].md' 'newname.[ref].md'` | `--literal '$FROM' '$INTO'` | yes (dynamic) |
| escape example | `'file.\[ref\].md' 'newname.\[ref\].md'` | `'$FROM_ESCAPED' ...` | yes (dynamic) |
| help ref | `rhx mvsafe --help` | `rhx mvsafe --help` | yes |

### rmsafe.sh (lines 223-228)

```bash
echo "🥥 did you know?"
echo "   ├─ path contains \`[\` which is a glob character"
echo "   ├─ to treat \`[\` as literal, use either:"
echo "   │  ├─ --literal flag: rhx rmsafe --literal '$TARGET'"
echo "   │  └─ escape syntax: rhx rmsafe '$TARGET_ESCAPED'"
echo "   └─ see: rhx rmsafe --help"
```

| element | vision | actual | match? |
|---------|--------|--------|--------|
| emoji | 🥥 | 🥥 | yes |
| structure | treestruct | treestruct | yes |
| skill name | rmsafe | rmsafe | yes |
| single arg | (not specified) | `'$TARGET'` | correct for rmsafe |

### cpsafe.sh (lines 196-201)

```bash
echo "🥥 did you know?"
echo "   ├─ path contains \`[\` which is a glob character"
echo "   ├─ to treat \`[\` as literal, use either:"
echo "   │  ├─ --literal flag: rhx cpsafe --literal '$FROM' '$INTO'"
echo "   │  └─ escape syntax: rhx cpsafe '$FROM_ESCAPED' ..."
echo "   └─ see: rhx cpsafe --help"
```

| element | vision | actual | match? |
|---------|--------|--------|--------|
| emoji | 🥥 | 🥥 | yes |
| structure | treestruct | treestruct | yes |
| skill name | cpsafe | cpsafe | yes |
| two args | (implied) | `'$FROM' '$INTO'` | correct for cpsafe |

### globsafe.sh (lines 238-243)

```bash
echo "🥥 did you know?"
echo "   ├─ pattern contains \`[\` which is a glob character"
echo "   ├─ to treat \`[\` as literal, use either:"
echo "   │  ├─ --literal flag: rhx globsafe --pattern '$PATTERN' --literal"
echo "   │  └─ escape syntax: rhx globsafe --pattern '$PATTERN_ESCAPED'"
echo "   └─ see: rhx globsafe --help"
```

| element | vision | actual | match? |
|---------|--------|--------|--------|
| emoji | 🥥 | 🥥 | yes |
| structure | treestruct | treestruct | yes |
| text | "path contains" | "pattern contains" | correct for globsafe |
| flag position | `--pattern X --literal` | `--pattern '$PATTERN' --literal` | yes |

## header examples

### vision specification (line 17-18)

```
mvsafe.sh --literal 'file.[ref].md' 'dest.[ref].md'      # literal brackets
mvsafe.sh 'file.\[ref\].md' 'dest.\[ref\].md'            # escaped brackets
```

### actual (mvsafe.sh lines 17-18)

```
mvsafe.sh --literal 'file.[ref].md' 'dest.[ref].md'      # literal brackets
mvsafe.sh 'file.\[ref\].md' 'dest.\[ref\].md'            # escaped brackets
```

exact match.

## --help output

### vision specification (lines 82-83)

> skill help (`--help` output) - document the flag and escape syntax

### actual (mvsafe.sh lines 68-80)

```bash
echo "usage: mvsafe.sh <from> <into>"
echo "       mvsafe.sh --from <source> --into <destination>"
echo "       mvsafe.sh --literal <from> <into>"
echo ""
echo "options:"
echo "  --from <path>    source path or glob pattern"
echo "  --into <path>    destination path"
echo "  --literal, -l    treat path as literal (no glob expansion)"
echo "                   use when path contains [ or ] characters"
echo ""
echo "examples:"
echo "  mvsafe.sh 'src/*.ts' 'dest/'              # glob pattern"
```

help documents:
- `--literal` flag: yes
- `-l` short form: yes
- bracket use case: yes

## consistency check

| skill | emoji | treestruct | dynamic paths | help ref |
|-------|-------|------------|---------------|----------|
| mvsafe | 🥥 | yes | yes | yes |
| rmsafe | 🥥 | yes | yes | yes |
| cpsafe | 🥥 | yes | yes | yes |
| globsafe | 🥥 | yes | yes | yes |

all four skills use consistent ergonomics.

## drift analysis

| aspect | vision | actual | drift? |
|--------|--------|--------|--------|
| hint emoji | 🥥 | 🥥 | none |
| hint structure | treestruct | treestruct | none |
| flag name | `--literal` | `--literal` | none |
| short form | not specified | `-l` added | enhancement |
| escape in examples | static | dynamic | enhancement |
| globsafe text | "path" | "pattern" | correct adaptation |

## why it holds

1. **emoji matches:** 🥥 coconut used in all skills
2. **structure matches:** treestruct format preserved
3. **content matches:** flag example, escape example, help reference
4. **consistency:** all four skills use identical format
5. **enhancements only:** `-l` short form, dynamic path interpolation

## conclusion

ergonomics match vision. implementation is consistent across all four skills with minor enhancements that improve usability.
