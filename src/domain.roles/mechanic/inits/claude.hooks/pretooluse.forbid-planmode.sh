#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to forbid EnterPlanMode
#
# .why  = externalize plans for observable and durable reuse.
#         plan mode produces nothing tangible. instead, agents
#         should produce plan artifacts that are:
#         - observable in code review
#         - durable across sessions
#         - reusable by other agents
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#   matcher: "EnterPlanMode"
#
# guarantee:
#   ✔ always blocks EnterPlanMode (exit 2)
#   ✔ directs agent to produce plan artifacts instead
#   ✔ fail-fast on empty stdin
######################################################################

set -euo pipefail

# fail closed on a crash: claude code reads any PreToolUse exit but 2 as a permit, so an unbound
# var or a failed command would otherwise open this gate in silence
# .note = each write is guarded and SIGPIPE ignored, so a closed stream cannot stop the exit 2
trap '' PIPE
trap 'hook_exit=$?; if [[ $hook_exit -ne 0 && $hook_exit -ne 2 ]]; then hook_crash="💥 MalfunctionError: ${0##*/} crashed (exit $hook_exit); the tool call stays blocked — retry once; if it recurs, report the defect to the ehmpathy mechanic role repo"; printf "%s\n" "$hook_crash" || true; printf "%s\n" "$hook_crash" >&2 || true; exit 2; fi' EXIT

# consume stdin (required by hook protocol)
STDIN_INPUT=$(cat)

# failfast: if no input received, something is wrong
if [[ -z "$STDIN_INPUT" ]]; then
  echo "✋ ConstraintError: PreToolUse hook received no input via stdin" >&2
  exit 2
fi

# extract tool name
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")

# only block EnterPlanMode
if [[ "$TOOL_NAME" != "EnterPlanMode" ]]; then
  exit 0
fi

# block with guidance
{
  echo ""
  echo "✋ ConstraintError: EnterPlanMode is forbidden."
  echo ""
  echo "externalize your plans instead, for observable and durable reuse."
  echo ""
  echo "  .where"
  echo "    if a .behavior is already bound to your branch, use it."
  echo "    otherwise, write your plan to your notes directory:"
  echo ""
  echo "    .agent/.notes/\$date.\$slug/plans/\$plan-name.md"
  echo ""
  echo "  .example"
  echo "    .agent/.notes/2026-02-07.refactor-auth/plans/approach.md"
  echo ""
  echo "  .how"
  echo "    1. write your plan as a durable artifact"
  echo "    2. if the human triggered the need for a plan:"
  echo "       - ask the human to review before you proceed"
  echo "    3. if you alone triggered the want for a plan:"
  echo "       - proceed with implementation"
  echo ""
} >&2
exit 2
