#!/usr/bin/env bash
######################################################################
# .what = condense briefs via supply → press → verify pipeline with self-grade
#
# .why  = atomic operation that compresses AND measures quality:
#         - kernelizes source for measurement
#         - compresses via configurable pipeline
#         - self-grades retention and density
#         - optionally restores lost kernels
#
# usage:
#   brief.condense.sh --from path/to/brief.md
#   brief.condense.sh --from path/to/brief.md --onPress '[[req-kernels, sitrep-aggressive], [telegraphic]]'
#   brief.condense.sh --from path/to/brief.md --onVerify restore
#   brief.condense.sh --from path/to/brief.md --attempts 5
#   brief.condense.sh --from path/to/brief.md --mode plan
#   brief.condense.sh --from path/to/brief.md --mode apply
#
# guarantee:
#   - source .md file unchanged
#   - emits collocated .md.min file (or --into path)
#   - self-grades via dens.Δ, dens.σ, kern.Δ, kern.σ
#   - mode=apply by default (emits file)
#   - fail-fast on errors
######################################################################
set -euo pipefail

# resolve skill dir for sourced files
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"

# parse named arguments
FILE_PATH=""
GLOB_PATTERN=""
INTO_PATH=""
ON_SUPPLY="kernelize"
ON_PRESS=""
ON_VERIFY=""
ATTEMPTS="3"
MODE="apply"
BRAIN=""
JSON_OUTPUT=false
FORCE=false
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --from)
      # detect if value looks like a glob (contains * or ?)
      if [[ "$2" == *"*"* || "$2" == *"?"* ]]; then
        GLOB_PATTERN="$2"
      else
        FILE_PATH="$2"
      fi
      shift 2
      ;;
    --into)
      INTO_PATH="$2"
      shift 2
      ;;
    --onSupply)
      ON_SUPPLY="$2"
      shift 2
      ;;
    --onPress)
      ON_PRESS="$2"
      shift 2
      ;;
    --onVerify)
      ON_VERIFY="$2"
      shift 2
      ;;
    --attempts)
      ATTEMPTS="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --brain)
      BRAIN="$2"
      shift 2
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --help|-h)
      SHOW_HELP=true
      shift
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      # args separator - ignore
      shift
      ;;
    -*)
      echo "unknown flag: $1" >&2
      echo "usage: brief.condense.sh --from <path|glob> [--onPress <spec>] [--mode plan|apply]" >&2
      exit 2
      ;;
    *)
      # positional arg = file path (backwards compat)
      if [[ -z "$FILE_PATH" ]]; then
        FILE_PATH="$1"
      else
        echo "unexpected argument: $1" >&2
        exit 2
      fi
      shift
      ;;
  esac
done

# show help
if [[ "$SHOW_HELP" == "true" ]]; then
  echo "condense — compress briefs with quality self-grade"
  echo ""
  echo "usage:"
  echo "  brief.condense.sh --from <path> [options]"
  echo "  brief.condense.sh --from <glob> [options]"
  echo ""
  echo "options:"
  echo "  --from <path|glob>   input file or glob pattern (required)"
  echo "  --into <path>        explicit output path (single file only)"
  echo "  --onSupply <op>      supply operation: kernelize | null (default: kernelize)"
  echo "  --onPress <spec>     press pipeline spec as JSON (default: [[req-kernels, telegraphic]])"
  echo "  --onVerify <op>      verify operation: restore | null (default: null)"
  echo "  --attempts <N>       runs per input for variance measurement (default: 3)"
  echo "  --mode plan|apply    preview (plan) or emit (apply). default: apply"
  echo "  --brain <slug>       brain provider (default: xai/grok/3-mini)"
  echo "  --json               output as JSON"
  echo "  --force              bypass cache and recompress"
  echo "  --help               show this help"
  echo ""
  echo "pipelines (--onPress):"
  echo ""
  echo "  GOOD density (2-3x compression):"
  echo "    [[req-kernels, telegraphic]]              # default (2.8x, kern.σ=0.28)"
  echo "    [[telegraphic]], --onVerify restore       # with kernel recovery (2.3x)"
  echo "    [[telegraphic]]                           # simple (3.3x)"
  echo ""
  echo "  EXTREME density (6-18x compression):"
  echo "    [[sitrep-aggressive], [telegraphic]]      # max compression"
  echo "    [[req-kernels, sitrep-aggressive], [telegraphic]]  # max + lossless"
  echo ""
  echo "examples:"
  echo "  brief.condense.sh --from docs/guide.md --mode plan"
  echo "  brief.condense.sh --from docs/guide.md --mode apply"
  echo "  brief.condense.sh --from 'briefs/**/*.md' --mode apply"
  echo "  brief.condense.sh --from docs/critical.md --onVerify restore"
  exit 0
fi

# validate: need --from
if [[ -z "$FILE_PATH" && -z "$GLOB_PATTERN" ]]; then
  echo "error: --from is required (file path or glob pattern)" >&2
  exit 2
fi

# validate: --into only valid for single file
if [[ -n "$INTO_PATH" && -n "$GLOB_PATTERN" ]]; then
  echo "error: --into only valid for single file input, not with glob --from" >&2
  exit 2
fi

# validate mode
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "error: --mode must be 'plan' or 'apply' (got '$MODE')" >&2
  exit 2
fi

# validate attempts is numeric
if ! [[ "$ATTEMPTS" =~ ^[0-9]+$ ]] || [[ "$ATTEMPTS" -lt 1 ]]; then
  echo "error: --attempts must be a positive number (got '$ATTEMPTS')" >&2
  exit 2
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository" >&2
  exit 2
fi

# enumerate files to condense
FILES=()
if [[ -n "$FILE_PATH" ]]; then
  # single file mode
  if [[ ! -f "$FILE_PATH" ]]; then
    echo "error: file not found: $FILE_PATH" >&2
    exit 2
  fi
  FILES+=("$FILE_PATH")
else
  # glob mode - use bash glob expansion
  shopt -s nullglob globstar
  for file in $GLOB_PATTERN; do
    if [[ -f "$file" ]]; then
      FILES+=("$file")
    fi
  done
  shopt -u nullglob globstar

  if [[ ${#FILES[@]} -eq 0 ]]; then
    echo "error: no files matched pattern '$GLOB_PATTERN'" >&2
    exit 2
  fi
fi

# build mechanism js path
MECH_JS="$SKILL_DIR/condense.js"

# verify mechanism exists
if [[ ! -f "$MECH_JS" ]]; then
  echo "error: mechanism not found at $MECH_JS" >&2
  echo "hint: run 'npm run build' to compile typescript" >&2
  exit 2
fi

# process each file
TOTAL_BEFORE=0
TOTAL_AFTER=0
FILE_COUNT=0
LAST_MIN_FILE=""

for file in "${FILES[@]}"; do
  # determine output path
  if [[ -n "$INTO_PATH" ]]; then
    MIN_FILE="$INTO_PATH"
  else
    MIN_FILE="${file}.min"
  fi

  # build args for mechanism
  MECH_ARGS=(--from "$file" --mode "$MODE" --attempts "$ATTEMPTS")

  if [[ -n "$INTO_PATH" ]]; then
    MECH_ARGS+=(--into "$INTO_PATH")
  fi

  if [[ -n "$ON_PRESS" ]]; then
    MECH_ARGS+=(--onPress "$ON_PRESS")
  fi

  if [[ -n "$ON_VERIFY" ]]; then
    MECH_ARGS+=(--onVerify "$ON_VERIFY")
  fi

  if [[ -n "$BRAIN" ]]; then
    MECH_ARGS+=(--brain "$BRAIN")
  fi

  if [[ "$FORCE" == "true" ]]; then
    MECH_ARGS+=(--force)
  fi

  if [[ "$JSON_OUTPUT" == "true" ]]; then
    MECH_ARGS+=(--json)
  fi

  # capture start time
  START_TIME=$(date +%s.%N)

  # start spinner while brain works
  start_spinner "condense via pipeline"

  # invoke mechanism
  RAW_OUTPUT=$(node "$MECH_JS" "${MECH_ARGS[@]}" 2>&1) || {
    EXIT_CODE=$?
    stop_spinner
    echo "$RAW_OUTPUT"
    exit $EXIT_CODE
  }

  # stop spinner
  stop_spinner

  # output result
  echo "$RAW_OUTPUT"

  FILE_COUNT=$((FILE_COUNT + 1))
  LAST_MIN_FILE="$MIN_FILE"
done

# summary for batch
if [[ $FILE_COUNT -gt 1 ]]; then
  echo ""
  echo "summary:"
  echo "   files: $FILE_COUNT"
fi
