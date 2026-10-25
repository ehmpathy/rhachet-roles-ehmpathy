#!/usr/bin/env bash
######################################################################
# .what = route `rhx git.pull.comment get|set|del` to its verb
#
# .why  = the wish names the tree as `git.pull.comment <verb>`; each verb
#         is also its own skill, so both forms run one code path
#
# usage:
#   rhx git.pull.comment get --pr 69
#   rhx git.pull.comment set --pr 69 --key status --from ./status.md
#   rhx git.pull.comment del --pr 69 --key status
#   rhx git.pull.comment --help
#
# guarantee:
#   - exec's the verb's own skill with the rest of the args
#   - an absent or unknown verb refuses, exit 2
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=git.pull.comment.operations.sh
source "$SKILL_DIR/git.pull.comment.operations.sh"

dispatch_git_pull_verb "$SKILL_DIR" git.pull.comment get,set,del "$@"
