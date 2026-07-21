#!/usr/bin/env bash
######################################################################
# .what = atomic rubric review skill for ergo-fundamentals
#
# .why  = standalone rubric skill that:
#         - hardcodes the ergonomics fundamentals rules
#         - forwards all args to bhrain review
#         - composable by review.by aggregator
#         - directly callable for evals
#
# usage:
#   rhx review.rubric=ergo-fundamentals --paths 'src/**/*.ts'
#   rhx review.rubric=ergo-fundamentals --diffs since-main --mode pull
#   rhx review.rubric=ergo-fundamentals --help
#
# guarantee:
#   - hardcoded rules for this rubric
#   - all other args forwarded to rhx review
#   - exit codes: 0=pass, 1=malfunction, 2=findings
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# .note = no explicit keyrack unlock here.
#         in CI, keyrack reads creds from env vars (passthrough fallback).
#         locally, an active keyrack session (daemon) supplies creds.
#         a failed unlock (no host manifest in CI) would spawn an empty
#         daemon that poisons the env-var fallback, so we omit it.

# hardcoded rules for this rubric — the ergonomics fundamentals
FUNDAMENTALS_DIR='.agent/repo=ehmpathy/role=ergonomist/briefs/fundamentals'
RULES_DISCOVERABILITY="$FUNDAMENTALS_DIR/rule.require.discoverability.md"
RULES_STATUS_FEEDBACK="$FUNDAMENTALS_DIR/rule.require.status-feedback.md"
RULES_ERRORS_NAME_FIX="$FUNDAMENTALS_DIR/rule.require.errors-name-the-fix.md"
RULES_SAFE_BY_DEFAULT="$FUNDAMENTALS_DIR/rule.require.safe-by-default.md"
RULES_AMBIGUOUS_LABELS="$FUNDAMENTALS_DIR/rule.forbid.ambiguous-labels.md"
RULES_DEFAULTS_COMMON="$FUNDAMENTALS_DIR/rule.prefer.defaults-match-common-case.md"
RULES_PREVENT_CORRECT="$FUNDAMENTALS_DIR/rule.prefer.prevent-over-correct.md"
RULES_HELP_ON_DEMAND="$FUNDAMENTALS_DIR/rule.require.help-on-demand.md"

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
  --rules "$RULES_DISCOVERABILITY" \
  --rules "$RULES_STATUS_FEEDBACK" \
  --rules "$RULES_ERRORS_NAME_FIX" \
  --rules "$RULES_SAFE_BY_DEFAULT" \
  --rules "$RULES_AMBIGUOUS_LABELS" \
  --rules "$RULES_DEFAULTS_COMMON" \
  --rules "$RULES_PREVENT_CORRECT" \
  --rules "$RULES_HELP_ON_DEMAND" \
  --brain "$BRAIN" \
  "${FILTERED_ARGS[@]}"
