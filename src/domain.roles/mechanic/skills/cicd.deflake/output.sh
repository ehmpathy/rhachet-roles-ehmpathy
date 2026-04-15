#!/usr/bin/env bash
######################################################################
# .what = turtle vibes output for cicd.deflake skill
#
# .why  = consistent, fun output format for deflake workflow
#
# usage:
#   source output.sh
#   print_turtle_header "cowabunga!"
#   print_tree_start "cicd.deflake init"
#   print_tree_branch "route" ".behavior/v2026_04_11.cicd-deflake/ ✨"
#   print_coconut "hang ten! we'll ride this in"
######################################################################

# print turtle emoji + phrase
# usage: print_turtle_header "cowabunga!"
print_turtle_header() {
  local phrase="$1"
  echo "🐢 $phrase"
  echo ""
}

# print tree root with shell emoji
# usage: print_tree_start "cicd.deflake init"
print_tree_start() {
  local command="$1"
  echo "🐚 $command"
}

# print tree branch (has children)
# usage: print_tree_branch "route" ".behavior/v2026_04_11.cicd-deflake/ ✨" [is_last]
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
# usage: print_tree_leaf "1.evidence.stone" "" [prefix] [is_last]
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
# usage: print_coconut "hang ten! we'll ride this in" "branch main <-> route .behavior/..." [dimmed]
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
# usage: print_error "not in a git repo" "cicd.deflake detect"
print_error() {
  local message="$1"
  local command="${2:-cicd.deflake}"
  echo "🐢 bummer dude..."
  echo ""
  echo "🐚 $command"
  echo "   └─ error: $message"
}

# print flake inventory item
# usage: print_flake_item "symlink.integration.test.ts" "5" "EEXIST: file already exists"
print_flake_item() {
  local test_name="$1"
  local count="$2"
  local error="$3"
  local is_last="${4:-false}"
  if [[ "$is_last" == "true" ]]; then
    echo "   └─ $test_name ($count occurrences)"
  else
    echo "   ├─ $test_name ($count occurrences)"
  fi
  echo "      └─ error: $error"
}
