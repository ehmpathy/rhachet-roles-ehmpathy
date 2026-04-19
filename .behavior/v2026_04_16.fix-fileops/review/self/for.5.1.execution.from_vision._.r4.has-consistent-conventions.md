# self-review r4: has-consistent-conventions

## deeper verification with cross-file comparison

### variable names across all 4 skills

**mvsafe.sh:** `FROM`, `INTO`, `LITERAL`, `NAMED_ARG_USED`, `IS_GLOB`, `FILES`
**rmsafe.sh:** `TARGET`, `RECURSIVE`, `LITERAL`, `IS_GLOB`, `FILES`  
**cpsafe.sh:** `FROM`, `INTO`, `LITERAL`, `NAMED_ARG_USED`, `IS_GLOB`, `FILES`
**globsafe.sh:** `PATTERN`, `SEARCH_PATH`, `LONG`, `LITERAL`, `HEAD_LIMIT`, `SORT_BY`, `OUTPUT_MODE`

**observation:** all use UPPER_SNAKE_CASE. Our `LITERAL` matches.

**verdict: CONSISTENT**

### flag names across all 4 skills

**mvsafe.sh:** `--from`, `--into`, `--literal`, `-l`
**rmsafe.sh:** `--path`, `--recursive`, `--literal`, `-r`, `-l`
**cpsafe.sh:** `--from`, `--into`, `--literal`, `-l`
**globsafe.sh:** `--pattern`, `--path`, `--long`, `--literal`, `--head`, `--sort`, `--output`, `-l` (for long)

**observation:** all use `--kebab-case`. Note: `-l` means `--long` in globsafe, `--literal` elsewhere.

**potential issue?** No - different semantics in different commands is normal (like `-v` means different things in different tools).

**verdict: CONSISTENT**

### help text structure

**extant globsafe help:**
```
echo "usage: globsafe.sh --pattern 'glob' [options]"
echo ""
echo "options:"
echo "  --pattern GLOB     file pattern..."
```

**our addition to mvsafe:**
```
echo "usage: mvsafe.sh <from> <into>"
echo "       mvsafe.sh --from <source> --into <destination>"
echo "       mvsafe.sh --literal <from> <into>"
echo ""
echo "options:"
echo "  --from <path>    source path or glob pattern"
```

**verdict: CONSISTENT** - same structure.

### "did you know?" coconut format

**is this a new convention?** Yes - first use of `🥥` and "did you know?" pattern.

**does it conflict with extant?** No - it's additive, follows treestruct visual language.

**verdict: NEW BUT ALIGNED** - extends extant visual language, doesn't conflict.

## summary

all name conventions verified as consistent across all 4 modified files.
