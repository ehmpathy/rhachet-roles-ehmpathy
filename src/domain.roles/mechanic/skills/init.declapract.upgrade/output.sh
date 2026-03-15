#!/usr/bin/env bash
######################################################################
# .what = turtle vibes output for init.declapract.upgrade skill
#
# .why  = consistent, fun output format for route instantiation
#
# usage:
#   source output.sh
#   print_turtle_header "radical!"
#   print_tree_start "init.declapract.upgrade"
#   print_tree_branch "route" ".route/v2026_03_13.declapract.upgrade/ ✨"
#   print_coconut "hang ten! we'll ride this in"
######################################################################

# print turtle emoji + phrase
# usage: print_turtle_header "radical!"
print_turtle_header() {
  local phrase="$1"
  echo "🐢 $phrase"
  echo ""
}

# print tree root with shell emoji
# usage: print_tree_start "init.declapract.upgrade"
print_tree_start() {
  local command="$1"
  echo "🐚 $command"
}

# print tree branch (has children)
# usage: print_tree_branch "route" ".route/v2026_03_13.declapract.upgrade/ ✨" [is_last]
print_tree_branch() {
  local key="$1"
  local value="$2"
  local is_last="${3:-false}"
  if [[ "$is_last" == "true" ]]; then
    echo "   └─ $key: $value"
  else
    echo "   ├─ $key: $value"
  fi
}

# print tree leaf (no children, with value)
# usage: print_tree_leaf "1.upgrade.invoke.sh" "(chmod 555)" [prefix] [is_last]
print_tree_leaf() {
  local key="$1"
  local value="${2:-}"
  local prefix="${3:-   │  }"
  local is_last="${4:-false}"
  if [[ -n "$value" ]]; then
    if [[ "$is_last" == "true" ]]; then
      echo "${prefix}└─ $key $value"
    else
      echo "${prefix}├─ $key $value"
    fi
  else
    if [[ "$is_last" == "true" ]]; then
      echo "${prefix}└─ $key"
    else
      echo "${prefix}├─ $key"
    fi
  fi
}

# print simple tree item (just a label, no value)
# usage: print_tree_item "created" [is_last]
print_tree_item() {
  local label="$1"
  local is_last="${2:-false}"
  if [[ "$is_last" == "true" ]]; then
    echo "   └─ $label"
  else
    echo "   ├─ $label"
  fi
}

# print coconut footer with message and optional dimmed bound info
# usage: print_coconut "hang ten! we'll ride this in" "branch main <-> route .route/..." [dimmed]
print_coconut() {
  local message="$1"
  local bound="${2:-}"
  echo ""
  echo "🥥 $message"
  if [[ -n "$bound" ]]; then
    # \033[2m = dim, \033[0m = reset
    echo -e "   └─ \033[2m$bound\033[0m"
  fi
}

# print error message
# usage: print_error "not a declapract repo"
print_error() {
  local message="$1"
  echo "🐢 bummer dude"
  echo ""
  echo "   └─ error: $message"
}
