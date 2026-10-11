#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to block tool access to repo-local README.md
#
# .why  = clones reach for README.md out of habit, find no file, and
#         wrongly conclude the readme is absent — or create a shouted
#         duplicate that drifts from the real readme.md. this repo uses
#         readme.md (lowercase). the hook redirects to it.
#
# .how  = reads JSON from stdin, checks the Write/Edit/Read file_path for
#         a repo-local README.md, blocks with a redirect to readme.md.
#         excludes node_modules and .git.
#
# .scope = tool-level Write/Edit/Read only. Bash is intentionally NOT
#          covered: a repo-local README.md must stay migratable, and the
#          rename/remove tools are themselves Bash commands whose strings
#          name README.md (rhx mvsafe/rmsafe, git mv, cat to inspect).
#          a Bash scan would block the very cleanup the wish wants, and
#          would over-block remote-repo refs + prose. see the rule brief.
#          this is a nudge, not an airtight boundary: a raw Bash write
#          (echo x > README.md) is an accepted, documented residual gap —
#          anyone determined can step around a guardrail, so we fix the
#          habitual case (the tool calls) and do not chase every bypass.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# guarantee:
#   - blocks Write/Edit/Read to any repo-local README.md (root + nested)
#   - allows node_modules/** and .git/** README.md (third-party, vendored)
#   - allows all Bash (so a legacy README.md can be read + migrated away)
#   - redirects to the lowercase readme.md in the same directory
######################################################################

set -euo pipefail

# fail closed on a crash: claude code reads any PreToolUse exit but 2 as a permit, so an unbound
# var or a failed command would otherwise open this gate in silence
# .note = each write is guarded and SIGPIPE ignored, so a closed stream cannot stop the exit 2
trap '' PIPE
trap 'hook_exit=$?; if [[ $hook_exit -ne 0 && $hook_exit -ne 2 ]]; then hook_crash="💥 MalfunctionError: ${0##*/} crashed (exit $hook_exit); the tool call stays blocked — retry once; if it recurs, report the defect to the ehmpathy mechanic role repo"; printf "%s\n" "$hook_crash" || true; printf "%s\n" "$hook_crash" >&2 || true; exit 2; fi' EXIT

# .what = write a line to both stdout and stderr
# .why  = failure output must land on both streams (rule.require.skill-output-streams).
#         tee /dev/stderr is unreliable under piped stdio (how hooks are invoked — it
#         errors "No such device"), so echo to each stream explicitly instead
emit_both() {
  echo "$1"
  echo "$1" >&2
}

# read JSON from stdin
STDIN_INPUT=$(cat)

# failfast: if no input, error (loud on both streams per skill-output-streams)
if [[ -z "$STDIN_INPUT" ]]; then
  emit_both "✋ ConstraintError: PreToolUse hook received no input via stdin"
  exit 2
fi

# failfast: jq is required. an absent jq is an unexpected environment error — surface
# it loud rather than swallow it and fail-open blind (rule.forbid.failhide)
if ! command -v jq >/dev/null; then
  emit_both "💥 MalfunctionError: PreToolUse hook requires jq, which was not found on PATH"
  exit 2
fi

# .what = test parseability directly, never via a table of jq exit codes
# .why  = jq's parse-error code varies by build (2, 4, 5). a code table goes stale
#         silently, and turns this fail-open gate fail-closed on the next jq release.
# .note = `jq .` always compiles, so any nonzero status here is unparseable input
JQ_PARSE_STATUS=0
echo "$STDIN_INPUT" | jq . >/dev/null 2>&1 || JQ_PARSE_STATUS=$?
if [[ $JQ_PARSE_STATUS -ne 0 ]]; then
  emit_both "💥 MalfunctionError: PreToolUse hook could not parse stdin as JSON (jq exit $JQ_PARSE_STATUS); the tool call is allowed"
  exit 0
fi

# extract tool name. the input parsed above, so a nonzero here is a jq malfunction
# .note = exit 2, never jq's own code: claude code reads any PreToolUse exit but 2 as a
#         permit, so a relayed code would open the gate (rule.require.qualified-error-headers)
JQ_STATUS=0
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty') || JQ_STATUS=$?
if [[ $JQ_STATUS -ne 0 ]]; then
  emit_both "💥 MalfunctionError: PreToolUse hook hit an unexpected jq failure (exit $JQ_STATUS); the tool call stays blocked"
  exit 2
fi

# skip if not Write, Edit, or Read (Bash stays uncovered — see .scope)
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Read" ]]; then
  exit 0
fi

# .what = true if the path is vendored (third-party) and thus allowed
# .why  = node_modules and .git readmes are not ours to control
is_vendored_path() {
  local path="$1"
  # strip a leading ./ so ./node_modules/... matches the same as node_modules/...
  path="${path#./}"
  [[ "$path" == node_modules/* || "$path" == */node_modules/* || "$path" == *"/node_modules" ]] && return 0
  [[ "$path" == .git/* || "$path" == */.git/* ]] && return 0
  return 1
}

# .what = emit the block message to both streams and exit 2
# .why  = redirect the clone to the lowercase readme.md in the same dir. output lands
#         on both stdout and stderr per rule.require.skill-output-streams (failure case)
block_with_redirect() {
  local tool="$1"
  local shouted_path="$2"
  local lower_path="${shouted_path%README.md}readme.md"
  emit_block_message() {
    echo ""
    echo "✋ ConstraintError: $tool to $shouted_path"
    echo ""
    echo "this repo uses readme.md (lowercase) — README.md does not belong here."
    echo ""
    echo "  use: $lower_path"
    echo ""
    echo "why: shouted filenames (README.md) violate rule.forbid.shouted-readme."
    echo "     one canonical readme per directory, always lowercase."
    echo ""
  }
  emit_block_message
  emit_block_message >&2
  exit 2
}

# check the Write/Edit/Read file_path
FILE_PATH=$(echo "$STDIN_INPUT" | jq -r '.tool_input.file_path // empty')

# skip if no file_path
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# skip if basename is not exactly README.md
if [[ "$(basename "$FILE_PATH")" != "README.md" ]]; then
  exit 0
fi

# allow vendored paths (node_modules, .git)
if is_vendored_path "$FILE_PATH"; then
  exit 0
fi

# block repo-local README.md with redirect
block_with_redirect "$TOOL_NAME" "$FILE_PATH"
