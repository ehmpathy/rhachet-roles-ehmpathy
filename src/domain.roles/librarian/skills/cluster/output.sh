#!/usr/bin/env bash
######################################################################
# .what = turtle vibes output helpers for cluster skill
#
# .why  = consistent, fun output format across all cluster output
#
# usage:
#   source output.sh
#   print_turtle_header "cowabunga!"
#   print_tree_start "cluster"
#   print_tree_branch "result"
#   print_tree_leaf "cluster.count" "7"
######################################################################

# print turtle emoji + phrase
# usage: print_turtle_header "cowabunga!"
print_turtle_header() {
  local phrase="${1:-righteous!}"
  echo "🐢 $phrase"
  echo ""
}

# start a tree output section
# usage: print_tree_start "cluster"
print_tree_start() {
  local name="$1"
  echo "$name"
}

# print a tree branch (intermediate node)
# usage: print_tree_branch "result"
print_tree_branch() {
  local name="$1"
  echo "├── $name"
}

# print a tree leaf (terminal node with value)
# usage: print_tree_leaf "cluster.count" "7"
print_tree_leaf() {
  local name="$1"
  local value="$2"
  echo "│   ├── $name = $value"
}

# print the last tree leaf (uses └── instead of ├──)
# usage: print_tree_leaf_last "rationale" "semantic group"
print_tree_leaf_last() {
  local name="$1"
  local value="$2"
  echo "│   └── $name = $value"
}

# print a cluster entry
# usage: print_cluster "1" "dependency injection via context" "3"
print_cluster() {
  local index="$1"
  local representative="$2"
  local member_count="$3"
  echo "│   ├── [$index] $representative ($member_count members)"
}

# print the last cluster entry
# usage: print_cluster_last "7" "use arrow functions" "2"
print_cluster_last() {
  local index="$1"
  local representative="$2"
  local member_count="$3"
  echo "│   └── [$index] $representative ($member_count members)"
}
