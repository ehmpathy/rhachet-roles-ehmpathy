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

# escape a string for safe interpolation into a JSON string literal
# usage: safe=$(escape_json_string "$raw")
# .why = emit_error and emit_pr_open_guide build `{"error":"%s"}` on the
#        --output json path, and git.commit.set parses that via jq. a raw gh
#        error text with a `"`, `\`, or newline would emit invalid JSON and
#        break the jq parse under `set -o pipefail`. escape backslash, then
#        double-quote, then fold newlines/tabs — mirrors the PR_TITLE_ESCAPED
#        pattern, centralized so every json call site shares one escape.
escape_json_string() {
  local raw="$1"
  raw="${raw//\\/\\\\}"
  raw="${raw//\"/\\\"}"
  raw="${raw//$'\n'/\\n}"
  raw="${raw//$'\r'/\\r}"
  raw="${raw//$'\t'/\\t}"
  printf '%s' "$raw"
}

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

# print tip in dim/muted style
# usage: print_tip "'rhx git.commit.uses del' does the same"
print_tip() {
  local text="$1"
  # \033[2m = dim, \033[0m = reset
  echo -e "   └─ \033[2mtip: $text\033[0m"
}

# pure check: is a value one of the allowed choices? no output, no exit — so the
# membership test is reusable on its own (e.g. a silent branch) without the error
# I/O that validate_enum_arg layers on top (rule.prefer.decomposable-architecture).
# usage: if is_arg_in_enum "$VALUE" choice1 choice2 ...; then ...
is_arg_in_enum() {
  local value="$1"
  shift

  local choice
  for choice in "$@"; do
    [[ "$value" == "$choice" ]] && return 0
  done
  return 1
}

# pure transformer: build the "'a' or 'b'" choice list from the allowed values.
# echoes the list; no exit — so the human-visible list stays reusable and
# testable apart from the guard that emits it.
# usage: list=$(get_enum_choice_list choice1 choice2 ...)
get_enum_choice_list() {
  local list=""
  local choice
  for choice in "$@"; do
    if [[ -z "$list" ]]; then
      list="'$choice'"
    else
      list="$list or '$choice'"
    fi
  done
  echo "$list"
}

# validate an enum-valued flag; on mismatch emit the error (+ optional usage
# line) to BOTH streams and exit 2 (skill-output-streams + exit-code-semantics).
# composes the pure membership check + pure list build with the error I/O, so
# callers get one ergonomic guard while the check and list stay side-effect-free
# and reusable. collapses the copy-pasted --mode/--output/--unstaged/--auth guards
# into one source, so a future text or behavior change cannot drift between them.
# usage: validate_enum_arg "$VALUE" "--flag" "$USAGE_OR_EMPTY" valid1 valid2 ...
validate_enum_arg() {
  local value="$1"
  local flag="$2"
  local usage="$3"
  shift 3

  # accept when the value is one of the allowed choices (pure check)
  if is_arg_in_enum "$value" "$@"; then
    return 0
  fi

  # emit the error (and any usage line) to both streams, then fail fast
  local err="error: $flag must be $(get_enum_choice_list "$@")"
  [[ -n "$usage" ]] && err="$err
$usage"
  echo "$err"
  echo "$err" >&2
  exit 2
}
