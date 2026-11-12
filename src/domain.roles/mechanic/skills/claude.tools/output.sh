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
      *) emit_guard_malfunction "is_path_within_repo_root: unknown arg: $1"; return 1 ;;
    esac
  done
  [[ "$path" == "$root" || "$path" == "$root/"* ]]
}

# .what = is an absolute path a human-held grant: a meter or a bind?
# .why  = `.meter/` holds the grants a human stamps (git.commit.uses,
#         git.release.uses) and `.branch/.bind/` holds a human's binds. a
#         pre-approved file tool that writes there forges a grant the tty
#         guard keeps human-only — a forged release stamp ships to prod
# .note = the path resolves through symlinks first, so a link that points
#         into `.meter/` is caught as the place it writes, never as its name
# .note = exit 0 = a grant, 1 = not a grant, 2 = cannot tell (a bad call or
#         a path realpath cannot expand); a caller must treat 2 as a refusal
# usage: is_path_a_human_grant --path "$abs" --root "$REPO_ROOT"
is_path_a_human_grant() {
  local path="" root=""
  while [[ $# -gt 0 ]]; do
    case $1 in
      --path) path="$2"; shift 2 ;;
      --root) root="$2"; shift 2 ;;
      *) emit_guard_malfunction "is_path_a_human_grant: unknown arg: $1"; return 2 ;;
    esac
  done
  if [[ -z "$path" || -z "$root" ]]; then
    emit_guard_malfunction "is_path_a_human_grant: --path and --root are required"
    return 2
  fi
  local resolved rel
  if ! resolved=$(realpath -m "$path"); then
    emit_guard_malfunction "is_path_a_human_grant: realpath could not expand $path"
    return 2
  fi
  rel="${resolved#"$root"/}"
  case "/$rel" in
    */.meter|*/.meter/*|*/.branch/.bind|*/.branch/.bind/*) return 0 ;;
  esac
  return 1
}

# .what = refuse a write into a human-held grant, on both streams, exit 2
# .why  = one refusal for every file tool, so tee, cp, mv, sed, and symlink
#         cannot drift apart on the one path that forges a grant
# usage: refuse_if_human_grant --skill teesafe --path "$abs" --root "$REPO_ROOT"
refuse_if_human_grant() {
  local skill="" path="" root=""
  while [[ $# -gt 0 ]]; do
    case $1 in
      --skill) skill="$2"; shift 2 ;;
      --path) path="$2"; shift 2 ;;
      --root) root="$2"; shift 2 ;;
      *) emit_guard_malfunction "refuse_if_human_grant: unknown arg: $1"; exit 1 ;;
    esac
  done

  # fail closed: a guard that cannot tell must halt the write, never wave it through
  local verdict=0
  is_path_a_human_grant --path "$path" --root "$root" || verdict=$?
  if [[ "$verdict" -eq 1 ]]; then
    return 0
  fi
  if [[ "$verdict" -ne 0 ]]; then
    exit 1
  fi

  local rel frame
  rel=$(realpath -m "$path")
  rel="${rel#"$root"/}"

  # name the read for the grant refused, so the hint matches the file
  local read_hint="rhx git.commit.uses get"
  case "/$rel" in
    */.meter/git.release.uses*) read_hint="rhx git.release.uses get" ;;
    */.branch/.bind|*/.branch/.bind/*) read_hint="rhx git.commit.bind get" ;;
  esac
  frame=$(
    print_turtle_header "bummer dude..."
    print_tree_start "$skill"
    echo "   └─ ✋ ConstraintError: $rel holds a human's grant; no file tool may write it"
    echo ""
    echo "🥥 did you know?"
    echo "   ├─ only a human grants it, at a terminal; read it instead"
    echo "   └─ $read_hint"
  )
  echo "$frame"
  echo "$frame" >&2
  exit 2
}

# .what = report a grant-guard malfunction on both streams
# .why  = the guard must never fail quiet; a caller that reads stdout alone
#         still sees why the write halted
# usage: emit_guard_malfunction "<what went wrong>"
emit_guard_malfunction() {
  local text="💥 MalfunctionError: $1"
  echo "$text"
  echo "$text" >&2
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
      *) emit_guard_malfunction "emit_refusal_to_streams: unknown arg: $1"; return 1 ;;
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
      *) emit_guard_malfunction "print_refusal_frame: unknown arg: $1"; return 1 ;;
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

# .what = refuse a bad input in the house frame, on both streams
# .why  = a path or arg refusal reads the same as the grant guard beside it:
#         turtle, shell tree, qualified class, then the fix under 🥥
# .note = later lines of the diagnosis render as details under the headline
# usage: emit_constraint_frame --skill cpsafe --diagnosis $'source does not exist: x'
emit_constraint_frame() {
  local skill="" diagnosis=""
  while [[ $# -gt 0 ]]; do
    case $1 in
      --skill) skill="$2"; shift 2 ;;
      --diagnosis) diagnosis="$2"; shift 2 ;;
      *) emit_guard_malfunction "emit_constraint_frame: unknown arg: $1"; return 1 ;;
    esac
  done

  local frame
  frame=$(print_refusal_frame --skill "$skill" \
    --diagnosis "✋ ConstraintError: $diagnosis" \
    --affordance "see every form $skill takes, with examples" \
    --command "rhx $skill --help")
  echo "$frame"
  echo "$frame" >&2
}

# print error message to both stdout and stderr
# usage: emit_error "path is required"
# usage: emit_error "usage: rmsafe.sh <path>"
emit_error() {
  local message="$1"
  echo "$message"      # stdout
  echo "$message" >&2  # stderr
}
