#!/usr/bin/env bash
######################################################################
# .what = turtle vibes output for review skills
#
# .why  = consistent output format across all review commands
#
# usage:
#   source output.sh
#   print_turtle_header "cowabunga!"
#   print_tree_start "review.by"
######################################################################

# print turtle emoji + phrase
# usage: print_turtle_header "cowabunga!"
print_turtle_header() {
  local phrase="$1"
  echo ""
  echo "🐢 $phrase"
  echo ""
}

# print shell root
# usage: print_tree_start "review.by" "--role mechanic"
print_tree_start() {
  local skill_name="$1"
  local args="${2:-}"
  if [[ -n "$args" ]]; then
    echo "🐚 $skill_name $args"
  else
    echo "🐚 $skill_name"
  fi
}

# print tree branch with peers below
# usage: print_tree_branch "key" "value"
print_tree_branch() {
  local key="$1"
  local value="${2:-}"
  if [[ -n "$value" ]]; then
    echo "   ├─ $key: $value"
  else
    echo "   ├─ $key"
  fi
}

# print tree leaf (last branch)
# usage: print_tree_leaf "key" "value"
print_tree_leaf() {
  local key="$1"
  local value="${2:-}"
  if [[ -n "$value" ]]; then
    echo "   └─ $key: $value"
  else
    echo "   └─ $key"
  fi
}

# print nested branch
# usage: print_nested_branch "text" "indent_level"
print_nested_branch() {
  local text="$1"
  local level="${2:-1}"
  local indent=""
  for ((i=0; i<level; i++)); do
    indent+="   "
  done
  echo "${indent}├─ $text"
}

# print nested leaf
# usage: print_nested_leaf "text" "indent_level"
print_nested_leaf() {
  local text="$1"
  local level="${2:-1}"
  local indent=""
  for ((i=0; i<level; i++)); do
    indent+="   "
  done
  echo "${indent}└─ $text"
}
