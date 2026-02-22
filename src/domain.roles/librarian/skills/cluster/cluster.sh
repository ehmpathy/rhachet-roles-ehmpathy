#!/usr/bin/env bash
######################################################################
# .what = cluster semantically similar concept kernels
#
# .why  = brain-driven semantic similarity for kernel grouping:
#         - word-based jaccard fails on synonyms and rephrases
#         - brain understands that "dependency injection via context"
#           and "pass dependencies through context" are equivalent
#
# usage:
#   cluster.sh --from path/to/kernels.json
#   cluster.sh --from path/to/kernels.json --into path/to/clusters.json
#   cluster.sh --from path/to/kernels.json --mode plan
#   cluster.sh --from path/to/kernels.json --mode apply
#
# input format (kernels.json):
#   { "kernels": [{ "id": "k1", "concept": "...", "category": "rule" }, ...] }
#
# output format:
#   { "clusters": [...], "clusterCount": N, "rationale": "..." }
#
# guarantee:
#   - source json file unchanged
#   - semantic equivalence via brain (not word overlap)
#   - plan mode by default (shows preview, no emit)
#   - fail-fast on errors
######################################################################
set -euo pipefail

# resolve skill directory
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# source output helpers
source "$SKILL_DIR/output.sh"

# defaults
FROM=""
INTO=""
MODE="plan"
BRAIN_SLUG="xai/grok/code-fast-1"

# parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      shift 2  # skip rhachet args
      ;;
    --from)
      FROM="$2"
      shift 2
      ;;
    --into)
      INTO="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --brain)
      BRAIN_SLUG="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: cluster.sh --from kernels.json [--into output.json] [--mode plan|apply]"
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1"
      exit 2
      ;;
  esac
done

# validate required args
if [[ -z "$FROM" ]]; then
  echo "error: --from is required"
  exit 2
fi

if [[ ! -f "$FROM" ]]; then
  echo "error: file not found: $FROM"
  exit 2
fi

# delegate to typescript
exec npx tsx "$SKILL_DIR/cluster.js" \
  --from "$FROM" \
  --into "$INTO" \
  --mode "$MODE" \
  --brain "$BRAIN_SLUG"
