#!/usr/bin/env bash
######################################################################
# .what = route `rhx git.pull.title get|set` to its verb
#
# .why  = the tree is `git.pull.<noun> <verb>`, beside git.pull.comment;
#         each verb is also its own skill, so both forms run one code path
#
# usage:
#   rhx git.pull.title get
#   rhx git.pull.title set --title 'feat(reef): map the kelp beds' --mode apply
#   rhx git.pull.title --help
#
# guarantee:
#   - exec's the verb's own skill with the rest of the args
#   - an absent or unknown verb refuses, exit 2
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../git.pull/git.pull.operations.sh
source "$SKILL_DIR/../git.pull/git.pull.operations.sh"

dispatch_git_pull_verb "$SKILL_DIR" git.pull.title get,set "$@"