#!/usr/bin/env bash
######################################################################
# .what = the render + read operations the permission surfaces share
#
# .why  = the check-permissions hook and the permissions.get skill each
#         held their own copy of the frame, the tree renderer, the
#         `.claude` walk, the allowlist filter, the pattern head, and
#         the marker key. a
#         tree-shape rule (rule.forbid.treestruct-header-gap, …indented-
#         text-as-children) then had to be mirrored by hand into each
#         copy. one sourced lib makes each shape land once.
#
# .how  = sourced, never run, by:
#           inits/claude.hooks/pretooluse.check-permissions.sh
#           inits/claude.hooks/sessionstart.notify-permissions.sh
#           skills/permissions.get.sh
#           skills/permissions.nudges.sh
#
# .note = it sets no shell options; each caller owns its own `set -euo
#         pipefail` and its own exit-code contract
######################################################################

# the allowlist filter: the Bash patterns of one settings file, one per line, unwrapped
# .note = one jq program shared by the gate and the lookup, so they cannot disagree on what
#         a settings file allows
BASH_PATTERNS_FILTER='.permissions.allow // [] | .[] | select(startswith("Bash(")) | sub("^Bash\\("; "") | sub("\\)$"; "")'

# the command a pattern names, with any `:*` prefix marker dropped
# .note = named arg `pattern=`; sets the global PATTERN_COMMAND
as_pattern_command() {
  local pattern=""
  local "$@"
  PATTERN_COMMAND="$pattern"
  [[ "$pattern" == *":*" ]] && PATTERN_COMMAND="${pattern%:*}"
  return 0
}

# the head a pattern belongs to: the first word of its command
# .why = the notice groups by head and the lookup files a head under it; one definition, so a
#        change to what a head is lands in both
# .note = named arg `pattern=`; sets the globals PATTERN_COMMAND and PATTERN_HEAD
as_pattern_head() {
  local pattern=""
  local "$@"
  as_pattern_command pattern="$pattern"
  PATTERN_HEAD="${PATTERN_COMMAND%% *}"
  return 0
}

# the marker key, rendered once under any `[e]` / `[p]` pattern
# .why = `[e] jq` read as "jq is paved" when only a bare jq is
MARKER_KEY="key: [e] = the whole part must match exactly · [p] = the part must start with it"

# print lines inside one blank line above and below
# .why = every caller-faced render (block, advisory, malfunction, lookup) shares one frame
# .note = never fails: a write to a closed stream is dropped, so the caller's exit code holds
print_framed() {
  { printf '\n'; printf '%s\n' "$@"; printf '\n'; } || true
  return 0
}

# print lines, framed, to stdout and stderr both
# .why = a failure reaches both streams (rule.require.skill-output-streams)
# .note = never fails: a closed stream must not skip the exit that follows every call
print_to_both() {
  print_framed "$@" || true
  print_framed "$@" >&2 || true
  return 0
}

# the nearest .claude dir at or above $PWD
# .note = ${dir%/*} strips one segment in-shell at zero forks; it yields "" at the root where
#         dirname yields "/", so the -z guard is required — without it the loop never ends
get_claude_dir() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.claude" ]]; then
      echo "$dir/.claude"
      return 0
    fi
    dir="${dir%/*}"
    [[ -z "$dir" ]] && dir="/"
  done
  return 1
}

# draw the tree's top-level entries onto OUT, below a header already in OUT
# .what = each arg is an entry: a label line, then zero or more item lines, newline-joined;
#         an empty arg is a `│` spacer between sections
# .why = peers sit at one depth; a label owns its items as children one level down — items
#        drawn as indented text read as loose words, not as members of the list
#        (ergonomist rule.forbid.treestruct-indented-text-as-children)
render_tree_entries() {
  local -a entries=("$@")
  local k last=-1
  for k in "${!entries[@]}"; do
    [[ -n "${entries[k]}" ]] && last=$k
  done
  for k in "${!entries[@]}"; do
    # a spacer
    if [[ -z "${entries[k]}" ]]; then
      OUT+=("   │")
      continue
    fi

    # the label, then its items as children
    local -a members=()
    mapfile -t members <<< "${entries[k]}"
    local branch="├─" rail="│  "
    [[ $k -eq $last ]] && branch="└─" && rail="   "
    OUT+=("   $branch ${members[0]}")
    local m last_m=$(( ${#members[@]} - 1 ))
    for (( m = 1; m <= last_m; m++ )); do
      local item_branch="├─"
      [[ $m -eq $last_m ]] && item_branch="└─"
      OUT+=("   $rail$item_branch ${members[m]}")
    done
  done
  return 0
}
