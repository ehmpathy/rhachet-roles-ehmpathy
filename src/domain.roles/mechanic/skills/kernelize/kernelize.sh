#!/usr/bin/env bash
######################################################################
# .what = extract semantic kernels from markdown briefs
#
# .why  = identifies distinct atomic concepts for compression quality:
#         - measures semantic content before/after compression
#         - validates retention of critical concepts
#         - optional consensus mode for stability
#
# usage:
#   kernelize.sh --from path/to/brief.md
#   kernelize.sh --from path/to/brief.md --into path/to/kernels.json
#   kernelize.sh --from path/to/brief.md --consensus 3
#   kernelize.sh --from path/to/brief.md --consensus 5 --threshold 0.7
#   kernelize.sh --from path/to/brief.md --mode plan
#   kernelize.sh --from path/to/brief.md --mode apply
#
# guarantee:
#   - source .md file unchanged
#   - emits json output with kernels array
#   - plan mode by default (shows preview, no emit)
#   - fail-fast on errors
######################################################################
set -euo pipefail

# resolve skill dir for sourced files
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"

# parse named arguments
FILE_PATH=""
INTO_PATH=""
MODE="plan"
CONSENSUS=""
THRESHOLD=""
SHOW_HELP=false
BRAIN_SLUG="xai/grok/code-fast-1"

while [[ $# -gt 0 ]]; do
  case $1 in
    --from)
      FILE_PATH="$2"
      shift 2
      ;;
    --into)
      INTO_PATH="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --consensus)
      CONSENSUS="$2"
      shift 2
      ;;
    --threshold)
      THRESHOLD="$2"
      shift 2
      ;;
    --brain)
      BRAIN_SLUG="$2"
      shift 2
      ;;
    --help|-h)
      SHOW_HELP=true
      shift
      ;;
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    *)
      echo "error: unknown argument: $1"
      exit 1
      ;;
  esac
done

# show help
if [[ "$SHOW_HELP" == "true" ]]; then
  echo "usage: kernelize.sh --from path/to/brief.md [options]"
  echo ""
  echo "options:"
  echo "  --from PATH         path to markdown brief (required)"
  echo "  --into PATH         output path for json (optional)"
  echo "  --mode plan|apply   plan = preview, apply = emit (default: plan)"
  echo "  --consensus N       run N parallel extractions with majority vote"
  echo "  --threshold T       kernel must appear in >=T fraction of runs (default: 0.5)"
  echo "  --brain SLUG        brain provider slug (default: xai/grok/code-fast-1)"
  echo ""
  exit 0
fi

# validate required args
if [[ -z "$FILE_PATH" ]]; then
  echo "error: --from is required"
  exit 1
fi

# validate file exists
if [[ ! -f "$FILE_PATH" ]]; then
  echo "error: file not found: $FILE_PATH"
  exit 1
fi

# validate mode
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "error: --mode must be 'plan' or 'apply'"
  exit 1
fi

# build args for tsx
TSX_ARGS=(
  "--from" "$FILE_PATH"
  "--mode" "$MODE"
  "--brain" "$BRAIN_SLUG"
)

if [[ -n "$INTO_PATH" ]]; then
  TSX_ARGS+=("--into" "$INTO_PATH")
fi

if [[ -n "$CONSENSUS" ]]; then
  TSX_ARGS+=("--consensus" "$CONSENSUS")
fi

if [[ -n "$THRESHOLD" ]]; then
  TSX_ARGS+=("--threshold" "$THRESHOLD")
fi

# run compiled js implementation
exec node "$SKILL_DIR/kernelize.js" "${TSX_ARGS[@]}"
