#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to forbid EnterWorktree and AskUserQuestion
#
# .why  = each parks or moves a seat that may run unattended:
#         - EnterWorktree moves this seat, its cwd and its hooks, into
#           another tree mid-run
#         - AskUserQuestion opens a modal that waits on a human, who may
#           be hours away from an unattended seat
#
# usage:
#   registered in getMechanicRole.ts, matcher "EnterWorktree|AskUserQuestion"
#
# guarantee:
#   ✔ blocks EnterWorktree and AskUserQuestion (exit 2), the fix named
#   ✔ any other tool reaches it only by a registration defect: it fails
#     closed with a MalfunctionError (exit 2), since it guards forbidden tools
#   ✔ builtins only: reads the tool name from stdin, starts no process
######################################################################

set -uo pipefail

# fail closed on a crash: claude code reads any PreToolUse exit but 2 as a permit
trap '' PIPE
trap 'hook_exit=$?; if [[ $hook_exit -ne 0 && $hook_exit -ne 2 ]]; then printf "%s\n" "💥 MalfunctionError: ${0##*/} crashed (exit $hook_exit); the tool call stays blocked" >&2 || true; exit 2; fi' EXIT

# read the tool name from stdin, with builtins alone
STDIN_INPUT=""
IFS= read -r -d '' STDIN_INPUT || true
TOOL_NAME=""
RE_TOOL='"tool_name"[[:space:]]*:[[:space:]]*"([A-Za-z0-9_.-]+)"'
[[ "$STDIN_INPUT" =~ $RE_TOOL ]] && TOOL_NAME="${BASH_REMATCH[1]}"

case "$TOOL_NAME" in
  EnterWorktree)
    printf '%s\n' '✋ ConstraintError: EnterWorktree is forbidden to the mechanic: it moves this seat, its cwd and its hooks, into another tree. fix: hand the work to a crew in its own tree (see: rhx clone --help)' >&2
    ;;
  AskUserQuestion)
    printf '%s\n' '✋ ConstraintError: AskUserQuestion is forbidden to the mechanic: its modal parks the seat until a human answers, and an unattended seat waits for hours. fix: ask in plain chat text (name the question and its options in your reply), and carry on with the work that does not wait on the answer' >&2
    ;;
  *)
    printf '%s\n' "💥 MalfunctionError: ${0##*/} names no tool it knows (tool: '${TOOL_NAME}'); the call stays blocked. fix: register it for EnterWorktree or AskUserQuestion only" >&2
    ;;
esac
exit 2
