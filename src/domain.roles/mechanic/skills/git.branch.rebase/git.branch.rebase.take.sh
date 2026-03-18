#!/usr/bin/env bash
######################################################################
# .what = settle rebase conflicts via selection of ours or theirs version
#
# .why  = mechanics can settle conflicts without permission prompts:
#         - `git checkout --theirs` is destructive (can switch branches)
#         - this skill is scoped to rebase conflicts only
#         - enables autonomous rebase flows
#
# usage:
#   rhx git.branch.rebase take --whos theirs pnpm-lock.yaml
#   rhx git.branch.rebase take --whos ours .eslintrc.json
#   rhx git.branch.rebase take --whos theirs '*.lock' package.json
#   rhx git.branch.rebase take --whos theirs .
#
# guarantee:
#   - requires a rebase in progress
#   - specified files must have conflicts
#   - non-conflict files are skipped with notice
#   - fail-fast: errors immediately on not-found files
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

# source shared operations and output
source "$SKILL_DIR/git.branch.rebase.operations.sh"
source "$COMMIT_SKILL_DIR/output.sh"

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "git.branch.rebase take"
  echo "   ├─ usage"
  echo "   │  └─ rhx git.branch.rebase take --whos ours|theirs <paths...>"
  echo "   ├─ args"
  echo "   │  ├─ --whos    ours|theirs (required)"
  echo "   │  └─ paths     file paths or globs, use . for all (required)"
  echo "   └─ examples"
  echo "      ├─ rhx git.branch.rebase take --whos theirs pnpm-lock.yaml"
  echo "      ├─ rhx git.branch.rebase take --whos ours .eslintrc.json"
  echo "      └─ rhx git.branch.rebase take --whos theirs ."
}

######################################################################
# parse arguments
######################################################################
WHOS=""
PATHS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --whos)
      WHOS="$2"
      shift 2
      ;;
    --help|-h)
      show_usage
      exit 0
      ;;
    *)
      # collect paths
      PATHS+=("$1")
      shift
      ;;
  esac
done

######################################################################
# guards
######################################################################

# guard: must be in a rebase
if ! is_rebase_in_progress; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase take"
  echo "   └─ error: no rebase in progress"
  exit 1
fi

# guard: --whos is required and valid
if [[ -z "$WHOS" ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase take"
  echo "   └─ error: --whos required (ours or theirs)"
  exit 1
fi

if [[ "$WHOS" != "ours" && "$WHOS" != "theirs" ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase take"
  echo "   └─ error: whos must be ours or theirs (got: $WHOS)"
  exit 1
fi

# guard: paths required
if [[ ${#PATHS[@]} -eq 0 ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase take"
  echo "   └─ error: paths required"
  exit 1
fi

######################################################################
# get conflict files
######################################################################
CONFLICT_FILES=$(get_conflict_files)

# guard: at least one conflict file
if [[ -z "$CONFLICT_FILES" ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase take"
  echo "   └─ error: no files in conflict"
  exit 1
fi

######################################################################
# expand paths and intersect with conflict files
# fail-fast: error immediately on not-found files
######################################################################
declare -a FILES_TO_SETTLE=()
declare -a FILES_SKIPPED=()

for pattern in "${PATHS[@]}"; do
  if [[ "$pattern" == "." ]]; then
    # take all conflict files
    while IFS= read -r file; do
      if [[ -n "$file" ]]; then
        FILES_TO_SETTLE+=("$file")
      fi
    done <<< "$CONFLICT_FILES"
  else
    # expand glob pattern
    matches=$(git ls-files "$pattern" 2>/dev/null || echo "")

    if [[ -z "$matches" ]]; then
      # check if file extant but not in conflict
      if [[ -f "$pattern" ]]; then
        FILES_SKIPPED+=("$pattern")
      else
        # fail-fast: file not found
        print_turtle_header "hold up dude..."
        print_tree_start "git.branch.rebase take"
        echo "   └─ error: file not found: $pattern"
        exit 1
      fi
    else
      while IFS= read -r file; do
        if [[ -n "$file" ]]; then
          # check if in conflict
          if echo "$CONFLICT_FILES" | grep -qx "$file"; then
            FILES_TO_SETTLE+=("$file")
          else
            FILES_SKIPPED+=("$file")
          fi
        fi
      done <<< "$matches"
    fi
  fi
done

# remove duplicates
declare -a UNIQUE_FILES=()
declare -A seen
for file in "${FILES_TO_SETTLE[@]}"; do
  if [[ -z "${seen[$file]:-}" ]]; then
    UNIQUE_FILES+=("$file")
    seen[$file]=1
  fi
done
FILES_TO_SETTLE=("${UNIQUE_FILES[@]}")

######################################################################
# settle files
######################################################################
declare -a FILES_SUCCESS=()
declare -a FILES_FAILED=()

for file in "${FILES_TO_SETTLE[@]}"; do
  if git checkout "--$WHOS" "$file" 2>/dev/null; then
    if git add "$file" 2>/dev/null; then
      FILES_SUCCESS+=("$file")
    else
      FILES_FAILED+=("$file (stage failed)")
    fi
  else
    FILES_FAILED+=("$file (checkout failed)")
  fi
done

######################################################################
# output
######################################################################
HAS_SUCCESS=${#FILES_SUCCESS[@]}
HAS_FAILED=${#FILES_FAILED[@]}
HAS_SKIPPED=${#FILES_SKIPPED[@]}

# determine header vibe
if [[ $HAS_SUCCESS -gt 0 && $HAS_FAILED -eq 0 ]]; then
  print_turtle_header "righteous!"
elif [[ $HAS_SUCCESS -eq 0 ]]; then
  print_turtle_header "bummer dude..."
else
  print_turtle_header "mostly righteous..."
fi

print_tree_start "git.branch.rebase take"
echo "   ├─ whos: $WHOS"

# print settled files
if [[ $HAS_SUCCESS -gt 0 ]]; then
  echo "   ├─ settled"
  i=0
  for file in "${FILES_SUCCESS[@]}"; do
    ((i++)) || true
    if [[ $i -eq $HAS_SUCCESS && $HAS_FAILED -eq 0 && $HAS_SKIPPED -eq 0 ]]; then
      echo "   │  └─ $file ✓"
    else
      echo "   │  ├─ $file ✓"
    fi
  done
fi

# print skipped files
if [[ $HAS_SKIPPED -gt 0 ]]; then
  echo "   ├─ skipped (not in conflict)"
  i=0
  for file in "${FILES_SKIPPED[@]}"; do
    ((i++)) || true
    if [[ $i -eq $HAS_SKIPPED ]]; then
      echo "   │  └─ $file"
    else
      echo "   │  ├─ $file"
    fi
  done
fi

# print failed files
if [[ $HAS_FAILED -gt 0 ]]; then
  echo "   ├─ failed"
  i=0
  for file in "${FILES_FAILED[@]}"; do
    ((i++)) || true
    if [[ $i -eq $HAS_FAILED ]]; then
      echo "   │  └─ $file ✗"
    else
      echo "   │  ├─ $file ✗"
    fi
  done
fi

# final line
if [[ $HAS_FAILED -gt 0 ]]; then
  echo "   └─ done (with errors)"
  exit 1
else
  echo "   └─ done"
  exit 0
fi
