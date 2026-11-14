#!/usr/bin/env bash
######################################################################
# .what = measure the github api cost of the pr-watch poll, live
#
# .why  = the daemon's poll must stay far under github's rate limits for
#         the whole fleet; this proves what github charges, never a guess
#
# usage:
#   measure.pr-watch.github-cost.sh                          # 4 ticks, 60s apart
#   measure.pr-watch.github-cost.sh --ticks 6 --tick-seconds 60
#   measure.pr-watch.github-cost.sh --author ehm-seaturtle   # whose open prs
#
# guarantee:
#   - runs the daemon's own per-pr read (get_watch_pr_state, from the shipped
#     git.pull.watch.github.sh), over every open pr of --author, in turn per tick
#   - reads the core quota before and after each tick via /rate_limit (free)
#   - counts each reply by status from the read ledger (200, 304, paged)
#   - read-only on github; the ehmpath test token (keyrack env test), else
#     the gh login; the report names which, and the login it reads as
#   - report to stdout and to .log/measure.pr-watch.github-cost/<stamp>.json
#   - the account's other traffic in the window can only raise the charge,
#     so the measure errs high, never low
######################################################################
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
GITHUB_SH="$REPO_ROOT/src/domain.roles/mechanic/skills/git.pull.watch/git.pull.watch.github.sh"

TICKS=4
TICK_SECONDS=60
AUTHOR="ehm-seaturtle"

# .what = print a message to stdout and stderr both, then exit 2
fail_constraint() {
  printf '%s\n' "$@"
  printf '%s\n' "$@" >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ticks) TICKS="${2:-}"; shift 2 ;;
    --tick-seconds) TICK_SECONDS="${2:-}"; shift 2 ;;
    --author) AUTHOR="${2:-}"; shift 2 ;;
    --repo|--role|--skill) shift 2 ;;
    --help|-h) sed -n '2,24p' "$0"; exit 0 ;;
    *) fail_constraint "✋ ConstraintError: unknown option: $1" "   └─ see: measure.pr-watch.github-cost.sh --help" ;;
  esac
done
[[ "$TICKS" =~ ^[0-9]+$ && "$TICKS" -ge 2 ]] || fail_constraint "✋ ConstraintError: --ticks must be a whole number >= 2 (one cold, then warm)"
[[ "$TICK_SECONDS" =~ ^[0-9]+$ ]] || fail_constraint "✋ ConstraintError: --tick-seconds must be a whole number"

# the token: the ehmpath test key where keyrack holds it, else the gh login
# .why = github's primary limit is per user, so any token of the account the
#        daemon reads as draws on the one bucket the fleet shares
TOKEN="$(npx rhachet keyrack get --key EHMPATHY_SEATURTLE_GITHUB_TOKEN --owner ehmpath --env test --json 2>/dev/null | jq -r '.grant.key.secret // empty' || true)"
TOKEN_FROM="keyrack ehmpath/test"
if [[ -z "$TOKEN" ]]; then
  TOKEN="$(gh auth token 2>/dev/null || true)"
  TOKEN_FROM="gh login"
fi
[[ -n "$TOKEN" ]] || fail_constraint "✋ ConstraintError: no github token at hand" \
  "   ├─ fix: rhx keyrack unlock --owner ehmpath --env test" \
  "   └─ or:  gh auth login"

# .what = the core quota of the token, as one json object
get_core_quota() {
  GH_TOKEN="$TOKEN" gh api --method GET rate_limit --jq '.resources.core'
}

LOGIN="$(GH_TOKEN="$TOKEN" gh api --method GET user --jq .login)"
PRS="$(GH_TOKEN="$TOKEN" gh search prs --author "$AUTHOR" --state open --limit 200 --json repository,number --jq '.[] | "\(.repository.nameWithOwner)|\(.number)"')"
PR_COUNT="$(printf '%s\n' "$PRS" | grep -c '|' || true)"

WORK="$(mktemp -d)"
LEDGER="$WORK/reads.tsv"
TICKS_JSON="$WORK/ticks.jsonl"
touch "$LEDGER" "$TICKS_JSON"

echo "🐢 lets measure the wave..."
echo ""
echo "🐚 measure.pr-watch.github-cost"
echo "   ├─ login: $LOGIN (token: $TOKEN_FROM)"
echo "   ├─ prs: $PR_COUNT open, by $AUTHOR"
echo "   ├─ window: $TICKS ticks, ${TICK_SECONDS}s apart"
echo "   └─ ticks"

for ((i = 1; i <= TICKS; i++)); do
  rows_before="$(wc -l <"$LEDGER")"
  before="$(get_core_quota)"
  began="$(date +%s)"
  faults=0
  while IFS='|' read -r repo pr; do
    [[ -n "$repo" ]] || continue
    KEY_DIR="$WORK/key" WATCH_TOKEN="$TOKEN" GIT_PULL_WATCH_READS_LOG="$LEDGER" \
      bash -c 'source "$1" && get_watch_pr_state "$2" "$3" "$4"' _ "$GITHUB_SH" "$repo" "$pr" "$WORK/state.json" \
      >/dev/null 2>>"$WORK/faults.log" || faults=$((faults + 1))
  done <<<"$PRS"
  seconds=$(( $(date +%s) - began ))
  after="$(get_core_quota)"
  reads="$(tail -n +"$((rows_before + 1))" "$LEDGER" | cut -f2 | sort | uniq -c | awk '{ printf "%s%s=%s", (NR>1?" ":""), $2, $1 }')"
  charged=$(( $(jq .used <<<"$after") - $(jq .used <<<"$before") ))
  jq -cn --argjson tick "$i" --argjson seconds "$seconds" --argjson before "$before" --argjson after "$after" \
    --argjson charged "$charged" --argjson faults "$faults" --arg reads "$reads" \
    '{ tick: $tick, seconds: $seconds, charged: $charged, faults: $faults, reads: $reads, before: $before, after: $after }' >>"$TICKS_JSON"
  branch="├─"
  [[ $i -eq $TICKS ]] && branch="└─"
  echo "      $branch tick $i: charged $charged · reads $reads · ${seconds}s · faults $faults"
  [[ $i -lt $TICKS ]] && sleep "$TICK_SECONDS"
done

# the report, kept for the answer
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT_DIR="$REPO_ROOT/.log/measure.pr-watch.github-cost"
mkdir -p "$OUT_DIR"
jq -s --arg login "$LOGIN" --argjson prs "$PR_COUNT" --argjson tickSeconds "$TICK_SECONDS" \
  '{ login: $login, prs: $prs, tickSeconds: $tickSeconds, ticks: . }' "$TICKS_JSON" >"$OUT_DIR/$STAMP.json"
cp "$LEDGER" "$OUT_DIR/$STAMP.reads.tsv"
[[ -s "$WORK/faults.log" ]] && cp "$WORK/faults.log" "$OUT_DIR/$STAMP.faults.log"

echo ""
echo "🌊 report"
echo "   ├─ json: .log/measure.pr-watch.github-cost/$STAMP.json"
echo "   └─ reads: .log/measure.pr-watch.github-cost/$STAMP.reads.tsv"
rm -rf "$WORK"
