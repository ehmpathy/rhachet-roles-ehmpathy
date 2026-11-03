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
USAGE="rhx git.branch.catchup take --whos <main|branch> <paths…>"

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
      echo "   │  └─ paths    conflicted files or globs, from the repo root; . for every conflict"
      echo "   └─ examples"
      echo "      ├─ rhx git.branch.catchup take --whos main pnpm-lock.yaml"
      echo "      └─ rhx git.branch.catchup take --whos branch src/readme.md"
      exit 0
      ;;
    --*)
      # a flag take does not know is a typo, never a path to match
      emit_catchup_constraint message="unknown argument: $1" tree="$(
        print_tree_start "$LABEL"
        echo "   └─ usage: $USAGE"
      )"
      exit 2
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
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"  # git lists conflicts from the root; take them from there
STATE_FILE="$REPO_ROOT/.meter/$COMMIT_STATE_FILENAME"

refuse_if_no_catchup_merge_in_flight label="$LABEL"

# guard: --whos is main or branch
if [[ "$WHOS" != "main" && "$WHOS" != "branch" ]]; then
  emit_catchup_constraint message="--whos must be main or branch (got: ${WHOS:-none})" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ main     origin/main's version of the file"
    echo "   ├─ branch   this branch's version of the file"
    echo "   └─ usage: $USAGE"
  )"
  exit 2
fi

# guard: paths given
if [[ ${#PATHS[@]} -eq 0 ]]; then
  emit_catchup_constraint message="no paths given" tree="$(
    print_tree_start "$LABEL"
    echo "   └─ usage: $USAGE"
  )"
  exit 2
fi

# guard: some file in conflict
CONFLICTS=$(get_conflict_files)
if [[ -z "$CONFLICTS" ]]; then
  emit_catchup_constraint message="no file in conflict" tree="$(
    print_tree_start "$LABEL"
    echo "   └─ next: rhx git.branch.catchup continue"
  )"
  exit 2
fi

# match each conflicted file to the paths; refuse before any change if a path
# misses. files loop outside, so each file is taken once, with no dedupe
TAKEN=()
MISSED=()
PATTERN_HITS=()
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  FILE_HIT=false
  for i in "${!PATHS[@]}"; do
    # an exact name matches first, so `app/[id]/page.tsx` typed as printed is
    # that file, never a one-char class; else the path is a glob on purpose
    # shellcheck disable=SC2053
    if [[ "${PATHS[$i]}" == "." || "$file" == "${PATHS[$i]}" || "$file" == ${PATHS[$i]} ]]; then
      PATTERN_HITS[i]=true
      FILE_HIT=true
    fi
  done
  [[ "$FILE_HIT" == true ]] && TAKEN+=("$file")
done <<< "$CONFLICTS"
for i in "${!PATHS[@]}"; do
  [[ "${PATTERN_HITS[i]-}" == true ]] || MISSED+=("${PATHS[$i]}")
done

if [[ ${#MISSED[@]} -gt 0 ]]; then
  emit_catchup_constraint message="a path matches no conflicted file" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ unmatched"
    print_catchup_lines_tree prefix="   │  " files="$(printf '%s\n' "${MISSED[@]}")"
    echo "   ├─ note: paths are read from the repo root, wherever take runs"
    echo "   └─ in conflict"
    print_catchup_lines_tree prefix="      " files="$CONFLICTS"
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

# each name is a raw path, never a glob: `a[1].md` names one file
export GIT_LITERAL_PATHSPECS=1

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
print_catchup_lines_tree prefix="   │  " files="$(printf '%s ✓\n' "${TAKEN[@]}")"
if [[ -n "$CONFLICTS_LEFT" ]]; then
  CONFLICTS_LEFT_SHOWN=$(get_conflict_files_shown)
  echo "   ├─ still in conflict"
  print_catchup_lines_tree prefix="   │  " files="$CONFLICTS_LEFT_SHOWN"
fi

# no step remains before continue: one line
if [[ "$LOCK_TAKEN" != true && -z "$CONFLICTS_LEFT" ]]; then
  echo "   └─ next: rhx git.branch.catchup continue"
  exit 0
fi

# steps remain: a label, then a command a human can paste; then continue
echo "   └─ next"
if [[ "$LOCK_TAKEN" == true ]]; then
  printf '      ├─ %-18s rhx git.branch.catchup lock refresh\n' "refresh the lock:"
fi
if [[ -n "$CONFLICTS_LEFT" ]]; then
  # the stage grant, read pure, names the right next step for a hand edit
  get_commit_quota_status file="$STATE_FILE"
  if has_deleted_conflict shown="$CONFLICTS_LEFT_SHOWN"; then
    echo "      ├─ $CATCHUP_DELETED_ADVICE"
  fi
  if has_text_conflict shown="$CONFLICTS_LEFT_SHOWN"; then
    echo "      ├─ $CATCHUP_MARKERS_ADVICE"
    print_catchup_stage_advice stage="${STAGE_ALLOWED:-block}" label="settle the rest:"
  fi
  printf '      ├─ %-18s rhx git.branch.catchup take --whos <main|branch> <file>\n' "or take a side:"
fi
printf '      └─ %-18s rhx git.branch.catchup continue\n' "then:"
