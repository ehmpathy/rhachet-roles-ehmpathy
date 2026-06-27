#!/usr/bin/env bash
######################################################################
# .what = atomic rubric review skill for arch-hazards-maintenance
#
# .why  = standalone rubric skill that:
#         - hardcodes rules for maintenance hazard detection
#         - forwards all args to bhrain review
#         - composable by review.by aggregator
#         - directly callable for evals
#
# usage:
#   rhx review.rubric=arch-hazards-maintenance --paths 'src/**/*.ts'
#   rhx review.rubric=arch-hazards-maintenance --diffs since-main --mode pull
#   rhx review.rubric=arch-hazards-maintenance --help
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

# hardcoded rules for this rubric (multiple --rules for node glob)
# solve-at-cause prevents workaround accumulation
RULES_ARCH='.agent/repo=ehmpathy/role=architect/briefs/practices/rule.require.solve-at-cause.md'

# ubiqlang rules prevent name drift
RULES_UBIQLANG_1='.agent/repo=ehmpathy/role=architect/briefs/practices/ubiqlang/rule.forbid.term.addition.synonym.md'
RULES_UBIQLANG_2='.agent/repo=ehmpathy/role=architect/briefs/practices/ubiqlang/rule.forbid.term.addition.ambiguous.md'

# filter out --skill and its value from args (rhachet injects these)
# also extract --brain if provided
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
  --rules "$RULES_ARCH" \
  --rules "$RULES_UBIQLANG_1" \
  --rules "$RULES_UBIQLANG_2" \
  --brain "$BRAIN" \
  "${FILTERED_ARGS[@]}"
