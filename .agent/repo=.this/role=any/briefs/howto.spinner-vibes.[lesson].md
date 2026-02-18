# howto: turtle vibes spinner pattern

## .what

when a skill runs a long operation, use the seaturtle spinner for vibey feedback.

## .the pattern

```bash
# spinner state
SPINNER_PID=""

# start a spinner with elapsed time
# usage: start_spinner "kernelize source"
start_spinner() {
  local message="$1"
  (
    local frames=("🌊" "🫧" "🌊" "🐢" "🤙")
    local frame_count=${#frames[@]}
    local i=0
    local start_time=$(date +%s)
    # hide cursor
    tput civis 2>/dev/null || true
    while true; do
      local now=$(date +%s)
      local elapsed=$((now - start_time))
      # move to start of line, clear, then print
      printf "\r\033[K   %s %s (%ds)" "${frames[$i]}" "$message" "$elapsed"
      i=$(( (i + 1) % frame_count ))
      sleep 0.4
    done
  ) &
  SPINNER_PID=$!
}

# stop the spinner
# usage: stop_spinner
stop_spinner() {
  if [[ -n "$SPINNER_PID" ]]; then
    kill "$SPINNER_PID" 2>/dev/null || true
    wait "$SPINNER_PID" 2>/dev/null || true
    # show cursor again, clear line
    tput cnorm 2>/dev/null || true
    printf "\r\033[K"
    SPINNER_PID=""
  fi
}
```

## .why this pattern is vibey

| element | purpose |
|---------|---------|
| `🌊 🫧 🌊 🐢 🤙` | ocean/turtle themed frames that match our seaturtle identity |
| elapsed time `(%ds)` | shows progress without spam — user knows it's working |
| `tput civis/cnorm` | hides cursor during spin, shows after — clean UX |
| `\r\033[K` | carriage return + clear line — no leftover artifacts |
| subshell `&` | runs in background so main procedure can continue |

## .usage

```bash
# source the output helpers
source output.sh

# wrap long operation
start_spinner "kernelize source"
result=$(run_long_operation)
stop_spinner

# continue with results
echo "done: $result"
```

## .example output

```
   🐢 kernelize source (3s)
   🌊 kernelize source (4s)
   🫧 kernelize source (5s)
   ...
```

the spinner cycles through frames while showing elapsed seconds, giving vibey feedback without log spam.

## .see also

- `skills/brief.condense/output.sh` — reference implementation
- `skills/brief.compress/output.sh` — same pattern

