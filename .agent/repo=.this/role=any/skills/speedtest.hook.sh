#!/usr/bin/env bash
######################################################################
# .what = performance test a command for hook suitability
#
# .why  = claude code hooks have a 5-second default timeout
#         commands with >5s startup overhead will be killed
#         before they can complete, causing intermittent failures.
#
#         this skill runs a command 21 times, measures execution time,
#         and reports whether it's safe to use as a hook.
#
# usage:
#   speedtest.hook.sh --command "echo hello"
#   speedtest.hook.sh --command "./node_modules/.bin/rhachet roles init ..."
#   speedtest.hook.sh --command ".agent/.../pretooluse.forbid-gerunds.sh"
#   speedtest.hook.sh --command "..." --runs 50
#   speedtest.hook.sh --command "..." --timeout 3
#
# guarantee:
#   ✔ runs command 21 times (or custom --runs)
#   ✔ calculates min, max, avg, p95 execution times
#   ✔ reports pass/fail based on 5s threshold (or custom --timeout)
#   ✔ provides stdin simulation for hook testing
######################################################################

set -euo pipefail

# defaults
COMMAND=""
RUNS=21
TIMEOUT_THRESHOLD=5
SIMULATE_STDIN=false

# parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --command)
      COMMAND="$2"
      shift 2
      ;;
    --runs)
      RUNS="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT_THRESHOLD="$2"
      shift 2
      ;;
    --simulate-stdin)
      SIMULATE_STDIN=true
      shift
      ;;
    --skill|--repo|--role)
      # rhachet passes these - ignore
      shift 2
      ;;
    --help|-h)
      echo "usage: speedtest.hook.sh --command \"cmd\" [--runs N] [--timeout S] [--simulate-stdin]"
      echo ""
      echo "options:"
      echo "  --command       command to test (required)"
      echo "  --runs          number of iterations (default: 21)"
      echo "  --timeout       max seconds for hook safety (default: 5)"
      echo "  --simulate-stdin  pipe fake hook JSON to stdin"
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# validate
if [[ -z "$COMMAND" ]]; then
  echo "error: --command is required" >&2
  exit 1
fi

# fake stdin for hook simulation
FAKE_STDIN='{"session_id":"test","hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"echo test"}}'

echo "⏱️  speedtest: $COMMAND"
echo "   runs: $RUNS"
echo "   threshold: ${TIMEOUT_THRESHOLD}s"
echo ""

# collect timing data
TIMES=()

for i in $(seq 1 "$RUNS"); do
  # measure execution time
  START=$(date +%s.%N)

  if [[ "$SIMULATE_STDIN" == "true" ]]; then
    echo "$FAKE_STDIN" | bash -c "$COMMAND" >/dev/null 2>&1 || true
  else
    bash -c "$COMMAND" >/dev/null 2>&1 || true
  fi

  END=$(date +%s.%N)
  ELAPSED=$(echo "$END - $START" | bc)
  TIMES+=("$ELAPSED")

  # progress indicator
  printf "\r   progress: %d/%d" "$i" "$RUNS"
done

echo ""
echo ""

# calculate stats
SORTED=($(printf '%s\n' "${TIMES[@]}" | sort -n))
MIN="${SORTED[0]}"
MAX="${SORTED[-1]}"

# calculate average
SUM=0
for t in "${TIMES[@]}"; do
  SUM=$(echo "$SUM + $t" | bc)
done
AVG=$(echo "scale=3; $SUM / $RUNS" | bc)

# calculate p95 (95th percentile)
P95_INDEX=$(echo "($RUNS * 95 / 100) - 1" | bc)
P95_INDEX=${P95_INDEX%.*}  # truncate to int
[[ $P95_INDEX -lt 0 ]] && P95_INDEX=0
P95="${SORTED[$P95_INDEX]}"

# format times for display
format_time() {
  local t="$1"
  if (( $(echo "$t < 1" | bc -l) )); then
    echo "$(echo "scale=0; $t * 1000 / 1" | bc)ms"
  else
    echo "${t}s"
  fi
}

echo "📊 results"
echo "   ├── min: $(format_time "$MIN")"
echo "   ├── max: $(format_time "$MAX")"
echo "   ├── avg: $(format_time "$AVG")"
echo "   └── p95: $(format_time "$P95")"
echo ""

# evaluate safety
SAFE=true
if (( $(echo "$P95 > $TIMEOUT_THRESHOLD" | bc -l) )); then
  SAFE=false
fi

if [[ "$SAFE" == "true" ]]; then
  echo "✅ SAFE for hooks (p95 ${P95}s < ${TIMEOUT_THRESHOLD}s threshold)"
  echo ""
  echo "   this command completes fast enough to be used"
  echo "   as a PreToolUse hook with a ${TIMEOUT_THRESHOLD}s timeout."
else
  echo "❌ UNSAFE for hooks (p95 ${P95}s > ${TIMEOUT_THRESHOLD}s threshold)"
  echo ""
  echo "   this command is too slow for reliable hook execution."
  echo "   options:"
  echo "   1. increase hook timeout (e.g., timeout: 10)"
  echo "   2. use a direct script path instead of CLI wrapper"
  echo "   3. optimize the command startup time"
fi
