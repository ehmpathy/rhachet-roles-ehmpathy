#!/usr/bin/env bash
######################################################################
# .what = review aggregator skill for role-based rubric reviews
#
# .why  = composes atomic rubric skills:
#         - runs all rubrics in parallel by default
#         - supports single rubric via --for
#         - outputs turtle vibes with blocker/nitpick counts
#         - compatible with route guard reviewed? mechanism
#
# usage:
#   rhx review.by --role mechanic --paths 'src/**/*.ts'
#   rhx review.by --role mechanic --for mech-failhides --paths 'src/**/*.ts'
#   rhx review.by --role mechanic --diffs since-main --mode pull
#   rhx review.by --help
#
# guarantee:
#   - runs rubric skills in parallel
#   - aggregates exit codes (2 > 1 > 0)
#   - outputs guard-compatible blocker/nitpick counts
#   - exit codes: 0=pass, 1=malfunction, 2=findings
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"

# parse arguments
ROLE=""
FOR_SLUG=""
PASSTHROUGH_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --role)
      ROLE="$2"
      shift 2
      ;;
    --for)
      FOR_SLUG="$2"
      shift 2
      ;;
    --help|-h)
      print_turtle_header "at your service"
      print_tree_start "review.by" "--help"
      echo "   ├─ .what"
      echo "   │  └─ review aggregator for role-based rubric reviews"
      echo "   ├─ usage"
      echo "   │  └─ rhx review.by --role <role> [--for <slug>] [passthrough args...]"
      echo "   ├─ required"
      echo "   │  └─ --role <role>    role slug: mechanic, architect, ergonomist"
      echo "   ├─ optional"
      echo "   │  ├─ --for <slug>     run specific rubric only (default: all)"
      echo "   │  ├─ --paths <glob>   target paths (forwarded to rubric skills)"
      echo "   │  ├─ --diffs <range>  diff scope (forwarded to rubric skills)"
      echo "   │  ├─ --mode <mode>    pull or push (forwarded to rubric skills)"
      echo "   │  └─ --help           show this help"
      echo "   └─ examples"
      echo "      ├─ rhx review.by --role mechanic --paths 'src/**/*.ts'"
      echo "      ├─ rhx review.by --role mechanic --for mech-failhides --diffs since-main"
      echo "      └─ rhx review.by --role architect --mode pull --paths 'src/**/*.ts'"
      exit 0
      ;;
    *)
      PASSTHROUGH_ARGS+=("$1")
      shift
      ;;
  esac
done

# validate required args
if [[ -z "$ROLE" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "review.by"
  print_tree_leaf "error" "--role is required"
  exit 2
fi

# lookup role directory (we're in $ROLE/skills/review/, go up 2 levels)
ROLE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ROLE_DIR_NAME="$(basename "$ROLE_DIR")"

# extract role name (handles both "mechanic" and "role=mechanic" formats)
if [[ "$ROLE_DIR_NAME" == role=* ]]; then
  ACTUAL_ROLE="${ROLE_DIR_NAME#role=}"
else
  ACTUAL_ROLE="$ROLE_DIR_NAME"
fi

# validate role matches
if [[ "$ROLE" != "$ACTUAL_ROLE" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "review.by" "--role $ROLE"
  print_tree_leaf "error" "unknown role '$ROLE'. valid roles: mechanic, architect, ergonomist"
  exit 2
fi

# lookup rubrics.yml
RUBRICS_YML="$ROLE_DIR/briefs/reviews/rubrics.yml"
if [[ ! -f "$RUBRICS_YML" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "review.by" "--role $ROLE"
  print_tree_leaf "error" "rubrics.yml not found at $RUBRICS_YML"
  exit 2
fi

# extract rubric slugs from yaml (simple grep for slug: lines)
mapfile -t RUBRIC_SLUGS < <(grep -E '^\s*-?\s*slug:' "$RUBRICS_YML" | sed 's/.*slug:\s*//' | tr -d ' ')

if [[ ${#RUBRIC_SLUGS[@]} -eq 0 ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "review.by" "--role $ROLE"
  print_tree_leaf "error" "no rubrics found in $RUBRICS_YML"
  exit 2
fi

# if --for specified, filter to single rubric
if [[ -n "$FOR_SLUG" ]]; then
  FOUND=false
  for slug in "${RUBRIC_SLUGS[@]}"; do
    if [[ "$slug" == "$FOR_SLUG" ]]; then
      FOUND=true
      RUBRIC_SLUGS=("$FOR_SLUG")
      break
    fi
  done
  if [[ "$FOUND" == "false" ]]; then
    print_turtle_header "bummer dude..."
    print_tree_start "review.by" "--role $ROLE --for $FOR_SLUG"
    print_tree_leaf "error" "rubric not found: $FOR_SLUG"
    exit 2
  fi
fi

# create temp dir for outputs
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# run rubric skills in parallel (associative array keyed by slug to avoid index misalignment)
declare -A PIDS
for slug in "${RUBRIC_SLUGS[@]}"; do
  RUBRIC_SKILL="$ROLE_DIR/skills/review/review.rubric=$slug.sh"
  if [[ ! -f "$RUBRIC_SKILL" ]]; then
    echo "warning: rubric skill not found: $RUBRIC_SKILL" >&2
    continue
  fi

  # run in background, capture output
  bash "$RUBRIC_SKILL" "${PASSTHROUGH_ARGS[@]}" > "$TMPDIR/$slug.out" 2>&1 &
  PIDS[$slug]=$!
done

# wait for all and collect exit codes
declare -A EXIT_CODES
for slug in "${RUBRIC_SLUGS[@]}"; do
  pid="${PIDS[$slug]:-}"
  if [[ -n "$pid" ]]; then
    wait "$pid" && EXIT_CODES[$slug]=0 || EXIT_CODES[$slug]=$?
  fi
done

# parse blockers/nitpicks from each output
declare -A BLOCKERS
declare -A NITPICKS
TOTAL_BLOCKERS=0
TOTAL_NITPICKS=0

for slug in "${RUBRIC_SLUGS[@]}"; do
  if [[ -f "$TMPDIR/$slug.out" ]]; then
    # parse blocker count (regex: N blockers or blockers: N)
    blocker_count=$(grep -oE '([0-9]+)\s*blockers?' "$TMPDIR/$slug.out" | head -1 | grep -oE '[0-9]+' || echo 0)
    nitpick_count=$(grep -oE '([0-9]+)\s*nitpicks?' "$TMPDIR/$slug.out" | head -1 | grep -oE '[0-9]+' || echo 0)

    BLOCKERS[$slug]=${blocker_count:-0}
    NITPICKS[$slug]=${nitpick_count:-0}
    TOTAL_BLOCKERS=$((TOTAL_BLOCKERS + ${BLOCKERS[$slug]}))
    TOTAL_NITPICKS=$((TOTAL_NITPICKS + ${NITPICKS[$slug]}))
  fi
done

# determine overall status
if [[ $TOTAL_BLOCKERS -gt 0 ]]; then
  print_turtle_header "bummer dude..."
  FINAL_EXIT=2
elif [[ $TOTAL_NITPICKS -gt 0 ]]; then
  print_turtle_header "heads up..."
  FINAL_EXIT=0
else
  print_turtle_header "cowabunga!"
  FINAL_EXIT=0
fi

# output tree
if [[ -n "$FOR_SLUG" ]]; then
  print_tree_start "review.by" "--role $ROLE --for $FOR_SLUG"
else
  print_tree_start "review.by" "--role $ROLE"
fi

echo "   ├─ rubrics"

for i in "${!RUBRIC_SLUGS[@]}"; do
  slug="${RUBRIC_SLUGS[$i]}"
  exit_code="${EXIT_CODES[$slug]:-0}"
  blocker_count="${BLOCKERS[$slug]:-0}"
  nitpick_count="${NITPICKS[$slug]:-0}"

  # determine rubric status
  if [[ $exit_code -eq 0 && $blocker_count -eq 0 && $nitpick_count -eq 0 ]]; then
    status="✓"
  else
    status="✗"
  fi

  # last rubric?
  if [[ $i -eq $((${#RUBRIC_SLUGS[@]} - 1)) ]]; then
    prefix="   │  └─"
  else
    prefix="   │  ├─"
  fi

  if [[ "$status" == "✓" ]]; then
    echo "$prefix r$((i+1)) $slug $status"
  else
    echo "$prefix r$((i+1)) $slug $status"
    # show counts - determine branch characters based on what follows
    has_nitpicks=$([[ $nitpick_count -gt 0 ]] && echo true || echo false)

    if [[ $blocker_count -gt 0 ]]; then
      # use ├─ if nitpicks follow, └─ if blockers are last child
      blocker_branch=$([[ "$has_nitpicks" == "true" ]] && echo "├─" || echo "└─")
      if [[ $i -eq $((${#RUBRIC_SLUGS[@]} - 1)) ]]; then
        echo "   │     $blocker_branch $blocker_count blockers 🔴"
      else
        echo "   │  │  $blocker_branch $blocker_count blockers 🔴"
      fi
    fi
    if [[ $nitpick_count -gt 0 ]]; then
      if [[ $i -eq $((${#RUBRIC_SLUGS[@]} - 1)) ]]; then
        echo "   │     └─ $nitpick_count nitpicks 🟠"
      else
        echo "   │  │  └─ $nitpick_count nitpicks 🟠"
      fi
    fi
  fi
done

# summary (guard-compatible format)
echo "   └─ summary"
echo "      ├─ $TOTAL_BLOCKERS blockers 🔴"
echo "      └─ $TOTAL_NITPICKS nitpicks 🟠"

exit $FINAL_EXIT
