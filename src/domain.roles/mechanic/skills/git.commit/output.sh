#!/usr/bin/env bash
######################################################################
# .what = turtle vibes output helpers for git.commit skills
#
# .why  = consistent, fun output format across all git.commit commands
#
# usage:
#   source output.sh
#   print_turtle_header "cowabunga!"
#   print_tree_start "git.commit.set"
#   print_tree_branch "commit"
#   print_tree_leaf "header" "fix(api): validate input"
######################################################################

# print turtle emoji + phrase
# usage: print_turtle_header "cowabunga!"
print_turtle_header() {
  local phrase="$1"
  echo "🐢 $phrase"
  echo ""
}

# print tree root with shell emoji
# usage: print_tree_start "git.commit.set"
print_tree_start() {
  local command="$1"
  echo "🐚 $command"
}

# print tree branch (has children)
# usage: print_tree_branch "commit" [is_last]
print_tree_branch() {
  local label="$1"
  local is_last="${2:-false}"
  if [[ "$is_last" == "true" ]]; then
    echo "   └─ $label"
  else
    echo "   ├─ $label"
  fi
}

# print tree leaf (no children, with value)
# usage: print_tree_leaf "header" "fix(api): validate" [prefix] [is_last]
print_tree_leaf() {
  local key="$1"
  local value="$2"
  local prefix="${3:-│  }"
  local is_last="${4:-false}"
  if [[ "$is_last" == "true" ]]; then
    echo "${prefix}└─ $key: $value"
  else
    echo "${prefix}├─ $key: $value"
  fi
}

# print nested tree leaf (deeper nesting)
# usage: print_nested_leaf "remaining" "2 (push: blocked)" [is_last]
print_nested_leaf() {
  local key="$1"
  local value="$2"
  local is_last="${3:-true}"
  if [[ "$is_last" == "true" ]]; then
    echo "   └─ $key: $value"
  else
    echo "   ├─ $key: $value"
  fi
}

# print error in tree format
# usage: print_tree_error "no commit uses remaining"
print_tree_error() {
  local message="$1"
  echo "   └─ error: $message"
}

# print instruction block (after tree)
# usage: print_instruction "ask your human to grant more:" "  $ git.commit.uses set ..."
print_instruction() {
  local header="$1"
  local command="$2"
  echo ""
  echo "$header"
  echo "$command"
}
