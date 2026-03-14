#!/usr/bin/env bash
######################################################################
# .what = shared output helpers for fileops skills
#
# .why = consistent tree-format output across cpsafe, mvsafe, rmsafe
#        - turtle header shows vibe (sweet, crickets, heres the wave)
#        - shell header shows skill name
#        - tree branches show params and results
#
# usage:
#   source output.sh
#   print_turtle_header "sweet"
#   print_tree_start "cpsafe"
#   print_tree_branch "from" "src/*.md"
#   print_tree_leaf "copied"
#   print_tree_file_line "a.md -> dest/a.md"
######################################################################

# print turtle header
# usage: print_turtle_header "sweet" | "crickets..." | "heres the wave..."
print_turtle_header() {
  local phrase="$1"
  echo "🐢 $phrase"
  echo ""
}

# print shell header with skill name
# usage: print_tree_start "cpsafe"
print_tree_start() {
  local skill="$1"
  echo "🐚 $skill"
}

# print tree branch (not last item)
# usage: print_tree_branch "from" "src/*.md"
print_tree_branch() {
  local key="$1"
  local value="$2"
  echo "   ├─ $key: $value"
}

# print tree leaf (last item or section header)
# usage: print_tree_leaf "copied"
print_tree_leaf() {
  local content="$1"
  echo "   └─ $content"
}

# print file operation line under verb
# usage: print_tree_file_line "src/a.md -> dest/a.md" false  # not last
# usage: print_tree_file_line "src/a.md -> dest/a.md" true   # last
print_tree_file_line() {
  local content="$1"
  local is_last="${2:-false}"
  if [[ "$is_last" == "true" ]]; then
    echo "      └─ $content"
  else
    echo "      ├─ $content"
  fi
}
