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

# consume stdin (required by hook protocol)
STDIN_INPUT=$(cat)

# failfast: if no input received, something is wrong
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
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
  echo "🛑 BLOCKED: EnterPlanMode is forbidden."
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
