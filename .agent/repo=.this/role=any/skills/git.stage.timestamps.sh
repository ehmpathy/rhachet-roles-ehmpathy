#!/usr/bin/env bash
######################################################################
# .what = list every clock timestamp in the staged files, all at once
#
# .why  = the husky timestamps hook halts on the first hit only; a
#         large staged set (a merge of another pr) then costs one
#         commit attempt per hit. this lists them all, so one pass of
#         masks clears the commit
#
# usage:
#   git.stage.timestamps.sh                # plan: list each hit as path:line:text
#   git.stage.timestamps.sh --mode apply   # mask each hit in place, re-stage it
#
# masks:
#   - a bare clock `14:02` → `14h02` (reads the same, carries no colon clock)
#   - any other stamp form (a lead T, a zone) is named, left for a
#     hand mask as `[timestamp]`
#
# guarantee:
#   - apply refuses (exit 2) a hit file whose worktree differs from its
#     staged blob: a mask must never sweep an unstaged edit into the index
#   - reads the pattern from .husky/check.timestamps.sh itself, so the
#     list matches what the hook refuses; never a second copy
#   - scans the staged blobs, skips .ts/.sh as the hook does
#   - exit 0 when clean, exit 2 when any hit is found; writes naught
######################################################################
set -euo pipefail

MODE="plan"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    --help|-h) echo "usage: git.stage.timestamps.sh [--mode plan|apply]"; exit 0 ;;
    *) echo "✋ ConstraintError: unknown argument: $1 (see --help)" | tee /dev/stderr; exit 2 ;;
  esac
done

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
HOOK=".husky/check.timestamps.sh"
[[ -f "$HOOK" ]] || { echo "✋ ConstraintError: $HOOK absent; naught to read the pattern from" | tee /dev/stderr; exit 2; }

# load the pattern definitions from the hook, one source of truth
eval "$(grep -E '^(CLOCK_COLON|CLOCK_DASH|ZONE|TIMESTAMP_PATTERN|DURATION_PATTERN)=' "$HOOK")"

# scan each staged blob
[[ "$MODE" == "plan" || "$MODE" == "apply" ]] || { echo "✋ ConstraintError: --mode must be plan or apply" | tee /dev/stderr; exit 2; }

HITS=0
OUT=""
HIT_FILES=()
while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  case "$file" in *.ts | *.sh) continue ;; esac
  matches=$(git show ":$file" | sed -E "s/$DURATION_PATTERN//g" | grep -nIE "$TIMESTAMP_PATTERN" || true)
  [[ -n "$matches" ]] || continue
  HIT_FILES+=("$file")
  while IFS= read -r m; do
    HITS=$((HITS + 1))
    OUT+="      ├─ $file:${m:0:160}"$'\n'
  done <<< "$matches"
done < <(git -c core.quotepath=off diff --cached --name-only --diff-filter=ACM)

echo "🐢 timestamps in the staged files"
echo ""
echo "🐚 git.stage.timestamps"
if [[ "$HITS" == "0" ]]; then
  echo "   └─ clean; the hook will pass"
  exit 0
fi
echo "   ├─ hits: $HITS"
echo "   ├─ mode: $MODE"
echo "   └─ each"
printf '%s' "$OUT"

# plan stops here
if [[ "$MODE" == "plan" ]]; then
  echo ""
  echo "🥥 did you know?"
  echo "   └─ rhx git.stage.timestamps --mode apply   # mask each bare clock, re-stage"
  exit 2
fi

# refuse a hit file with an unstaged edit
for file in "${HIT_FILES[@]}"; do
  if ! git diff --quiet -- "$file"; then
    echo "✋ ConstraintError: $file has an unstaged edit; stage or drop it, then rerun" | tee /dev/stderr
    exit 2
  fi
done

# mask each bare clock in place (twice, so adjacent clocks both mask), then re-stage
BARE='(^|[^0-9:T])([01][0-9]|2[0-3]):([0-5][0-9])([^0-9:]|$)'
for file in "${HIT_FILES[@]}"; do
  sed -E -i "s/$BARE/\\1\\2h\\3\\4/g; s/$BARE/\\1\\2h\\3\\4/g" "$file"
  git add -- "$file"
done

# confirm the hook would pass now
LEFT=0
for file in "${HIT_FILES[@]}"; do
  if git show ":$file" | sed -E "s/$DURATION_PATTERN//g" | grep -qIE "$TIMESTAMP_PATTERN"; then
    LEFT=$((LEFT + 1))
    echo "   ✋ still a hit: $file"
  fi
done
echo ""
[[ "$LEFT" == "0" ]] && { echo "🐢 masked ${#HIT_FILES[@]} file(s); the hook will pass"; exit 0; }
echo "✋ ConstraintError: $LEFT file(s) contain a stamp form past the bare-clock mask; mask by hand as [timestamp]" | tee /dev/stderr
exit 2
