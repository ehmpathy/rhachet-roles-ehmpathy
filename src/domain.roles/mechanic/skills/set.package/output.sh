#!/usr/bin/env bash
######################################################################
# .what = turtle vibes output functions for set.package skills
#
# .why  = consistent, fun output format across all set.package commands
#
# usage:
#   source output.sh
#   print_turtle_header "shell yeah!"
#   print_tree_start "set.package.install"
#   print_tree_branch "package" "zod"
#   print_tree_leaf "version" "3.22.4"
######################################################################

# output stream (set to "stderr" for error output)
OUTPUT_STREAM="stdout"

# helper to echo to the correct stream
_echo() {
  if [[ "$OUTPUT_STREAM" == "stderr" ]]; then
    echo "$@" >&2
  else
    echo "$@"
  fi
}

# print turtle emoji + phrase
# usage: print_turtle_header "shell yeah!"
print_turtle_header() {
  local phrase="$1"
  _echo "🐢 $phrase"
  _echo ""
}

# print tree root with shell emoji
# usage: print_tree_start "set.package.install"
print_tree_start() {
  local command="$1"
  _echo "🐚 $command"
}

# print tree branch (has children)
# usage: print_tree_branch "label" [is_last]
print_tree_branch() {
  local label="$1"
  local is_last="${2:-false}"
  if [[ "$is_last" == "true" ]]; then
    _echo "   └─ $label"
  else
    _echo "   ├─ $label"
  fi
}

# print tree leaf with key: value
# usage: print_tree_leaf "key" "value" [is_last]
print_tree_leaf() {
  local key="$1"
  local value="$2"
  local is_last="${3:-false}"
  if [[ "$is_last" == "true" ]]; then
    _echo "   └─ $key: $value"
  else
    _echo "   ├─ $key: $value"
  fi
}

# print nested branch (indented)
# usage: print_nested_branch "label" [parent_is_last] [is_last]
print_nested_branch() {
  local label="$1"
  local parent_is_last="${2:-false}"
  local is_last="${3:-false}"
  local prefix="   │  "
  if [[ "$parent_is_last" == "true" ]]; then
    prefix="      "
  fi
  if [[ "$is_last" == "true" ]]; then
    _echo "${prefix}└─ $label"
  else
    _echo "${prefix}├─ $label"
  fi
}

# print nested leaf with key: value (indented)
# usage: print_nested_leaf "key" "value" [parent_is_last] [is_last]
print_nested_leaf() {
  local key="$1"
  local value="$2"
  local parent_is_last="${3:-false}"
  local is_last="${4:-true}"
  local prefix="   │  "
  if [[ "$parent_is_last" == "true" ]]; then
    prefix="      "
  fi
  if [[ "$is_last" == "true" ]]; then
    _echo "${prefix}└─ $key: $value"
  else
    _echo "${prefix}├─ $key: $value"
  fi
}

# print doubly nested leaf (for items under nested branches like vulnerabilities under audit)
# usage: print_doubly_nested_leaf "label" [grandparent_is_last] [parent_is_last] [is_last]
print_doubly_nested_leaf() {
  local label="$1"
  local grandparent_is_last="${2:-false}"
  local parent_is_last="${3:-false}"
  local is_last="${4:-false}"

  # build prefix based on grandparent and parent
  local prefix=""
  if [[ "$grandparent_is_last" == "true" ]]; then
    prefix="      "  # no continuation line from grandparent
  else
    prefix="   │  "  # continuation line from grandparent
  fi
  if [[ "$parent_is_last" == "true" ]]; then
    prefix="${prefix}   "  # no continuation line from parent
  else
    prefix="${prefix}│  "  # continuation line from parent
  fi

  if [[ "$is_last" == "true" ]]; then
    _echo "${prefix}└─ $label"
  else
    _echo "${prefix}├─ $label"
  fi
}

# print error message
# usage: print_error "message"
print_error() {
  local message="$1"
  _echo "   └─ error: $message"
}

# print footer message (after tree)
# usage: print_footer "install blocked. choose a safer package or version."
print_footer() {
  local message="$1"
  _echo ""
  _echo "$message"
}
