# self-review: behavior-declaration-adherance (r6)

## deeper review

re-read code line by line for subtle deviations from spec.

### check: mkdir parent directories in trash

spec (blueprint codepath): `mkdir -p trash subdir` to mirror path structure

examined code (rmsafe.sh:177):
```bash
mkdir -p "$TRASH_DIR/$(dirname "$TARGET_REL")"
```

this creates parent directories for nested files like `src/deep/file.ts`.
without this, cp would fail for nested paths.

verdict: correct - uses dirname to create parent structure

### check: cp before rm order

spec (wish): "we should first cp into... then rm"

examined code order:
- rmsafe.sh:176-178: findsert, mkdir, cp
- rmsafe.sh:181: rm

verdict: correct order - trash copy happens before removal

### check: error behavior on cp failure

not in spec, but worth review: if cp fails, rm should not proceed.

examined code:
- uses `set -euo pipefail` (line 26)
- cp failure would exit before rm executes

verdict: correct - fail-fast semantics from pipefail

### check: path computation for symlinks

spec (criteria usecase.6): symlink should be preserved as symlink in trash

examined code (rmsafe.sh:271-282):
```bash
if [[ -L "${FILES[0]}" ]]; then
  FIRST_DIR=$(dirname "${FILES[0]}")
  FIRST_BASE=$(basename "${FILES[0]}")
  ...
```

this mirrors the extant symlink path computation used earlier in the file.
symlinks are handled via dirname/basename to avoid realpath dereference.

verdict: correct - symlink path preserved, not dereferenced

### check: coconut shows first file path for multi-file glob

spec (blueprint): "use first file if multiple"

examined code (rmsafe.sh:268-284):
```bash
if [[ $REMOVED_COUNT -gt 0 ]]; then
  FIRST_REL="${FILES[0]}"
  ...
  print_coconut_hint ".../$FIRST_REL" "./$FIRST_REL"
fi
```

verdict: correct - uses FILES[0] as spec states

## conclusion

all subtle implementation details verified:
- mkdir -p for parent directories: correct
- cp before rm order: correct
- fail-fast on cp failure: correct (pipefail)
- symlink path preservation: correct
- first file for coconut: correct
