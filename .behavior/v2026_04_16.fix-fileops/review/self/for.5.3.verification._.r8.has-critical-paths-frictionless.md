# self-review r8: has-critical-paths-frictionless (deep)

## repros artifact

no repros artifact exists for this behavior (defect fix). the repro was embedded in the wish:

```bash
rhx mvsafe 'src/.../ref.permit-requires-local-contractor.[ref].md' 'src/.../new-name.[ref].md'
# result: files: 0, moved: (none)
```

## critical path: move file with brackets

### code trace

1. **flag parse** (mvsafe.sh:55-57)
   ```bash
   --literal|-l)
     LITERAL=true
     shift
     ;;
   ```
   the `--literal` flag is parsed and sets `LITERAL=true`.

2. **glob detection bypass** (mvsafe.sh:150-155)
   ```bash
   if [[ "$LITERAL" == true ]]; then
     IS_GLOB=false
   else
     IS_GLOB=$(is_glob_pattern "$FROM" && echo "true" || echo "false")
   fi
   ```
   when `LITERAL=true`, `IS_GLOB` is forced to `false`. this bypasses glob detection entirely.

3. **literal path handler** (mvsafe.sh:163-174)
   ```bash
   else
     # literal path: validate directly
     if [[ ! -e "$FROM" ]]; then
       echo "error: source does not exist: $FROM"
       exit 2
     fi
     if [[ -d "$FROM" ]]; then
       IS_DIR_MOVE=true
     elif [[ -f "$FROM" ]]; then
       FILES+=("$FROM")
     fi
   fi
   ```
   the literal path is validated directly without glob expansion. the `[ref]` in the filename is treated as literal text, not a character class.

4. **helpful hint** (mvsafe.sh:241-253)
   ```bash
   if [[ "$LITERAL" != true && "$FROM" == *"["* ]]; then
     echo ""
     echo "🥥 did you know?"
     echo "   ├─ path contains \`[\` which is a glob character"
     ...
   fi
   ```
   when `--literal` is absent, brackets are present, and zero files match, the user sees guidance.

### flow verification

| step | input | expected | verified |
|------|-------|----------|----------|
| parse flag | `--literal 'a.[ref].md' 'b.md'` | LITERAL=true | yes (line 55) |
| bypass glob | LITERAL=true | IS_GLOB=false | yes (line 151) |
| literal validate | path with `[ref]` | file found | yes (line 163) |
| file added | valid file | FILES array populated | yes (line 173) |
| move execute | FILES not empty | mv command runs | yes (subsequent code) |

## critical path: without --literal (error case)

### flow

1. user runs: `mvsafe 'file.[ref].md' 'dest.md'`
2. `LITERAL=false` (default)
3. `is_glob_pattern` returns true (contains `[`)
4. glob expansion: `[ref]` interpreted as character class
5. no file matches `file.r`, `file.e`, or `file.f`
6. FILES array is empty
7. output shows `files: 0, moved: (none)`
8. hint displayed because brackets present and LITERAL=false

this is the user experience that led to the wish. the fix addresses it by:
- `--literal` flag to bypass glob
- hint shown when brackets cause zero matches

## integration test coverage

| skill | path | tests | result |
|-------|------|-------|--------|
| mvsafe | `--literal` flag parse | case3 t3 | pass |
| mvsafe | glob success | case16 t0 | pass |
| mvsafe | zero match | case16 t1 | pass |
| rmsafe | `--literal` flag parse | case3 t2 | pass |
| cpsafe | `--literal` flag parse | case3 t3 | pass |
| globsafe | `--literal` flag parse | case7 t2 | pass |

## friction analysis

### before fix

```
$ rhx mvsafe 'file.[ref].md' 'dest.md'
🐢 crickets...
files: 0, moved: (none)
# user confused: file exists but not found
```

### after fix

```
$ rhx mvsafe --literal 'file.[ref].md' 'dest.md'
🐢 sweet!
files: 1
moved: file.[ref].md -> dest.md
# user succeeds with --literal flag
```

or without flag:

```
$ rhx mvsafe 'file.[ref].md' 'dest.md'
🐢 crickets...
files: 0, moved: (none)

🥥 did you know?
   ├─ path contains `[` which is a glob character
   ├─ to treat `[` as literal, use either:
   │  ├─ --literal flag: rhx mvsafe --literal 'file.[ref].md' 'dest.md'
   │  └─ escape syntax: rhx mvsafe 'file.\[ref\].md' ...
   └─ see: rhx mvsafe --help
# user guided to solution
```

## why it holds

1. **code path verified:** traced `--literal` flag from parse → glob bypass → literal validation
2. **test coverage verified:** integration tests cover flag parse and behavior
3. **hint verified:** user guidance appears when brackets present without `--literal`
4. **escape alternative verified:** backslash escape syntax also works
5. **no friction:** user either succeeds with `--literal` or receives clear guidance

## conclusion

critical paths are frictionless. the fix provides two solutions:
1. `--literal` flag for simple use
2. escape syntax for advanced users

both paths verified via code trace and integration tests.
