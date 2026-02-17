#!/usr/bin/env bash
######################################################################
# .what = turtle vibes output helpers for condense skill
#
# .why  = consistent, fun output format across all condense output
#
# usage:
#   source output.sh
#   print_turtle_header "cowabunga!"
#   print_tree_start "condense"
#   print_tree_branch "result"
#   print_tree_leaf "dens.Δ" "+5.1"
######################################################################

# print turtle emoji + phrase
# usage: print_turtle_header "cowabunga!"
print_turtle_header() {
  local phrase="$1"
  echo "🐢 $phrase"
  echo ""
}

# print tree root with shell emoji
# usage: print_tree_start "condense"
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

# print quality indicator
# usage: print_quality_indicator "stable" "σ < 3.0"
print_quality_indicator() {
  local status="$1"
  local reason="$2"
  echo "   └─ quality: ✓ $status ($reason)"
}

# print warn indicator
# usage: print_quality_warn "unstable" "σ > 3.0"
print_quality_warn() {
  local status="$1"
  local reason="$2"
  echo "   └─ quality: ⚠ $status ($reason)"
}

# print instruction block (after tree)
# usage: print_instruction "to apply, re-run with:" "  $ rhx condense path/to/brief.md --mode apply"
print_instruction() {
  local header="$1"
  local command="$2"
  echo ""
  echo "$header"
  echo "$command"
}

# spinner state
SPINNER_PID=""

# start a spinner with elapsed time
# usage: start_spinner "kernelize source"
start_spinner() {
  local message="$1"
  (
    local frames=("🌊" "🫧" "🌊" "🐢" "🤙")
    local frame_count=${#frames[@]}
    local i=0
    local start_time=$(date +%s)
    # hide cursor
    tput civis 2>/dev/null || true
    while true; do
      local now=$(date +%s)
      local elapsed=$((now - start_time))
      # move to start of line, clear, then print
      printf "\r\033[K   %s %s (%ds)" "${frames[$i]}" "$message" "$elapsed"
      i=$(( (i + 1) % frame_count ))
      sleep 0.4
    done
  ) &
  SPINNER_PID=$!
}

# stop the spinner
# usage: stop_spinner
stop_spinner() {
  if [[ -n "$SPINNER_PID" ]]; then
    kill "$SPINNER_PID" 2>/dev/null || true
    wait "$SPINNER_PID" 2>/dev/null || true
    # show cursor again, clear line
    tput cnorm 2>/dev/null || true
    printf "\r\033[K"
    SPINNER_PID=""
  fi
}
