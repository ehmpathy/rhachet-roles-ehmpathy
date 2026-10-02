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

# print a tree node whose glyph states whether a peer follows beneath it
# usage: print_tree_node "results" true    # none follows -> └─
# usage: print_tree_node "results" false   # a peer follows -> ├─
#
# .what = a bare section header whose last-ness varies at runtime
# .why  = `print_tree_branch` needs a key and a value. without this, callers
#         hand-roll the glyph and drift from this file's indent.
print_tree_node() {
  local content="$1"
  local is_last="${2:-true}"
  if [[ "$is_last" == "true" ]]; then
    echo "   └─ $content"
  else
    echo "   ├─ $content"
  fi
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

# print coconut hint section
# usage: print_coconut_hint "trash/path/to/file.ts" "./path/to/file.ts"
print_coconut_hint() {
  local trash_path="$1"
  local restore_dest="$2"
  echo ""
  echo "🥥 did you know?"
  echo "   ├─ you can restore from trash"
  echo "   └─ rhx cpsafe $trash_path $restore_dest"
}

# .what = is an absolute path the repo root, or beneath it?
# .why  = the repo boundary is a security invariant; one producer, so a fix
#         to it (a symlink escape, a normalization gap) lands at every gate
# .note = both paths must already be realpath-expanded; the `/` suffix
#         keeps `/repo-evil` from a pass as a child of `/repo`
# usage: is_path_within_repo_root --path "$abs" --root "$REPO_ROOT"
is_path_within_repo_root() {
  local path="" root=""
  while [[ $# -gt 0 ]]; do
    case $1 in
      --path) path="$2"; shift 2 ;;
      --root) root="$2"; shift 2 ;;
      *) echo "is_path_within_repo_root: unknown arg: $1" >&2; return 1 ;;
    esac
  done
  [[ "$path" == "$root" || "$path" == "$root/"* ]]
}

# .what = render a refusal on the streams its output mode permits
# .why  = one place makes the choice, so no refusal path can miss it
# .note = a declared deviation from `rule.require.skill-output-streams`:
#         under `--output pipeable`, stdout is data, so a refusal there would
#         read as a result. pipeable refusals go to stderr only.
#         vibes mode writes both streams, per the rule.
# .note = two echoes, not `| tee /dev/stderr`: tee fails when stderr is a
#         pipe (every spawnSync caller) and turns exit 2 into exit 1
# usage: emit_refusal_to_streams --mode vibes --vibes "$frame" --plain "$text"
emit_refusal_to_streams() {
  local mode="" vibes="" plain=""
  while [[ $# -gt 0 ]]; do
    case $1 in
      --mode) mode="$2"; shift 2 ;;
      --vibes) vibes="$2"; shift 2 ;;
      --plain) plain="$2"; shift 2 ;;
      *) echo "emit_refusal_to_streams: unknown arg: $1" >&2; return 1 ;;
    esac
  done
  if [[ "$mode" == "pipeable" ]]; then
    echo "$plain" >&2
    return 0
  fi
  echo "$vibes"
  echo "$vibes" >&2
}

# .what = render the house refusal frame: turtle, shell tree, coconut hint
# .why  = every refusal reads the same way — fault in the tree, fix under 🥥
# .note = the diagnosis's first line is the headline; each later line is a
#         detail, rendered as a sub-branch with its indent trimmed
# usage: print_refusal_frame --skill grepsafe --diagnosis "$d" \
#          --affordance "name one mode" --command "grepsafe.sh --output pipeable"
print_refusal_frame() {
  local skill="" diagnosis="" affordance="" command=""
  while [[ $# -gt 0 ]]; do
    case $1 in
      --skill) skill="$2"; shift 2 ;;
      --diagnosis) diagnosis="$2"; shift 2 ;;
      --affordance) affordance="$2"; shift 2 ;;
      --command) command="$2"; shift 2 ;;
      *) echo "print_refusal_frame: unknown arg: $1" >&2; return 1 ;;
    esac
  done

  # split the headline from its details
  local headline="${diagnosis%%$'\n'*}"
  local details=()
  if [[ "$diagnosis" == *$'\n'* ]]; then
    local line
    while IFS= read -r line; do
      line="${line#"${line%%[![:space:]]*}"}"
      [[ -n "$line" ]] && details+=("$line")
    done <<< "${diagnosis#*$'\n'}"
  fi

  # the fault, in the tree
  print_turtle_header "bummer dude..."
  print_tree_start "$skill"
  print_tree_leaf "$headline"
  local i
  for i in "${!details[@]}"; do
    local is_last=false
    [[ "$i" -eq $((${#details[@]} - 1)) ]] && is_last=true
    print_tree_file_line "${details[$i]}" "$is_last"
  done

  # the fix, under the coconut
  echo ""
  echo "🥥 did you know?"
  echo "   ├─ $affordance"
  echo "   └─ $command"
}

# print error message to both stdout and stderr
# usage: emit_error "path is required"
# usage: emit_error "usage: rmsafe.sh <path>"
emit_error() {
  local message="$1"
  echo "$message"      # stdout
  echo "$message" >&2  # stderr
}
