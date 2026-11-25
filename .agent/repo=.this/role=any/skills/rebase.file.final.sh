#!/usr/bin/env bash
######################################################################
# .what = settle one file, mid-rebase, to its final state: the branch
#         tip's version with main's changes laid on top
#
# .why  = a long rebase replays a hot file at many picks, and each pick
#         re-conflicts it. settle it once to the end state, then keep
#         HEAD's copy at each later pick
#
# usage:
#   rebase.file.final.sh --tip <sha> --file <path> [--file <path> ...]
#
# guarantee:
#   - writes the tip's exact bytes (final newline kept)
#   - lays `git diff <tip>...origin/main -- <file>` on top via git apply
#   - a hunk that does not apply lands as <file>.rej; exit 2 names them
#   - never touches the index; stage with rhx git.stage.add after
######################################################################
set -euo pipefail

TIP=""
FILES=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --tip) TIP="${2:-}"; shift 2 ;;
    --file) FILES+=("${2:-}"); shift 2 ;;
    *)
      echo "✋ ConstraintError: unknown argument: $1" | tee /dev/stderr
      echo "   usage: rebase.file.final.sh --tip <sha> --file <path>"
      exit 2
      ;;
  esac
done

if [[ -z "$TIP" || ${#FILES[@]} -eq 0 ]]; then
  echo "✋ ConstraintError: --tip and at least one --file are required" | tee /dev/stderr
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

echo "🐢 lay main onto the tip"
echo ""
echo "🐚 rebase.file.final --tip $TIP"

REJECTS=()
for file in "${FILES[@]}"; do
  # write the tip's exact bytes
  git cat-file blob "$TIP:$file" > "$file"

  # lay main's change since the fork on top; a hunk that collides is rejected
  patch=$(git diff "$TIP...origin/main" -- "$file")
  if [[ -z "$patch" ]]; then
    echo "   ├─ $file: tip (main changed naught)"
    continue
  fi
  if printf '%s\n' "$patch" | git apply --reject --whitespace=nowarn - 2> /dev/null; then
    echo "   ├─ $file: tip + main ✓"
    continue
  fi
  REJECTS+=("$file.rej")
  echo "   ├─ $file: tip + main, with rejects → $file.rej"
done

if [[ ${#REJECTS[@]} -gt 0 ]]; then
  echo "   └─ rejects: ${#REJECTS[@]} — settle each by hand, then delete the .rej"
  exit 2
fi
echo "   └─ done"
