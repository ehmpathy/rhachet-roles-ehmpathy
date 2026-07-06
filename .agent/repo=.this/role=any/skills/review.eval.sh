#!/usr/bin/env bash
######################################################################
# .what = run review evals for any rubric
#
# .why  = enables eval infrastructure invocation from CLI:
#         - show available rubrics with eval case counts
#         - run single rubric eval with confusion matrix metrics
#         - compare multiple brains on same rubric
#         - emit results to .agent/.cache/ for review
#
# usage:
#   rhx review.eval rubrics                                        # show rubrics
#   rhx review.eval run --rubric mech-failhides --role mechanic    # run eval
#   rhx review.eval compare --rubric mech-failhides --role mechanic --brains fireworks/deepseek/v4-flash,xai/grok/3-mini
#
# guarantee:
#   - emits results to .agent/.cache/review.eval/
#   - prints relpath to output for review
#   - exit 0 = success, exit 1 = malfunction, exit 2 = constraint
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
CLI_PATH="$REPO_ROOT/src/domain.roles/.evals/cli.ts"
CACHE_DIR="$REPO_ROOT/.agent/.cache/review.eval"

# ensure cache dir exists
mkdir -p "$CACHE_DIR"

# source keyrack credentials for subprocess
# .note = evaluator brains need api keys exported to env
eval "$(rhx keyrack source --owner ehmpath --env prep --strict)"

# filter out --skill and its value (rhachet injects these)
FILTERED_ARGS=()
SKIP_NEXT=false
for arg in "$@"; do
  if [[ "$SKIP_NEXT" == "true" ]]; then
    SKIP_NEXT=false
    continue
  fi
  if [[ "$arg" == "--skill" ]]; then
    SKIP_NEXT=true
    continue
  fi
  FILTERED_ARGS+=("$arg")
done

# parse command from filtered args
COMMAND="${FILTERED_ARGS[0]:-help}"
REST_ARGS=("${FILTERED_ARGS[@]:1}")

# forward to CLI with output dir
case "$COMMAND" in
  rubrics)
    npx tsx "$CLI_PATH" list "${REST_ARGS[@]}"
    ;;
  run)
    npx tsx "$CLI_PATH" run --output "$CACHE_DIR" "${REST_ARGS[@]}"
    ;;
  compare)
    npx tsx "$CLI_PATH" compare --output "$CACHE_DIR" "${REST_ARGS[@]}"
    ;;
  help|--help|-h)
    npx tsx "$CLI_PATH" help
    ;;
  *)
    echo "error: unknown command '$COMMAND'"
    echo "usage: rhx review.eval [rubrics|run|compare|help]"
    exit 2
    ;;
esac
