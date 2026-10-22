#!/usr/bin/env bash
######################################################################
# .what = stage files for commit with permission check
#
# .why  = mechanics can stage files without human intervention
#         on the commit grant alone
#
# usage:
#   rhx git.stage.add src/file1.ts src/file2.ts    # stage specific files
#   rhx git.stage.add src/**/*.ts                  # stage via shell glob
#   rhx git.stage.add .                            # stage all in current dir
#
# guarantee:
#   - out of a rebase: requires a live commit grant (.meter/git.commit.uses.jsonc)
#   - mid-rebase: reads no meter, as `continue` does (F12)
#   - does NOT decrement uses (uses counts commits only)
#   - paths must be within repo
#   - idempotent: re-stage of staged file is no-op
#   - fail-fast: if any file not found, entire operation fails
######################################################################

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

# source shared utils: the commit meter's readers, and the rebase probe
source "$COMMIT_SKILL_DIR/output.sh"
source "$COMMIT_SKILL_DIR/git.commit.operations.sh"
source "$SKILL_DIR/../git.branch.rebase/git.branch.rebase.operations.sh"
set_meter_scope commit

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

######################################################################
# parse arguments
######################################################################
FILES=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --help|-h)
      echo "usage: git.stage.add path1 path2 ...    # stage specific files"
      echo "       git.stage.add src/**/*.ts        # stage via shell glob"
      echo "       git.stage.add .                  # stage all in current dir"
      echo ""
      echo "options:"
      echo "  --help, -h    show this help"
      echo ""
      echo "constraints:"
      echo "  - out of a rebase, requires a live commit grant (git.commit.uses set --quant N)"
      echo "  - mid-rebase, reads no meter"
      echo "  - paths must be within repo"
      exit 0
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift
      if [[ $# -gt 0 && "$1" != --* && "$1" != -* ]]; then
        shift
      fi
      ;;
    --)
      shift
      ;;
    --*)
      echo "error: unknown option: $1"
      exit 2
      ;;
    *)
      # file path
      FILES+=("$1")
      shift
      ;;
  esac
done

######################################################################
# guards
######################################################################

# guard: at least one path required
if [[ ${#FILES[@]} -eq 0 ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.stage.add"
  print_tree_error "no files specified"
  echo ""
  echo "usage: git.stage.add path1 path2 ..."
  echo "       git.stage.add .                  # stage all"
  exit 2
fi

# mid-rebase, stage reads no meter: it marks a hand-merged conflict done, as
# `continue` does, so a revoke mid-rebase never strands the crew (F12)
IN_REBASE=false
if is_rebase_in_progress; then
  IN_REBASE=true
fi

# guard: global blocker check, via the shared hardened reader (a damaged
# blocker file blocks; it never reads as clear)
GLOBAL_BLOCK_STATUS=0
GLOBAL_BLOCK_CORRUPT=false
if [[ "$IN_REBASE" == "false" ]]; then
  check_global_blocker || GLOBAL_BLOCK_STATUS=$?
fi
# a damaged blocker file is a malfunction, never a human's block
if is_blocker_corrupt status="$GLOBAL_BLOCK_STATUS" corrupt="$GLOBAL_BLOCK_CORRUPT"; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.stage.add"
    print_tree_malfunction "global blocker file corrupt"
    print_global_corrupt_note
  )"
  exit 1
fi
if is_blocker_set status="$GLOBAL_BLOCK_STATUS"; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.stage.add"
    print_tree_constraint "globally blocked"
    print_coconut_hint "a human has blocked all mechanic operations; ask them to lift it" \
      "git.commit.uses allow --global"
  )"
  exit 2
fi

# guard: out of a rebase, stage rides the live commit grant and spends no use
LOCAL_GRANT_STATUS=0
if [[ "$IN_REBASE" == "false" ]]; then
  get_one_commit_local_grant file="$STATE_FILE" || LOCAL_GRANT_STATUS=$?
fi
if [[ "$LOCAL_GRANT_STATUS" -eq 1 ]]; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.stage.add"
    print_tree_malfunction "commit quota file corrupt"
    print_local_meter_damaged_fix file="${STATE_FILE#"$REPO_ROOT/"}"
  )"
  exit 1
fi
if [[ "$IN_REBASE" == "false" && "$COMMIT_LIVE" != "true" ]]; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.stage.add"
    print_tree_constraint "no live commit grant"
    print_coconut_hint "stage rides the commit grant; ask your human to grant one" \
      "git.commit.uses set --quant N"
  )"
  exit 2
fi

######################################################################
# validate paths
######################################################################
for file in "${FILES[@]}"; do
  # convert to absolute path
  if [[ "$file" = /* ]]; then
    abs_path="$file"
  else
    abs_path="$REPO_ROOT/$file"
  fi

  # expand path (via realpath-like expansion)
  abs_path=$(cd "$(dirname "$abs_path")" 2>/dev/null && pwd)/$(basename "$abs_path") || abs_path="$file"

  # guard: path must be within repo
  if [[ "$abs_path" != "$REPO_ROOT"* ]]; then
    print_turtle_header "hold up dude..."
    print_tree_start "git.stage.add"
    print_tree_error "path must be within repo"
    echo ""
    echo "path: $file"
    exit 2
  fi

  # guard: file must exist
  if [[ ! -e "$abs_path" ]]; then
    print_turtle_header "hold up dude..."
    print_tree_start "git.stage.add"
    print_tree_error "file not found: $file"
    exit 2
  fi
done

######################################################################
# stage files
######################################################################
cd "$REPO_ROOT"

STAGED_FILES=()
for file in "${FILES[@]}"; do
  git add "$file"
  STAGED_FILES+=("$file")
done

######################################################################
# output
######################################################################
print_turtle_header "gnarly!"
print_tree_start "git.stage.add"

if [[ ${#STAGED_FILES[@]} -eq 1 ]]; then
  echo "   └─ staged: ${STAGED_FILES[0]}"
else
  echo "   └─ staged"
  LAST_IDX=$((${#STAGED_FILES[@]} - 1))
  for i in "${!STAGED_FILES[@]}"; do
    if [[ $i -eq $LAST_IDX ]]; then
      echo "      └─ ${STAGED_FILES[$i]}"
    else
      echo "      ├─ ${STAGED_FILES[$i]}"
    fi
  done
fi
