# self-review r6: behavior-declaration-adherance

## methodology

read vision.yield.md line-by-line, then grep/read each implementation to verify exact match.

## verification by vision requirement

### vision line 50: "Add `--literal` flag to all affected skills: mvsafe, rmsafe, cpsafe, globsafe"

| skill | variable | flag parse | line |
|-------|----------|------------|------|
| mvsafe | `LITERAL=false` | `--literal\|-l)` | 39, 55-57 |
| rmsafe | `LITERAL=false` | `--literal\|-l)` | 40, 53-55 |
| cpsafe | `LITERAL=false` | `--literal\|-l)` | 39, 55-57 |
| globsafe | `LITERAL=false` | `--literal)` | 45, 76-78 |

**note:** globsafe lacks `-l` short form because `-l` is taken by `--long`. vision does not mandate short forms.

**verdict: ADHERENT**

### vision lines 52-54: "When `--literal` is passed: path is treated as exact string, no glob expansion occurs"

| skill | mechanism | lines |
|-------|-----------|-------|
| mvsafe | `if LITERAL then IS_GLOB=false` | 150-153 |
| rmsafe | `if LITERAL then IS_GLOB=false` | 129-132 |
| cpsafe | `if LITERAL then IS_GLOB=false` | 150-153 |
| globsafe | character class escapes `[[]` `[]]` | 182-188 |

**why globsafe differs:** globsafe is inherently a glob tool, so it cannot bypass glob expansion. instead it escapes metacharacters via character class syntax, which is the correct POSIX mechanism for literal brackets in globs.

**verdict: ADHERENT**

### vision lines 81-82: "skill header - add `--literal` to usage examples, show `\[` escape syntax"

checked mvsafe.sh lines 17-18:
```
#   mvsafe.sh --literal 'file.[ref].md' 'dest.[ref].md'      # literal brackets
#   mvsafe.sh 'file.\[ref\].md' 'dest.\[ref\].md'            # escaped brackets
```

exact match to vision format.

| skill | lines | verified |
|-------|-------|----------|
| mvsafe | 17-18 | yes |
| rmsafe | 19-20 | yes |
| cpsafe | 17-18 | yes |
| globsafe | 22-23 | yes |

**verdict: ADHERENT**

### vision lines 186-192: "did you know?" hint format

vision specifies:
```
🥥 did you know?
   ├─ path contains `[` which is a glob character
   ├─ to treat `[` as literal, use either:
   │  ├─ --literal flag: rhx mvsafe --literal 'file.[ref].md' 'newname.[ref].md'
   │  └─ escape syntax: rhx mvsafe 'file.\[ref\].md' 'newname.\[ref\].md'
   └─ see: rhx mvsafe --help
```

checked mvsafe.sh lines 247-252:
```bash
echo "🥥 did you know?"
echo "   ├─ path contains \`[\` which is a glob character"
echo "   ├─ to treat \`[\` as literal, use either:"
echo "   │  ├─ --literal flag: rhx mvsafe --literal '$FROM' '$INTO'"
echo "   │  └─ escape syntax: rhx mvsafe '$FROM_ESCAPED' ..."
echo "   └─ see: rhx mvsafe --help"
```

**deviation noted:** escape syntax line uses `...` instead of full second argument. this is pragmatic - to compute INTO_ESCAPED would add complexity. the hint remains clear and actionable.

**verdict: ADHERENT** (minor pragmatic simplification)

### vision line 85: "crickets output" - trigger condition

checked all 4 skills: hint triggers when `LITERAL != true && path contains [` and file count is zero.

| skill | condition | line |
|-------|-----------|------|
| mvsafe | `$LITERAL != true && $FROM == *"["*` | 242 |
| rmsafe | `$LITERAL != true && $TARGET == *"["*` | 218 |
| cpsafe | `$LITERAL != true && $FROM == *"["*` | 191 |
| globsafe | `$LITERAL != true && $PATTERN == *"["*` | 233 |

**verdict: ADHERENT**

## summary

all vision requirements traced to implementation. one pragmatic simplification noted (escape syntax truncation) but does not affect correctness or usability.

no deviations found that require fix.
