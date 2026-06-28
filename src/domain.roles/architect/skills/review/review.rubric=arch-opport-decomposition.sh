#!/usr/bin/env bash
######################################################################
# .what = atomic rubric review skill for arch-opport-decomposition
#
# .why  = standalone rubric skill that:
#         - hardcodes rules for decomposition opportunities
#         - forwards all args to bhrain review
#         - composable by review.by aggregator
#         - directly callable for evals
#
# usage:
#   rhx review.rubric=arch-opport-decomposition --paths 'src/**/*.ts'
#   rhx review.rubric=arch-opport-decomposition --diffs since-main --mode pull
#   rhx review.rubric=arch-opport-decomposition --help
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

# hardcoded rules for this rubric
RULES='.agent/repo=ehmpathy/role=architect/briefs/practices/rule.prefer.most-common-denominator.md'

# refs for context (philosophies inform but are not rules)
REFS='.agent/repo=ehmpathy/role=architect/briefs/practices/philosophy.domain-as-a-garden.[philosophy].md'

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
exec npx rhachet run --repo bhrain --skill review --rules "$RULES" --refs "$REFS" --brain "$BRAIN" "${FILTERED_ARGS[@]}"
