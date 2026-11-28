#!/usr/bin/env bash
######################################################################
# .what = stage an edit to a tracked file whose worktree copy carries
#         box-local edits that must never be committed
#
# .why  = the actor settings files here carry box-local edits (a newer
#         rhachet layout); a role permission change still owes an edit
#         to the committed copy. git.stage.add would sweep the local
#         edits in. this sets them aside, lets the committed copy be
#         edited and staged, then puts them back
#
# usage:
#   git.stage.beside.sh begin --path <file>   # set local edits aside; worktree = HEAD copy
#   (edit the file, then)
#   git.stage.beside.sh end --path <file>     # stage the edit; put local edits back on top
#
# guarantee:
#   - begin refuses (exit 2) a file with staged changes, or a second begin
#   - the aside patch lives under the git dir, named for the path
#   - end stages the file as edited, then re-applies the aside patch via
#     a 3-way apply, and leaves the index at the staged edit; a patch that
#     will not re-apply stays on disk, named, exit 2
######################################################################
set -euo pipefail

VERB=""
FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --path) FILE="${2:-}"; shift 2 ;;
    --help|-h) echo "usage: git.stage.beside.sh begin|end --path <file>"; exit 0 ;;
    begin|end) VERB="$1"; shift ;;
    *) echo "✋ ConstraintError: unknown argument: $1 (see --help)" | tee /dev/stderr; exit 2 ;;
  esac
done
[[ "$VERB" == "begin" || "$VERB" == "end" ]] || { echo "✋ ConstraintError: verb must be begin or end" | tee /dev/stderr; exit 2; }
[[ -n "$FILE" ]] || { echo "✋ ConstraintError: --path <file> is required" | tee /dev/stderr; exit 2; }

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
git ls-files --error-unmatch -- "$FILE" > /dev/null || { echo "✋ ConstraintError: $FILE is not tracked" | tee /dev/stderr; exit 2; }
SLUG=$(printf '%s' "$FILE" | tr '/' '_')
PATCH="$(git rev-parse --absolute-git-dir)/stage.beside.$SLUG.patch"

echo "🐢 stage beside the local edits"
echo ""
echo "🐚 git.stage.beside $VERB"
echo "   ├─ path: $FILE"

# begin: set the local edits aside, expose the HEAD copy
if [[ "$VERB" == "begin" ]]; then
  [[ -f "$PATCH" ]] && { echo "   └─ ✋ ConstraintError: a begin is already open; run end first" | tee /dev/stderr; exit 2; }
  git diff --cached --quiet -- "$FILE" || { echo "   └─ ✋ ConstraintError: $FILE has staged changes; commit or unstage them first" | tee /dev/stderr; exit 2; }
  git diff --binary HEAD -- "$FILE" > "$PATCH"
  git checkout HEAD -- "$FILE"
  echo "   ├─ aside: $(wc -l < "$PATCH") patch line(s)"
  echo "   └─ next: edit the committed copy, then run end"
  exit 0
fi

# end: stage the edit, then put the local edits back
[[ -f "$PATCH" ]] || { echo "   └─ ✋ ConstraintError: no begin is open for $FILE" | tee /dev/stderr; exit 2; }
git add -- "$FILE"
echo "   ├─ staged: $(git diff --cached --numstat -- "$FILE" | cut -f1,2 | tr '\t' '/') lines (+/-)"
if [[ ! -s "$PATCH" ]]; then
  rm -f "$PATCH"
  echo "   └─ no local edits to put back"
  exit 0
fi
STAGED_BLOB=$(git ls-files -s -- "$FILE" | cut -d' ' -f2)
if git apply --3way "$PATCH" > /dev/null; then
  # a 3-way apply touches the index; set it back to the staged edit
  git update-index --cacheinfo "$(git ls-files -s -- "$FILE" | cut -d' ' -f1),$STAGED_BLOB,$FILE"
  rm -f "$PATCH"
  echo "   └─ local edits back on top; index = the staged edit"
  exit 0
fi
echo "   └─ ✋ ConstraintError: local edits did not re-apply; patch kept at $PATCH" | tee /dev/stderr
exit 2
