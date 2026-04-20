# self-review: behavior-declaration-adherance

## scope

execution stone 5.1.execution.phase0_to_phaseN

## check: trash path matches spec

spec (wish): `.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash/`

code (rmsafe.sh:97):
```bash
TRASH_DIR="$REPO_ROOT/.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash"
```

verdict: exact match

## check: gitignore content matches spec

spec (blueprint note 1):
```
*
!.gitignore
```

code (rmsafe.sh:105):
```bash
printf '*\n!.gitignore\n' > "$TRASH_DIR/.gitignore"
```

verdict: exact match

## check: coconut hint format

spec (blueprint): relative paths

code (rmsafe.sh:190):
```bash
print_coconut_hint ".agent/.cache/.../trash/$TARGET_REL" "./$TARGET_REL"
```

verdict: uses relative paths from repo root as spec requires

## check: cp flags match spec

spec (blueprint note 2): cp -P to preserve symlinks

code (rmsafe.sh:178): `cp -rP` for directories
code (rmsafe.sh:254): `cp -P` for files

verdict: correct flags used

## check: findsert pattern

spec (wish): "findserted on mkdir of that trash dir"

code (rmsafe.sh:100-107):
```bash
findsert_trash_dir() {
  if [[ ! -d "$TRASH_DIR" ]]; then
    mkdir -p "$TRASH_DIR"
  fi
  if [[ ! -f "$TRASH_DIR/.gitignore" ]]; then
    printf '*\n!.gitignore\n' > "$TRASH_DIR/.gitignore"
  fi
}
```

verdict: correct findsert pattern (check + create)

## check: coconut only on success

spec (blueprint note 4): crickets path skips coconut

code (rmsafe.sh:197-205): crickets output has no coconut call
code (rmsafe.sh:267-285): coconut only if REMOVED_COUNT > 0

verdict: correct conditional

## check: rhx prefix in hint

spec (user feedback): use `rhx` prefix for commands

code (output.sh:70):
```bash
echo "   └─ rhx cpsafe $trash_path $restore_dest"
```

verdict: uses `rhx` as specified

## conclusion

all implementation details match spec:
- trash path: exact match
- gitignore: exact match
- coconut paths: relative as spec
- cp flags: -P and -rP correct
- findsert: correct pattern
- conditional coconut: correct
- rhx prefix: correct
