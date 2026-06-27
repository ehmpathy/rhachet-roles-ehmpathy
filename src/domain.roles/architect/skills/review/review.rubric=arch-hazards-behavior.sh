#!/usr/bin/env bash
######################################################################
# .what = atomic rubric review skill for arch-hazards-behavior
#
# .why  = standalone rubric skill that:
#         - hardcodes rules for behavior hazard detection
#         - forwards all args to bhrain review
#         - composable by review.by aggregator
#         - directly callable for evals
#
# usage:
#   rhx review.rubric=arch-hazards-behavior --paths 'src/**/*.ts'
#   rhx review.rubric=arch-hazards-behavior --diffs since-main --mode pull
#   rhx review.rubric=arch-hazards-behavior --help
#
# guarantee:
#   - hardcoded rules for this rubric
#   - all other args forwarded to rhx review
#   - exit codes: 0=pass, 1=malfunction, 2=findings
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ensure keyrack is unlocked for this subprocess
# .note = bhrain review hardcodes keyrack supplier which needs active session
rhx keyrack unlock --owner ehmpath --env prep >/dev/null || true

# hardcoded rules for this rubric
# orchestrators-as-narrative ensures behavior is clear
RULES_NARRATIVE='.agent/repo=ehmpathy/role=architect/briefs/practices/rule.require.orchestrators-as-narrative.md'

# decode-friction detection for hidden complexity
RULES_DECODE='.agent/repo=ehmpathy/role=architect/briefs/practices/rule.forbid.decode-friction-in-orchestrators.md'

# transformer-orchestrator separation philosophy
REFS='.agent/repo=ehmpathy/role=architect/briefs/practices/philosophy.transformer-orchestrator-separation.[philosophy].md'

# extract --brain if provided, filter out --skill
FILTERED_ARGS=()
BRAIN=""
SKIP_NEXT=false
CAPTURE_BRAIN=false
for arg in "$@"; do
  if [[ "$SKIP_NEXT" == "true" ]]; then
    SKIP_NEXT=false
    continue
  fi
  if [[ "$CAPTURE_BRAIN" == "true" ]]; then
    BRAIN="$arg"
    CAPTURE_BRAIN=false
    continue
  fi
  if [[ "$arg" == "--skill" ]]; then
    SKIP_NEXT=true
    continue
  fi
  if [[ "$arg" == "--brain" ]]; then
    CAPTURE_BRAIN=true
    continue
  fi
  FILTERED_ARGS+=("$arg")
done

# default brain if not specified
# .note = enables eval harness to pass --brain for brain comparison
if [[ -z "$BRAIN" ]]; then
  BRAIN='fireworks/deepseek/v4-flash'
fi

# forward filtered args to bhrain review with rules
exec npx rhachet run --repo bhrain --skill review \
  --rules "$RULES_NARRATIVE" \
  --rules "$RULES_DECODE" \
  --refs "$REFS" \
  --brain "$BRAIN" \
  "${FILTERED_ARGS[@]}"
