######################################################################
# .what = goal inference from branch and flags
#
# .why  = determines release goal (from/into) based on:
#         - current branch
#         - explicit --from flag
#         - explicit --into flag
#
# .note = source-only file, defines function for git.release.sh to call
#
# usage:
#   source git.release._.get_one_goal_from_input.sh
#   GOAL=$(get_one_goal_from_input "$CURRENT_BRANCH" "$FLAG_FROM" "$FLAG_INTO")
#   GOAL_FROM=$(echo "$GOAL" | grep -oP '^from=\K.*')
#   GOAL_INTO=$(echo "$GOAL" | grep -oP '^into=\K.*')
#
# output:
#   stdout: "from={feat|main}\ninto={main|prod}"
#
# exits:
#   exit 2: ConstraintError (from=main && into=main)
######################################################################

######################################################################
# get_one_goal_from_input
# infer release goal from current branch and explicit flags
#
# args:
#   $1 = current_branch (e.g., "main", "turtle/feature-x")
#   $2 = flag_from (e.g., "", "main")
#   $3 = flag_into (e.g., "", "main", "prod")
#   $4 = default_branch (e.g., "main", "master")
#
# output:
#   stdout: "from={value}\ninto={value}"
#
# exits:
#   exit 2 with error message if from=main && into=main
######################################################################
get_one_goal_from_input() {
  local current_branch="$1"
  local flag_from="${2:-}"
  local flag_into="${3:-}"
  local default_branch="${4:-main}"

  local goal_from=""
  local goal_into=""

  # determine goal_from
  if [[ -n "$flag_from" ]]; then
    # explicit --from flag
    goal_from="$flag_from"
  elif [[ "$current_branch" == "$default_branch" ]]; then
    # on default branch (main/master)
    goal_from="main"
  else
    # on feature branch
    goal_from="feat"
  fi

  # determine goal_into
  if [[ -n "$flag_into" ]]; then
    # explicit --into flag
    goal_into="$flag_into"
  elif [[ "$goal_from" == "main" ]]; then
    # from main implies to prod
    goal_into="prod"
  else
    # from feat implies to main
    goal_into="main"
  fi

  # validate: cannot merge main into main
  if [[ "$goal_from" == "main" && "$goal_into" == "main" ]]; then
    echo "" >&2
    echo "🐢 hold up dude..." >&2
    echo "" >&2
    echo "   --from main --into main is invalid" >&2
    echo "   you're already on main!" >&2
    echo "" >&2
    echo "   use --from main --into prod to release main to prod" >&2
    echo "" >&2
    exit 2
  fi

  # output as key=value pairs
  echo "from=$goal_from"
  echo "into=$goal_into"
}
