#!/usr/bin/env bash
######################################################################
# .what = turtle vibes output helpers for brief.compress skill
#
# .why  = consistent, fun output format across all brief.compress output
#
# usage:
#   source output.sh
#   print_turtle_header "cowabunga!"
#   print_tree_start "brief.compress"
#   print_tree_branch "result"
#   print_tree_leaf "tokens.before" "1200"
######################################################################

# print turtle emoji + phrase
# usage: print_turtle_header "cowabunga!"
print_turtle_header() {
  local phrase="$1"
  echo "🐢 $phrase"
  echo ""
}

# print tree root with shell emoji
# usage: print_tree_start "brief.compress"
print_tree_start() {
  local command="$1"
  echo "🐚 $command"
}

# print tree branch (has children)
# usage: print_tree_branch "result" [is_last]
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
# usage: print_tree_leaf "tokens.before" "1200" [prefix] [is_last]
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

# print nested tree leaf (deeper level)
# usage: print_nested_leaf "ratio.actual" "3.8x" [is_last]
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
# usage: print_tree_error "file not found"
print_tree_error() {
  local message="$1"
  echo "   └─ error: $message"
}

# print instruction block (after tree)
# usage: print_instruction "to apply, re-run with:" "  $ rhx brief.compress path/to/brief.md --mode apply"
print_instruction() {
  local header="$1"
  local command="$2"
  echo ""
  echo "$header"
  echo "$command"
}
