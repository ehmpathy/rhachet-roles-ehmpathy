#!/usr/bin/env bash
######################################################################
# .what = compress markdown briefs via extractive or abstractive mechanisms
#
# .why  = reduces token count in briefs while semantic intent is preserved:
#         - 2-4x compression on typical briefs
#         - lower context cost per session
#         - more headroom for task context
#
# usage:
#   brief.compress.sh --from path/to/brief.md --via llmlingua/v2@tinybert
#   brief.compress.sh --from path/to/brief.md --via bhrain/sitrep --mode plan
#   brief.compress.sh --from path/to/brief.md --via bhrain/sitrep --mode apply
#   brief.compress.sh --from "src/**/*.md" --via llmlingua/v2@tinybert --mode apply
#   brief.compress.sh --from path/to/brief.md --via bhrain/sitrep --into /tmp/out.md
#   brief.compress.sh --from path/to/brief.md --via llmlingua/v2@tinybert --ratio 4
#   brief.compress.sh --from path/to/brief.md --via llmlingua/v2@tinybert --force
#
# guarantee:
#   - source .md file unchanged
#   - emits collocated .md.min file (or --into path)
#   - plan mode by default (shows preview, no emit)
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
VIA=""
MODE="apply"
RATIO="4"
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
    --via)
      VIA="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --ratio)
      RATIO="$2"
      shift 2
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
      echo "usage: brief.compress.sh --from <path|glob> --via <press@brain> [--mode plan|apply] [--ratio N]" >&2
      exit 1
      ;;
    *)
      # positional arg = file path (backwards compat)
      if [[ -z "$FILE_PATH" ]]; then
        FILE_PATH="$1"
      else
        echo "unexpected argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

# show help
if [[ "$SHOW_HELP" == "true" ]]; then
  echo "brief.compress — compress markdown briefs"
  echo ""
  echo "usage:"
  echo "  brief.compress.sh --from <path> --via <press@brain>"
  echo "  brief.compress.sh --from <glob> --via <press@brain> --mode apply"
  echo ""
  echo "options:"
  echo "  --from <path|glob>  input file or glob pattern (required)"
  echo "  --via <press@brain> compression mechanism (required)"
  echo "  --into <path>       explicit output path (single file only)"
  echo "  --mode plan|apply   preview (plan) or emit (apply). default: apply"
  echo "  --ratio <N>         target compression ratio (1-20). default: 4"
  echo "  --force             recompress even if .md.min is up-to-date"
  echo "  --help              show this help"
  echo ""
  echo "press@brain examples:"
  echo "  llmlingua/v2@tinybert          extractive, local, fast (~4s/brief)"
  echo "  llmlingua/v2@bert              extractive, local, accurate (~15s/brief)"
  echo "  llmlingua/v2@xlm-roberta       extractive, local, highest fidelity (~30s/brief)"
  echo "  bhrain/sitrep@anthropic/claude/sonnet  abstractive, api, semantic distillation"
  echo ""
  echo "examples:"
  echo "  brief.compress.sh --from docs/guide.md --via llmlingua/v2@tinybert --mode plan"
  echo "  brief.compress.sh --from docs/guide.md --via bhrain/sitrep --mode apply"
  echo "  brief.compress.sh --from 'src/**/*.md' --via llmlingua/v2@tinybert --mode apply"
  exit 0
fi

# validate: need --via
if [[ -z "$VIA" ]]; then
  echo "error: --via is required (e.g., --via llmlingua/v2@tinybert or --via bhrain/sitrep)" >&2
  exit 1
fi

# parse --via into press and brain
PRESS=""
BRAIN=""

# failfast if starts with @ (no press)
if [[ "$VIA" == @* ]]; then
  echo "error: expected format \$press@\$brain, got '$VIA' (no press before @)" >&2
  exit 1
fi

# split on @ if present
if [[ "$VIA" == *"@"* ]]; then
  PRESS="${VIA%%@*}"
  BRAIN="${VIA#*@}"
fi

# if no @ and contains /, treat as press with default brain
if [[ -z "$PRESS" && "$VIA" == *"/"* ]]; then
  PRESS="$VIA"
fi

# failfast if no press resolved (no @ and no /)
if [[ -z "$PRESS" ]]; then
  echo "error: expected format \$press@\$brain, got '$VIA'" >&2
  echo "examples: llmlingua/v2@tinybert, bhrain/sitrep@anthropic/claude/haiku, bhrain/sitrep" >&2
  exit 1
fi

# apply default brain per press family if brain is empty
if [[ -z "$BRAIN" ]]; then
  case "$PRESS" in
    bhrain/sitrep)
      BRAIN="anthropic/claude/sonnet"
      ;;
    *)
      echo "error: no default brain for press '$PRESS'; specify via \$press@\$brain" >&2
      exit 1
      ;;
  esac
fi

# validate: need --from
if [[ -z "$FILE_PATH" && -z "$GLOB_PATTERN" ]]; then
  echo "error: --from is required (file path or glob pattern)" >&2
  exit 1
fi

# validate: --into only valid for single file
if [[ -n "$INTO_PATH" && -n "$GLOB_PATTERN" ]]; then
  echo "error: --into only valid for single file input, not with glob --from" >&2
  exit 1
fi

# validate mode
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "error: --mode must be 'plan' or 'apply' (got '$MODE')" >&2
  exit 1
fi

# validate ratio is numeric and in range
if ! [[ "$RATIO" =~ ^[0-9]+$ ]] || [[ "$RATIO" -lt 1 ]] || [[ "$RATIO" -gt 20 ]]; then
  echo "error: --ratio must be a number from 1 to 20 (got '$RATIO')" >&2
  exit 1
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository" >&2
  exit 1
fi

# enumerate files to compress
FILES=()
if [[ -n "$FILE_PATH" ]]; then
  # single file mode
  if [[ ! -f "$FILE_PATH" ]]; then
    echo "error: file not found: $FILE_PATH" >&2
    exit 1
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
    exit 1
  fi
fi

# compute compression rate for LLMLingua (0-1 scale, where 0.25 = 4x compression)
RATE=$(echo "scale=4; 1 / $RATIO" | bc)

# determine which mechanism to invoke based on press family
MECH_JS=""
MECH_ARGS=()

case "$PRESS" in
  llmlingua/*)
    MECH_JS="$SKILL_DIR/compress.via.llmlingua.js"
    MECH_ARGS=(--from "\$file" --via "$BRAIN" --rate "$RATE" --json)
    ;;
  bhrain/*)
    MECH_JS="$SKILL_DIR/compress.via.bhrain.js"
    MECH_ARGS=(--from "\$file" --via "$BRAIN" --json)
    ;;
  *)
    echo "error: unknown press family '$PRESS'. expected: llmlingua/*, bhrain/*" >&2
    exit 1
    ;;
esac

# verify mechanism exists
if [[ ! -f "$MECH_JS" ]]; then
  echo "error: mechanism not found at $MECH_JS" >&2
  exit 1
fi

# output header
if [[ "$MODE" == "plan" ]]; then
  print_turtle_header "lets see..."
else
  print_turtle_header "shell yeah!"
fi

# process each file
TOTAL_BEFORE=0
TOTAL_AFTER=0
FILE_COUNT=0

for file in "${FILES[@]}"; do
  # determine output path
  if [[ -n "$INTO_PATH" ]]; then
    MIN_FILE="$INTO_PATH"
  else
    MIN_FILE="${file}.min"
  fi

  # check staleness (skip if .min is newer than source)
  if [[ -f "$MIN_FILE" && "$FORCE" != "true" ]]; then
    if [[ "$MIN_FILE" -nt "$file" ]]; then
      # up-to-date, skip
      if [[ "$MODE" == "plan" ]]; then
        echo "   skip (up-to-date): $file"
      fi
      continue
    fi
  fi

  # invoke mechanism with press-specific args
  MECH_RUN_ARGS=(--from "$file" --via "$BRAIN" --json)
  case "$PRESS" in
    llmlingua/*) MECH_RUN_ARGS+=(--rate "$RATE") ;;
  esac

  # pass --into to mechanism in apply mode (mechanism writes file directly)
  if [[ "$MODE" == "apply" ]]; then
    # create parent directories if needed (for --into paths)
    mkdir -p "$(dirname "$MIN_FILE")"
    MECH_RUN_ARGS+=(--into "$MIN_FILE")
  fi

  # capture start time
  START_TIME=$(date +%s.%N)

  RAW_OUTPUT=$(node "$MECH_JS" "${MECH_RUN_ARGS[@]}" 2>&1) || {
    echo "error: compression failed for $file" >&2
    echo "$RAW_OUTPUT" >&2
    exit 1
  }

  # capture end time and compute elapsed
  END_TIME=$(date +%s.%N)
  ELAPSED=$(echo "$END_TIME - $START_TIME" | bc)
  ELAPSED_PRETTY=$(printf "%.1fs" "$ELAPSED")

  # extract JSON line (starts with { and contains tokensBefore)
  RESULT=$(echo "$RAW_OUTPUT" | grep -E '^\{.*"tokensBefore"')
  if [[ -z "$RESULT" ]]; then
    echo "error: no JSON output from mechanism" >&2
    echo "$RAW_OUTPUT" >&2
    exit 1
  fi

  # parse json result (no need to parse compressed content - mechanism writes directly)
  TOKENS_BEFORE=$(echo "$RESULT" | jq -r '.tokensBefore')
  TOKENS_AFTER=$(echo "$RESULT" | jq -r '.tokensAfter')
  ACTUAL_RATIO=$(echo "$RESULT" | jq -r '.ratio')

  # accumulate totals
  TOTAL_BEFORE=$((TOTAL_BEFORE + TOKENS_BEFORE))
  TOTAL_AFTER=$((TOTAL_AFTER + TOKENS_AFTER))
  FILE_COUNT=$((FILE_COUNT + 1))

  # output per-file stats
  print_tree_start "brief.compress"
  print_tree_branch "mode: $MODE"
  print_tree_branch "via: ${PRESS}@${BRAIN}"
  print_tree_branch "from: $file"
  print_tree_branch "into: $MIN_FILE"
  # only show ratio target for llmlingua (brain decides its own compression level)
  case "$PRESS" in
    llmlingua/*) print_tree_branch "ratio: ${RATIO}x target" ;;
  esac
  print_tree_branch "time: $ELAPSED_PRETTY"
  print_tree_branch "result" true
  print_tree_leaf "tokens.before" "$TOKENS_BEFORE" "      "
  print_tree_leaf "tokens.after" "$TOKENS_AFTER" "      "
  print_tree_leaf "ratio.actual" "${ACTUAL_RATIO}x" "      " true
  echo ""
done

# summary for batch
if [[ $FILE_COUNT -gt 1 ]]; then
  OVERALL_RATIO=$(echo "scale=2; $TOTAL_BEFORE / $TOTAL_AFTER" | bc)
  echo "summary:"
  echo "   files: $FILE_COUNT"
  echo "   tokens.before: $TOTAL_BEFORE"
  echo "   tokens.after: $TOTAL_AFTER"
  echo "   ratio.overall: ${OVERALL_RATIO}x"
  echo ""
fi

# plan mode footer
if [[ "$MODE" == "plan" ]]; then
  echo "note: this was a plan. to apply, re-run with --mode apply"
fi
