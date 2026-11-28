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
#   git.stage.beside.sh begin --path <file>    # save the local copy; worktree = HEAD copy
#   (edit the file, then)
#   git.stage.beside.sh end --path <file>      # stage the edit; worktree = local copy + the edit
#   git.stage.beside.sh repair --path <file> --blob <sha>
#                                              # set a stuck (unmerged) index entry to <sha>
#
# guarantee:
#   - begin refuses (exit 2) a file with staged changes, or a second begin
#   - the local copy is saved under the git dir, named for the path
#   - end stages the file as edited (the index never changes after), then
#     writes the worktree as a 3-way merge of (local copy, HEAD, the edit):
#     where the two overlap, the local copy wins, since the box-local edits
#     are what this box runs; the committed edit still reaches the index
######################################################################
set -euo pipefail

VERB=""
FILE=""
BLOB=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --path) FILE="${2:-}"; shift 2 ;;
    --blob) BLOB="${2:-}"; shift 2 ;;
    --help|-h) echo "usage: git.stage.beside.sh begin|end --path <file> | repair --path <file> --blob <sha>"; exit 0 ;;
    begin|end|repair) VERB="$1"; shift ;;
    *) echo "✋ ConstraintError: unknown argument: $1 (see --help)" | tee /dev/stderr; exit 2 ;;
  esac
done
[[ -n "$VERB" ]] || { echo "✋ ConstraintError: verb must be begin, end, or repair" | tee /dev/stderr; exit 2; }
[[ -n "$FILE" ]] || { echo "✋ ConstraintError: --path <file> is required" | tee /dev/stderr; exit 2; }

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
git ls-files --error-unmatch -- "$FILE" > /dev/null || { echo "✋ ConstraintError: $FILE is not tracked" | tee /dev/stderr; exit 2; }
SLUG=$(printf '%s' "$FILE" | tr '/' '_')
GIT_DIR_ABS=$(git rev-parse --absolute-git-dir)
LOCAL_COPY="$GIT_DIR_ABS/stage.beside.$SLUG.local"

echo "🐢 stage beside the local edits"
echo ""
echo "🐚 git.stage.beside $VERB"
echo "   ├─ path: $FILE"

# repair: set a stuck index entry to a known blob
if [[ "$VERB" == "repair" ]]; then
  [[ "$BLOB" =~ ^[0-9a-f]{40}$ ]] || { echo "   └─ ✋ ConstraintError: --blob <sha> is required, 40 hex chars" | tee /dev/stderr; exit 2; }
  git cat-file -e "$BLOB" || { echo "   └─ ✋ ConstraintError: blob $BLOB is absent" | tee /dev/stderr; exit 2; }
  git update-index --force-remove -- "$FILE"
  git update-index --add --cacheinfo "100644,$BLOB,$FILE"
  echo "   └─ index entry set to ${BLOB:0:8}"
  exit 0
fi

# begin: save the local copy, expose the HEAD copy
if [[ "$VERB" == "begin" ]]; then
  [[ -f "$LOCAL_COPY" ]] && { echo "   └─ ✋ ConstraintError: a begin is already open; run end first" | tee /dev/stderr; exit 2; }
  git diff --cached --quiet -- "$FILE" || { echo "   └─ ✋ ConstraintError: $FILE has staged changes; commit or unstage them first" | tee /dev/stderr; exit 2; }
  cp -- "$FILE" "$LOCAL_COPY"
  git checkout HEAD -- "$FILE"
  echo "   ├─ saved: the local copy"
  echo "   └─ next: edit the committed copy, then run end"
  exit 0
fi

# end: stage the edit, then write the worktree as local copy + the edit
[[ -f "$LOCAL_COPY" ]] || { echo "   └─ ✋ ConstraintError: no begin is open for $FILE" | tee /dev/stderr; exit 2; }
git add -- "$FILE"
echo "   ├─ staged: $(git diff --cached --numstat -- "$FILE" | cut -f1,2 | tr '\t' '/') lines (+/-)"
BASE_COPY="$GIT_DIR_ABS/stage.beside.$SLUG.base"
EDIT_COPY="$GIT_DIR_ABS/stage.beside.$SLUG.edit"
git show "HEAD:$FILE" > "$BASE_COPY"
cp -- "$FILE" "$EDIT_COPY"
git merge-file --ours -p "$LOCAL_COPY" "$BASE_COPY" "$EDIT_COPY" > "$FILE" || true
rm -f "$LOCAL_COPY" "$BASE_COPY" "$EDIT_COPY"
echo "   └─ worktree = the local copy + the edit (the local copy wins an overlap); index = the staged edit"
