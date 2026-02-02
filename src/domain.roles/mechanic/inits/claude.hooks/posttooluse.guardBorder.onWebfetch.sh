#!/usr/bin/env bash
######################################################################
# .what = PostToolUse hook that inspects WebFetch responses
#
# .why  = enables auto-approved webfetch with defense-in-depth:
#         - inspects fetched content via brain.ask
#         - blocks risky content before it reaches the agent
#         - quarantines blocked content for human inspection
#
# usage:
#   invoked by Claude Code as PostToolUse hook
#   receives tool response via stdin JSON
#
# guarantee:
#   - exit 0 = allow content to reach agent
#   - exit 2 = block content, message shown to agent
######################################################################
set -euo pipefail

# load api keys from user config (same source as use.apikeys.sh)
if [[ -f ~/.config/rhachet/apikeys.env ]]; then
  source ~/.config/rhachet/apikeys.env
fi

# delegate to the TypeScript CLI via location-independent package import
exec node -e "import('rhachet-roles-ehmpathy/cli').then(m => m.guardBorderOnWebfetch())" -- "$@"
