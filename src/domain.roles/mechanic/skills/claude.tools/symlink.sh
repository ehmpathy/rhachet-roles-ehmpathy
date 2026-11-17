#!/usr/bin/env bash
######################################################################
# .what = safe symlink creation within git repo
#
# .why  = enables symlink creation without:
#         - confusion about relative vs absolute paths
#         - forgetting to cd into directories
#         - accidental path traversal attacks
#
#         this is a controlled alternative to raw ln -s, which
#         requires mental gymnastics about path resolution.
#
# usage:
#   symlink.sh --at "path/to/link" --to "path/to/target" --mode relative
#   symlink.sh --at "path/to/link" --to "path/to/target" --mode absolute
#   symlink.sh --at "path/to/link" --to "path/to/target" --mode relative --idem findsert
#   symlink.sh --at "path/to/link" --to "path/to/target" --mode relative --idem upsert
#
# args:
#   --at     where to create the symlink
#   --to     what the symlink points to
#   --mode   relative | absolute (required)
#   --idem   findsert | upsert (optional, for idempotent operations)
#
# guarantee:
#   - --at must be within git repo
#   - --to must be within git repo
#   - creates parent directories if needed
#   - fail-fast on errors
#   - --idem never deletes regular files
######################################################################
set -euo pipefail

# load the shared refusal leaves (the human-grant guard)
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"

# parse named arguments
AT=""
TO=""
MODE=""
IDEM=""

show_help() {
  cat << 'EOF'
usage: symlink.sh --at <path> --to <target> --mode <relative|absolute> [--idem <findsert|upsert>]

args:
  --at     where to create the symlink (required)
  --to     what the symlink points to (required)
  --mode   relative | absolute (required)
           - relative: symlink stores relative path (portable if both move together)
           - absolute: symlink stores absolute path (always points to same location)
  --idem   findsert | upsert (optional)
           - findsert: succeed if symlink exists with same target, error if different
           - upsert: overwrite existing symlink to match desired state

examples:
  # create relative symlink
  symlink.sh --at ./link --to ./target --mode relative

  # create absolute symlink
  symlink.sh --at ./link --to ./target --mode absolute

  # idempotent: succeed if already correct
  symlink.sh --at ./link --to ./target --mode relative --idem findsert

  # idempotent: always update to match
  symlink.sh --at ./link --to ./target --mode relative --idem upsert
EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --at)
      AT="$2"
      shift 2
      ;;
    --to)
      TO="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --idem)
      IDEM="$2"
      shift 2
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      # args separator - ignore
      shift
      ;;
    *)
      emit_constraint_frame --skill symlink --diagnosis "unknown argument: $1"
      exit 2
      ;;
  esac
done

# validate required args; every refusal rides both streams in the house frame
if [[ -z "$AT" ]]; then
  emit_constraint_frame --skill symlink --diagnosis "--at is required"
  exit 2
fi

if [[ -z "$TO" ]]; then
  emit_constraint_frame --skill symlink --diagnosis "--to is required"
  exit 2
fi

if [[ -z "$MODE" ]]; then
  emit_constraint_frame --skill symlink --diagnosis "--mode is required (relative | absolute)"
  exit 2
fi

if [[ "$MODE" != "relative" && "$MODE" != "absolute" ]]; then
  emit_constraint_frame --skill symlink --diagnosis "--mode must be 'relative' or 'absolute', got '$MODE'"
  exit 2
fi

if [[ -n "$IDEM" && "$IDEM" != "findsert" && "$IDEM" != "upsert" ]]; then
  emit_constraint_frame --skill symlink --diagnosis "--idem must be 'findsert' or 'upsert', got '$IDEM'"
  exit 2
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_constraint_frame --skill symlink --diagnosis "not in a git repository"
  exit 2
fi

# get repo root
REPO_ROOT=$(git rev-parse --show-toplevel)

# resolve --at to absolute path (without following symlinks if it exists)
# -m: allow missing components, -s: don't follow symlinks in final component
AT_ABS=$(realpath -m -s "$AT")

# validate --at is within repo (exact match OR slash-prefixed; prevents /repo from match of /repo-evil)
if [[ "$AT_ABS" != "$REPO_ROOT" && "$AT_ABS" != "$REPO_ROOT/"* ]]; then
  emit_constraint_frame --skill symlink --diagnosis "--at must be within the git repository
repo root: $REPO_ROOT
--at: $AT_ABS"
  exit 2
fi

# refuse a link placed into a human-held grant (.meter/, .branch/.bind/)
refuse_if_human_grant --skill symlink --path "$AT_ABS" --root "$(realpath "$REPO_ROOT")"

# resolve --to to absolute path (for comparison and absolute mode)
TO_ABS=$(realpath -m "$TO")

# validate --to is within repo (exact match OR slash-prefixed; prevents /repo from match of /repo-evil)
if [[ "$TO_ABS" != "$REPO_ROOT" && "$TO_ABS" != "$REPO_ROOT/"* ]]; then
  emit_constraint_frame --skill symlink --diagnosis "--to must be within the git repository
repo root: $REPO_ROOT
--to: $TO_ABS"
  exit 2
fi

# refuse a link that points into a human-held grant: a later write through
# the link (sed -i, tee) would land in .meter/ under a name that hides it
refuse_if_human_grant --skill symlink --path "$TO_ABS" --root "$(realpath "$REPO_ROOT")"

# compute target path based on mode
AT_DIR=$(dirname "$AT_ABS")
if [[ "$MODE" == "relative" ]]; then
  TARGET_PATH=$(realpath -m --relative-to="$AT_DIR" "$TO_ABS")
else
  TARGET_PATH="$TO_ABS"
fi

# handle existing path at --at
if [[ -e "$AT_ABS" || -L "$AT_ABS" ]]; then
  # check if it's a symlink or regular file
  if [[ -L "$AT_ABS" ]]; then
    # it's a symlink
    EXISTING_TARGET=$(readlink "$AT_ABS")

    # resolve existing target to absolute for comparison
    if [[ "$EXISTING_TARGET" == /* ]]; then
      EXISTING_RESOLVED="$EXISTING_TARGET"
    else
      EXISTING_RESOLVED=$(realpath -m "$AT_DIR/$EXISTING_TARGET")
    fi

    if [[ -z "$IDEM" ]]; then
      # no --idem: refuse, and name both idempotent forms under the coconut
      emit_refusal_to_streams --mode vibes --vibes "$(
        print_turtle_header "bummer dude..."
        print_tree_start "symlink"
        print_tree_leaf "✋ ConstraintError: symlink already exists at $AT"
        print_tree_file_line "points to: $EXISTING_TARGET" true
        echo ""
        echo "🥥 did you know?"
        echo "   ├─ findsert succeeds where the target matches; upsert overwrites regardless"
        echo "   ├─ rhx symlink --at '$AT' --to '$TO' --mode $MODE --idem findsert"
        echo "   └─ rhx symlink --at '$AT' --to '$TO' --mode $MODE --idem upsert"
      )"
      exit 2
    elif [[ "$IDEM" == "findsert" ]]; then
      # findsert: compare targets
      if [[ "$EXISTING_RESOLVED" == "$TO_ABS" ]]; then
        echo "symlink already exists with correct target"
        exit 0
      else
        emit_constraint_frame --skill symlink --diagnosis "symlink exists but points to different target
found: $EXISTING_TARGET (resolves to $EXISTING_RESOLVED)
requested: $TARGET_PATH (resolves to $TO_ABS)"
        exit 2
      fi
    elif [[ "$IDEM" == "upsert" ]]; then
      # upsert: remove existing symlink
      rm "$AT_ABS"
    fi
  else
    # it's a regular file (or directory)
    emit_constraint_frame --skill symlink --diagnosis "non-symlink file exists at $AT; refused to delete it
type: $(file -b "$AT_ABS")"
    exit 2
  fi
fi

# create parent directories if needed
if [[ ! -d "$AT_DIR" ]]; then
  mkdir -p "$AT_DIR"
fi

# check if target exists, warn if not
if [[ ! -e "$TO_ABS" ]]; then
  echo "warning: target does not exist: $TO" >&2
fi

# create the symlink
ln -s "$TARGET_PATH" "$AT_ABS"

# emit success message
AT_REL="${AT_ABS#$REPO_ROOT/}"
echo "created symlink: $AT_REL -> $TARGET_PATH (mode: $MODE)"
