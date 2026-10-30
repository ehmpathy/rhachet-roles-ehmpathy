#!/usr/bin/env bash
######################################################################
# .what = settle a catch-up conflict by a whole-file side choice
#
# .why  = a lockfile (or a file one side owns whole) is settled by a pick,
#         never by a hand edit. the sides are named `main` and `branch`,
#         never git's `ours` / `theirs`, whose sense flips between merge
#         and rebase
#
# usage:
#   rhx git.branch.catchup take --whos main pnpm-lock.yaml
#   rhx git.branch.catchup take --whos branch src/readme.md
#   rhx git.branch.catchup take --whos main '*.lock' package.json
#   rhx git.branch.catchup take --whos main .
#
# guarantee:
#   - requires a merge in flight (exit 2 otherwise)
#   - every path must match a conflicted file; checked before any change
#   - a side that deleted the file: the take removes it (git rm)
#   - each taken file is staged
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

source "$COMMIT_SKILL_DIR/output.sh"
source "$COMMIT_SKILL_DIR/git.commit.operations.sh"
source "$SKILL_DIR/git.branch.catchup.operations.sh"

LABEL="git.branch.catchup take"
USAGE="rhx git.branch.catchup take --whos main|branch <paths…>"

######################################################################
# parse arguments
######################################################################
WHOS=""
PATHS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      shift
      [[ $# -gt 0 && "$1" != --* ]] && shift
      ;;
    --whos)
      shift
      if [[ $# -gt 0 && "$1" != --* ]]; then
        WHOS="$1"
        shift
      fi
      ;;
    --help|-h)
      print_turtle_header "heres the wave..."
      print_tree_start "$LABEL"
      echo "   ├─ usage"
      echo "   │  └─ $USAGE"
      echo "   ├─ args"
      echo "   │  ├─ --whos   main (origin/main's version) or branch (this branch's version)"
      echo "   │  └─ paths    conflicted files or globs; . for every conflict"
      echo "   └─ examples"
      echo "      ├─ rhx git.branch.catchup take --whos main pnpm-lock.yaml"
      echo "      └─ rhx git.branch.catchup take --whos branch src/readme.md"
      exit 0
      ;;
    *)
      PATHS+=("$1")
      shift
      ;;
  esac
done

######################################################################
# guards
######################################################################
refuse_if_no_merge_in_flight "$LABEL"

# guard: --whos is main or branch
if [[ "$WHOS" != "main" && "$WHOS" != "branch" ]]; then
  emit_catchup_constraint "--whos must be main or branch (got: ${WHOS:-none})" "$(
    print_tree_start "$LABEL"
    echo "   ├─ main     origin/main's version of the file"
    echo "   ├─ branch   this branch's version of the file"
    echo "   └─ usage: $USAGE"
  )"
  exit 2
fi

# guard: paths given
if [[ ${#PATHS[@]} -eq 0 ]]; then
  emit_catchup_constraint "no paths given" "$(
    print_tree_start "$LABEL"
    echo "   └─ usage: $USAGE"
  )"
  exit 2
fi

# guard: some file in conflict
CONFLICTS=$(get_conflict_files)
if [[ -z "$CONFLICTS" ]]; then
  emit_catchup_constraint "no file in conflict" "$(
    print_tree_start "$LABEL"
    echo "   └─ next: rhx git.branch.catchup continue"
  )"
  exit 2
fi

# match each path to the conflicted files; refuse before any change if one misses
TAKEN=()
MISSED=()
for pattern in "${PATHS[@]}"; do
  HIT=false
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    # shellcheck disable=SC2053 # the pattern is a glob on purpose
    if [[ "$pattern" == "." || "$file" == $pattern ]]; then
      HIT=true
      [[ " ${TAKEN[*]-} " == *" $file "* ]] || TAKEN+=("$file")
    fi
  done <<< "$CONFLICTS"
  [[ "$HIT" == true ]] || MISSED+=("$pattern")
done

if [[ ${#MISSED[@]} -gt 0 ]]; then
  emit_catchup_constraint "a path matches no conflicted file" "$(
    print_tree_start "$LABEL"
    echo "   ├─ unmatched"
    print_catchup_files_tree "   │  " "$(printf '%s\n' "${MISSED[@]}")"
    echo "   └─ in conflict"
    print_catchup_files_tree "      " "$CONFLICTS"
  )"
  exit 2
fi

######################################################################
# take each file
######################################################################
# in a merge, git's stage 2 is HEAD (the branch), stage 3 is MERGE_HEAD (main)
GIT_SIDE="--theirs"
GIT_STAGE=3
if [[ "$WHOS" == "branch" ]]; then
  GIT_SIDE="--ours"
  GIT_STAGE=2
fi

LOCK_TAKEN=false
for file in "${TAKEN[@]}"; do
  # the chosen side deleted the file: the take is its removal
  # (captured first: a `| grep -q` can SIGPIPE the writer under pipefail)
  UNMERGED=$(git ls-files -u -- "$file")
  if ! grep -q "^[0-9]* [0-9a-f]* $GIT_STAGE"$'\t' <<< "$UNMERGED"; then
    git rm -q -- "$file" >/dev/null
    continue
  fi

  git checkout "$GIT_SIDE" -- "$file"
  git add -- "$file"

  case "$(basename "$file")" in
    pnpm-lock.yaml|package-lock.json|yarn.lock) LOCK_TAKEN=true ;;
  esac
done

######################################################################
# output
######################################################################
CONFLICTS_LEFT=$(get_conflict_files)

print_turtle_header "righteous!"
print_tree_start "$LABEL"
echo "   ├─ whos: $WHOS"
echo "   ├─ settled"
print_catchup_files_tree "   │  " "$(printf '%s ✓\n' "${TAKEN[@]}")"
if [[ -n "$CONFLICTS_LEFT" ]]; then
  echo "   ├─ still in conflict"
  print_catchup_files_tree "   │  " "$CONFLICTS_LEFT"
fi

# no step remains before continue: one line
if [[ "$LOCK_TAKEN" != true && -z "$CONFLICTS_LEFT" ]]; then
  echo "   └─ next: rhx git.branch.catchup continue"
  exit 0
fi

# steps remain: list each, then continue
echo "   └─ next"
if [[ "$LOCK_TAKEN" == true ]]; then
  echo "      ├─ lockfile taken whole; refresh it: rhx git.branch.catchup lock refresh"
fi
if [[ -n "$CONFLICTS_LEFT" ]]; then
  echo "      ├─ settle the rest: take a side, or edit + rhx git.stage.add <file>"
fi
echo "      └─ then: rhx git.branch.catchup continue"
