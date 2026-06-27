#!/usr/bin/env bash
######################################################################
# .what = atomic rubric review skill for mech-decode-friction
#
# .why  = standalone rubric skill that:
#         - hardcodes rules for decode-friction detection
#         - forwards all args to bhrain review
#         - composable by review.by aggregator
#         - directly callable for evals
#
# usage:
#   rhx review.rubric=mech-decode-friction --paths 'src/**/*.ts'
#   rhx review.rubric=mech-decode-friction --diffs since-main --mode pull
#   rhx review.rubric=mech-decode-friction --help
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
RULES_ARCH_1='.agent/repo=ehmpathy/role=architect/briefs/practices/rule.forbid.decode-friction-in-orchestrators.md'
RULES_ARCH_2='.agent/repo=ehmpathy/role=architect/briefs/practices/rule.require.orchestrators-as-narrative.md'
RULES_MECH_1='.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/readable.narrative/rule.forbid.inline-decode-friction.md'
RULES_MECH_2='.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/readable.narrative/rule.require.named-transformers.md'

# refs for context (multiple --refs for node glob)
REFS_ARCH_1='.agent/repo=ehmpathy/role=architect/briefs/practices/define.domain-operation-grains.md'
REFS_ARCH_2='.agent/repo=ehmpathy/role=architect/briefs/practices/philosophy.transformer-orchestrator-separation.[philosophy].md'

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
  --rules "$RULES_ARCH_1" \
  --rules "$RULES_ARCH_2" \
  --rules "$RULES_MECH_1" \
  --rules "$RULES_MECH_2" \
  --refs "$REFS_ARCH_1" \
  --refs "$REFS_ARCH_2" \
  --brain "$BRAIN" \
  "${FILTERED_ARGS[@]}"
