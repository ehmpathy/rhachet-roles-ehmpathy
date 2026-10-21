#!/usr/bin/env bash
######################################################################
# .what = turtle vibes output for git.package.patch skills
#
# .why  = one treestruct shape across begin + commit; a refusal
#         reaches both stdout and stderr (rule.require.skill-output-streams)
#
# usage:
#   source "$SKILL_DIR/output.sh"
#   print_turtle_header "shell yeah!"
#   print_tree_start "git.package.patch begin"
#   print_tree_leaf "package" "rhachet@1.48.1"
#   refuse_constraint "git.package.patch begin" "--edit-dir must sit inside the tree" "omit --edit-dir"
######################################################################

# print turtle emoji + phrase, then the gap that ends the vibe block
print_turtle_header() {
  echo "🐢 $1"
  echo ""
}

# print tree root with shell emoji
print_tree_start() {
  echo "🐚 $1"
}

# print a "key: value" branch; pass "true" as $3 for the last branch
print_tree_leaf() {
  local glyph="├─"
  [[ "${3:-false}" == "true" ]] && glyph="└─"
  echo "   $glyph $1: $2"
}

# print a bare branch label; pass "true" as $2 for the last branch
print_tree_branch() {
  local glyph="├─"
  [[ "${2:-false}" == "true" ]] && glyph="└─"
  echo "   $glyph $1"
}

# print a child under a branch; $2 = parent is last, $3 = child is last
print_tree_child() {
  local trunk="│  "
  [[ "${2:-false}" == "true" ]] && trunk="   "
  local glyph="├─"
  [[ "${3:-false}" == "true" ]] && glyph="└─"
  echo "   $trunk$glyph $1"
}

######################################################################
# .what = print a coconut hint: the next move, as its own block
# .why  = the move reads apart from the verdict (rule.require.coconut-hints);
#         the last line is the one a human copies
#
# usage: print_coconut_hint <line> [line...]
######################################################################
print_coconut_hint() {
  echo ""
  echo "🥥 did you know?"
  local count=$#
  local index=0
  local line
  for line in "$@"; do
    index=$((index + 1))
    local glyph="├─"
    [[ $index -eq $count ]] && glyph="└─"
    echo "   $glyph $line"
  done
}

######################################################################
# .what = emit a ConstraintError refusal to stdout + stderr, exit 2
# .why  = the caller must fix the input; the fix is always named
#
# usage: refuse_constraint <root> <message> <fix> [detail lines...]
######################################################################
refuse_constraint() {
  local root="$1"
  local message="$2"
  local fix="$3"
  shift 3
  local block
  block=$(
    print_turtle_header "bummer dude..."
    print_tree_start "$root"
    local glyph="├─"
    [[ $# -eq 0 ]] && glyph="└─"
    echo "   $glyph ✋ ConstraintError: $message"
    local count=$#
    local index=0
    local line
    for line in "$@"; do
      index=$((index + 1))
      glyph="├─"
      [[ $index -eq $count ]] && glyph="└─"
      echo "   $glyph $line"
    done
    print_coconut_hint "$fix"
  )
  REFUSAL_RENDERED="true"
  emit_to_both_streams "$block"
  exit 2
}

######################################################################
# .what = render a crash that no refusal named, to both streams
# .why  = under set -e an unguarded failure would exit 1 with naught on
#         either stream (rule.require.skill-output-streams); a refusal
#         sets REFUSAL_RENDERED, so its exit passes through untouched
#
# usage: trap 'on_exit_render_crash "<root>"' EXIT
######################################################################
on_exit_render_crash() {
  local code=$?
  [[ $code -eq 0 || "${REFUSAL_RENDERED:-false}" == "true" ]] && return 0
  local block
  block=$(
    print_turtle_header "bummer dude..."
    print_tree_start "$1"
    echo "   └─ 💥 MalfunctionError: $1 crashed (exit $code)"
  )
  emit_to_both_streams "$block"
  exit "$code"
}

######################################################################
# .what = write one block to stdout and to stderr
# .why  = `tee /dev/stderr` fails where stderr is a socket (node's
#         spawn gives a child one), and under set -e that failure turns
#         a constraint exit 2 into exit 1; a direct write to fd 2 holds
######################################################################
emit_to_both_streams() {
  printf '%s\n' "$1"
  printf '%s\n' "$1" >&2
}

# the indent that sets a detail block under its "└─ detail" branch
DETAIL_INDENT="         "

######################################################################
# .what = prefix every line of a block with an indent
######################################################################
as_indented_block() {
  local block="$1"
  local indent="$2"
  local line
  while IFS= read -r line; do
    echo "$indent$line"
  done <<<"$block"
}

######################################################################
# .what = emit a MalfunctionError to stdout + stderr, exit 1
# .why  = the system failed (pnpm, fs); show its own error verbatim
#
# usage: refuse_malfunction <root> <message> <detail>
######################################################################
refuse_malfunction() {
  local root="$1"
  local message="$2"
  local detail="$3"
  local block
  block=$(
    print_turtle_header "bummer dude..."
    print_tree_start "$root"
    echo "   ├─ 💥 MalfunctionError: $message"
    echo "   └─ detail"
    as_indented_block "$detail" "$DETAIL_INDENT"
  )
  REFUSAL_RENDERED="true"
  emit_to_both_streams "$block"
  exit 1
}
