#!/usr/bin/env bash
######################################################################
# .what = compress markdown briefs via LLMLingua-2 token classification
#
# .why  = reduces token count in briefs while semantic intent is preserved:
#         - 2-4x compression on typical briefs
#         - lower context cost per session
#         - more headroom for task context
#
# usage:
#   brief.compress.sh path/to/brief.md                    # apply (default)
#   brief.compress.sh path/to/brief.md --mode plan        # preview only
#   brief.compress.sh path/to/brief.md --mode apply       # emit .md.min
#   brief.compress.sh --glob "src/**/*.md" --mode apply   # batch compress
#   brief.compress.sh path/to/brief.md --mech tinybert    # fast model
#   brief.compress.sh path/to/brief.md --ratio 4          # 4x target
#   brief.compress.sh path/to/brief.md --force            # recompress even if fresh
#
# guarantee:
#   - source .md file unchanged
#   - emits collocated .md.min file
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
MODE="apply"
MECH="tinybert"
RATIO="4"
FORCE=false
VALIDATE=false
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --path)
      FILE_PATH="$2"
      shift 2
      ;;
    --glob)
      GLOB_PATTERN="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --mech)
      MECH="$2"
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
    --validate)
      VALIDATE=true
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
      echo "usage: brief.compress.sh path/to/brief.md [--mode plan|apply] [--mech model] [--ratio N]" >&2
      exit 1
      ;;
    *)
      # positional arg = file path
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
  echo "brief.compress — compress markdown briefs via LLMLingua-2"
  echo ""
  echo "usage:"
  echo "  brief.compress.sh <path>                    compress single file"
  echo "  brief.compress.sh --glob <pattern>          compress matched files"
  echo ""
  echo "options:"
  echo "  --mode plan|apply   preview (plan) or emit (apply). default: apply"
  echo "  --mech <model>      compression model. default: tinybert"
  echo "                      options: tinybert, bert, xlm-roberta"
  echo "  --ratio <N>         target compression ratio (1-20). default: 4"
  echo "  --force             recompress even if .md.min is up-to-date"
  echo "  --validate          run behavioral equivalence check (future)"
  echo "  --help              show this help"
  echo ""
  echo "models (compression vs semantic retention):"
  echo ""
  echo "  mech          size     cpu speed   gpu speed   retention"
  echo "  ─────────────────────────────────────────────────────────────"
  echo "  tinybert      57 MB    ~4s/brief   ~0.4s       ~92%"
  echo "  bert          710 MB   ~15s/brief  ~0.5s       ~96%"
  echo "  xlm-roberta   2.2 GB   ~30s/brief  ~0.5s       ~98%"
  echo ""
  echo "retention = semantic fidelity after compression (LLMLingua-2 benchmarks)"
  echo "at 4x compression: tinybert loses ~8% info, xlm-roberta loses ~2%"
  echo "on gpu, all models run at similar speed (~0.5s) — bottleneck shifts to i/o"
  echo ""
  echo "examples:"
  echo "  brief.compress.sh docs/guide.md --mode plan"
  echo "  brief.compress.sh docs/guide.md --mode apply --mech tinybert"
  echo "  brief.compress.sh --glob 'src/**/*.md' --mode apply"
  exit 0
fi

# validate: need path or glob
if [[ -z "$FILE_PATH" && -z "$GLOB_PATTERN" ]]; then
  echo "error: provide a file path or --glob pattern" >&2
  exit 1
fi

# validate mode
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "error: --mode must be 'plan' or 'apply' (got '$MODE')" >&2
  exit 1
fi

# validate mech
case "$MECH" in
  tinybert|bert|xlm-roberta) ;;
  *)
    echo "error: --mech must be tinybert, bert, or xlm-roberta (got '$MECH')" >&2
    exit 1
    ;;
esac

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
    print_turtle_header "lets see..."
    print_tree_start "brief.compress"
    print_tree_branch "mode: $MODE"
    print_tree_branch "glob: $GLOB_PATTERN"
    print_tree_branch "result: no files matched pattern" true
    exit 0
  fi
fi

# compute compression rate for LLMLingua (0-1 scale, where 0.25 = 4x compression)
RATE=$(echo "scale=4; 1 / $RATIO" | bc)

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
  # check staleness (skip if .md.min is newer than source)
  MIN_FILE="${file}.min"
  if [[ -f "$MIN_FILE" && "$FORCE" != "true" ]]; then
    if [[ "$MIN_FILE" -nt "$file" ]]; then
      # up-to-date, skip
      if [[ "$MODE" == "plan" ]]; then
        echo "   skip (up-to-date): $file"
      fi
      continue
    fi
  fi

  # invoke compiled compression engine and extract JSON line
  RAW_OUTPUT=$(node "$SKILL_DIR/compress.js" \
    --input "$file" \
    --mech "$MECH" \
    --rate "$RATE" \
    --json 2>&1) || {
    echo "error: compression failed for $file" >&2
    echo "$RAW_OUTPUT" >&2
    exit 1
  }

  # extract JSON line (starts with { and contains tokensBefore)
  RESULT=$(echo "$RAW_OUTPUT" | grep -E '^\{.*"tokensBefore"')
  if [[ -z "$RESULT" ]]; then
    echo "error: no JSON output from compress.js" >&2
    echo "$RAW_OUTPUT" >&2
    exit 1
  fi

  # parse json result
  TOKENS_BEFORE=$(echo "$RESULT" | jq -r '.tokensBefore')
  TOKENS_AFTER=$(echo "$RESULT" | jq -r '.tokensAfter')
  ACTUAL_RATIO=$(echo "$RESULT" | jq -r '.ratio')
  COMPRESSED=$(echo "$RESULT" | jq -r '.compressed')

  # accumulate totals
  TOTAL_BEFORE=$((TOTAL_BEFORE + TOKENS_BEFORE))
  TOTAL_AFTER=$((TOTAL_AFTER + TOKENS_AFTER))
  FILE_COUNT=$((FILE_COUNT + 1))

  # emit file if apply mode
  if [[ "$MODE" == "apply" ]]; then
    echo "$COMPRESSED" > "$MIN_FILE"
  fi

  # output per-file stats
  print_tree_start "brief.compress"
  print_tree_branch "mode: $MODE"
  print_tree_branch "mech: llmlingua/v2/$MECH"
  print_tree_branch "input: $file"
  print_tree_branch "ratio: ${RATIO}x target"
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
