#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to forbid gerunds (-ing words) in file writes
#
# .why  = gerunds degrade clarity and precision in code and docs.
#         this hook blocks Write and Edit operations that contain
#         gerunds, via the HARDNUDGE pattern (block first, allow retry).
#
# .how  = reads JSON from stdin, extracts content from Write/Edit,
#         scans for -ing words, filters against allowlist, blocks
#         on first attempt but allows retry within 5 minutes.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# guarantee:
#   ✔ blocks gerunds on first attempt
#   ✔ allows retry within 5 min window (HARDNUDGE)
#   ✔ respects allowlist for unavoidable terms (e.g., "string")
######################################################################

set -euo pipefail

# config
HARDNUDGE_WINDOW_SECONDS=300  # 5 minutes
STALE_THRESHOLD_SECONDS=3600  # 1 hour

# read JSON from stdin
STDIN_INPUT=$(cat)

# failfast: if no input, error
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi

# extract tool name
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")

# skip if not Write or Edit
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# extract file path
FILE_PATH=$(echo "$STDIN_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")

# extract content to scan based on tool type
if [[ "$TOOL_NAME" == "Write" ]]; then
  CONTENT=$(echo "$STDIN_INPUT" | jq -r '.tool_input.content // empty' 2>/dev/null || echo "")
else
  # Edit: only scan new_string (additions, not removals)
  CONTENT=$(echo "$STDIN_INPUT" | jq -r '.tool_input.new_string // empty' 2>/dev/null || echo "")
fi

# skip if no content
if [[ -z "$CONTENT" ]]; then
  exit 0
fi

# find script directory for allowlist
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALLOWLIST_FILE="$SCRIPT_DIR/gerunds.allowlist.jsonc"

# load allowlist (strip comments, extract all words)
ALLOWLIST=()
if [[ -f "$ALLOWLIST_FILE" ]]; then
  mapfile -t ALLOWLIST < <(
    sed 's|//.*||' "$ALLOWLIST_FILE" | jq -r '.. | strings' 2>/dev/null | grep -E '^[a-zA-Z]+$' || true
  )
fi

# function to check if word is in allowlist
is_allowed() {
  local word="$1"
  local lower_word
  lower_word=$(echo "$word" | tr '[:upper:]' '[:lower:]')
  for allowed in "${ALLOWLIST[@]}"; do
    if [[ "$lower_word" == "$allowed" ]]; then
      return 0
    fi
  done
  return 1
}

# extract all -ing words from content (handle camelCase by split on case boundaries)
mapfile -t ING_WORDS < <(
  echo "$CONTENT" | \
    sed 's/\([a-z]\)\([A-Z]\)/\1 \2/g' | \
    grep -oE '\b[a-zA-Z]+ing\b' | \
    sort -u || true
)

# filter against allowlist to get gerunds
GERUNDS=()
for word in "${ING_WORDS[@]}"; do
  if [[ -n "$word" ]] && ! is_allowed "$word"; then
    GERUNDS+=("$word")
  fi
done

# if no gerunds detected, allow
if [[ ${#GERUNDS[@]} -eq 0 ]]; then
  exit 0
fi

# find .claude directory
find_claude_dir() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.claude" ]]; then
      echo "$dir/.claude"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

CLAUDE_DIR=$(find_claude_dir) || {
  # no .claude dir, create it
  mkdir -p "$PWD/.claude"
  CLAUDE_DIR="$PWD/.claude"
}

NUDGE_FILE="$CLAUDE_DIR/gerund.nudges.local.json"

# ensure nudge file exists
if [[ ! -f "$NUDGE_FILE" ]]; then
  echo '{}' > "$NUDGE_FILE"
fi

# cleanup stale entries (older than 1 hour)
NOW=$(date +%s)
TMP_FILE=$(mktemp)
jq --argjson now "$NOW" --argjson threshold "$STALE_THRESHOLD_SECONDS" \
  'to_entries | map(select(.value > ($now - $threshold))) | from_entries' \
  "$NUDGE_FILE" > "$TMP_FILE" 2>/dev/null && mv "$TMP_FILE" "$NUDGE_FILE" || rm -f "$TMP_FILE"

# check each gerund against nudge file
BLOCKED_GERUNDS=()
for gerund in "${GERUNDS[@]}"; do
  # build nudge key as hash of file_path + gerund
  NUDGE_KEY=$(echo -n "${FILE_PATH}:${gerund}" | sha256sum | cut -d' ' -f1)

  # check last attempt time
  LAST_ATTEMPT=$(jq -r --arg key "$NUDGE_KEY" '.[$key] // 0' "$NUDGE_FILE" 2>/dev/null || echo "0")
  ELAPSED=$((NOW - LAST_ATTEMPT))

  if [[ $ELAPSED -lt $HARDNUDGE_WINDOW_SECONDS ]]; then
    # within retry window, allow this gerund
    continue
  fi

  # outside window, record attempt and block
  TMP_FILE=$(mktemp)
  jq --arg key "$NUDGE_KEY" --argjson ts "$NOW" '. + {($key): $ts}' "$NUDGE_FILE" > "$TMP_FILE" 2>/dev/null && mv "$TMP_FILE" "$NUDGE_FILE" || rm -f "$TMP_FILE"
  BLOCKED_GERUNDS+=("$gerund")
done

# if all gerunds are within retry window, allow
if [[ ${#BLOCKED_GERUNDS[@]} -eq 0 ]]; then
  exit 0
fi

# build block message
{
  echo ""
  echo "🛑 BLOCKED: gerund(s) detected in file write"
  echo ""
  echo "file: $FILE_PATH"
  echo ""
  echo "detected gerunds:"
  for gerund in "${BLOCKED_GERUNDS[@]}"; do
    # suggest alternatives based on common patterns
    case "$gerund" in
      *existing*) echo "  ⛔ $gerund → consider: found, prior, current" ;;
      *loading*)  echo "  ⛔ $gerund → consider: load, loaded, loader" ;;
      *processing*) echo "  ⛔ $gerund → consider: process, processed, processor" ;;
      *running*)  echo "  ⛔ $gerund → consider: run, active, runner" ;;
      *pending*)  echo "  ⛔ $gerund → consider: queued, awaited, unresolved" ;;
      *building*) echo "  ⛔ $gerund → consider: build, built, structure" ;;
      *handling*) echo "  ⛔ $gerund → consider: handle, handler" ;;
      *missing*)  echo "  ⛔ $gerund → consider: absent, notFound, lacks" ;;
      *matching*) echo "  ⛔ $gerund → consider: matched, match, fits" ;;
      *remaining*) echo "  ⛔ $gerund → consider: left, rest, residual" ;;
      *setting*)  echo "  ⛔ $gerund → consider: set, config, option" ;;
      *getting*)  echo "  ⛔ $gerund → consider: get, fetch, retrieve" ;;
      *creating*) echo "  ⛔ $gerund → consider: create, created, creator" ;;
      *updating*) echo "  ⛔ $gerund → consider: update, updated, updater" ;;
      *deleting*) echo "  ⛔ $gerund → consider: delete, deleted, remover" ;;
      *saving*)   echo "  ⛔ $gerund → consider: save, saved, persist" ;;
      *reading*)  echo "  ⛔ $gerund → consider: read, reader" ;;
      *writing*)  echo "  ⛔ $gerund → consider: write, writer" ;;
      *opening*)  echo "  ⛔ $gerund → consider: open, opened, opener" ;;
      *closing*)  echo "  ⛔ $gerund → consider: close, closed, closer" ;;
      *starting*) echo "  ⛔ $gerund → consider: start, started, starter" ;;
      *stopping*) echo "  ⛔ $gerund → consider: stop, stopped, stopper" ;;
      *waiting*)  echo "  ⛔ $gerund → consider: wait, awaited, pending" ;;
      *checking*) echo "  ⛔ $gerund → consider: check, checked, checker" ;;
      *testing*)  echo "  ⛔ $gerund → consider: test, tested, tester" ;;
      *parsing*)  echo "  ⛔ $gerund → consider: parse, parsed, parser" ;;
      *formatting*) echo "  ⛔ $gerund → consider: format, formatted, formatter" ;;
      *validating*) echo "  ⛔ $gerund → consider: validate, validated, validator" ;;
      *filtering*) echo "  ⛔ $gerund → consider: filter, filtered" ;;
      *sorting*)  echo "  ⛔ $gerund → consider: sort, sorted, sorter" ;;
      *mapping*)  echo "  ⛔ $gerund → consider: map, mapped, mapper" ;;
      *reducing*) echo "  ⛔ $gerund → consider: reduce, reduced, reducer" ;;
      *finding*)  echo "  ⛔ $gerund → consider: find, found, finder" ;;
      *searching*) echo "  ⛔ $gerund → consider: search, searched, searcher" ;;
      *logging*)  echo "  ⛔ $gerund → consider: log, logged, logger" ;;
      *tracking*) echo "  ⛔ $gerund → consider: track, tracked, tracker" ;;
      *rendering*) echo "  ⛔ $gerund → consider: render, rendered, renderer" ;;
      *computing*) echo "  ⛔ $gerund → consider: compute, computed" ;;
      *calculating*) echo "  ⛔ $gerund → consider: calculate, calculated" ;;
      *fetching*) echo "  ⛔ $gerund → consider: fetch, fetched, fetcher" ;;
      *sending*)  echo "  ⛔ $gerund → consider: send, sent, sender" ;;
      *receiving*) echo "  ⛔ $gerund → consider: receive, received, receiver" ;;
      *connecting*) echo "  ⛔ $gerund → consider: connect, connected, connector" ;;
      *disconnecting*) echo "  ⛔ $gerund → consider: disconnect, disconnected" ;;
      *encoding*) echo "  ⛔ $gerund → consider: encode, encoded, encoder" ;;
      *decoding*) echo "  ⛔ $gerund → consider: decode, decoded, decoder" ;;
      *compiling*) echo "  ⛔ $gerund → consider: compile, compiled, compiler" ;;
      *executing*) echo "  ⛔ $gerund → consider: execute, executed, executor" ;;
      *calling*)  echo "  ⛔ $gerund → consider: call, called, caller" ;;
      *invoking*) echo "  ⛔ $gerund → consider: invoke, invoked, invoker" ;;
      *binding*)  echo "  ⛔ $gerund → consider: bind, bound, binder" ;;
      *listening*) echo "  ⛔ $gerund → consider: listen, listener" ;;
      *watching*) echo "  ⛔ $gerund → consider: watch, watched, watcher" ;;
      *streaming*) echo "  ⛔ $gerund → consider: stream, streamed, streamer" ;;
      *buffering*) echo "  ⛔ $gerund → consider: buffer, buffered" ;;
      *caching*)  echo "  ⛔ $gerund → consider: cache, cached" ;;
      *queuing*)  echo "  ⛔ $gerund → consider: queue, queued" ;;
      *polling*)  echo "  ⛔ $gerund → consider: poll, polled, poller" ;;
      *retrying*) echo "  ⛔ $gerund → consider: retry, retried" ;;
      *timing*)   echo "  ⛔ $gerund → consider: time, timed, timer" ;;
      *scheduling*) echo "  ⛔ $gerund → consider: schedule, scheduled, scheduler" ;;
      *spawning*) echo "  ⛔ $gerund → consider: spawn, spawned, spawner" ;;
      *forking*)  echo "  ⛔ $gerund → consider: fork, forked" ;;
      *cloning*)  echo "  ⛔ $gerund → consider: clone, cloned" ;;
      *copying*)  echo "  ⛔ $gerund → consider: copy, copied" ;;
      *moving*)   echo "  ⛔ $gerund → consider: move, moved, mover" ;;
      *renaming*) echo "  ⛔ $gerund → consider: rename, renamed" ;;
      *merging*)  echo "  ⛔ $gerund → consider: merge, merged, merger" ;;
      *splitting*) echo "  ⛔ $gerund → consider: split, splitter" ;;
      *joining*)  echo "  ⛔ $gerund → consider: join, joined, joiner" ;;
      *grouping*) echo "  ⛔ $gerund → consider: group, grouped" ;;
      *padding*)  echo "  ⛔ $gerund → consider: pad, padded" ;;
      *trimming*) echo "  ⛔ $gerund → consider: trim, trimmed" ;;
      *wrapping*) echo "  ⛔ $gerund → consider: wrap, wrapped, wrapper" ;;
      *unwrapping*) echo "  ⛔ $gerund → consider: unwrap, unwrapped" ;;
      *locking*)  echo "  ⛔ $gerund → consider: lock, locked, locker" ;;
      *unlocking*) echo "  ⛔ $gerund → consider: unlock, unlocked" ;;
      *hashing*)  echo "  ⛔ $gerund → consider: hash, hashed, hasher" ;;
      *signing*)  echo "  ⛔ $gerund → consider: sign, signed, signer" ;;
      *verifying*) echo "  ⛔ $gerund → consider: verify, verified, verifier" ;;
      *initializing*) echo "  ⛔ $gerund → consider: init, initialized, initializer" ;;
      *configuring*) echo "  ⛔ $gerund → consider: configure, configured" ;;
      *migrating*) echo "  ⛔ $gerund → consider: migrate, migrated, migrator" ;;
      *seeding*)  echo "  ⛔ $gerund → consider: seed, seeded, seeder" ;;
      *deploying*) echo "  ⛔ $gerund → consider: deploy, deployed, deployer" ;;
      *provisioning*) echo "  ⛔ $gerund → consider: provision, provisioned" ;;
      *scaling*)  echo "  ⛔ $gerund → consider: scale, scaled, scaler" ;;
      *monitoring*) echo "  ⛔ $gerund → consider: monitor, monitored" ;;
      *alerting*) echo "  ⛔ $gerund → consider: alert, alerted, alerter" ;;
      *notifying*) echo "  ⛔ $gerund → consider: notify, notified, notifier" ;;
      *publishing*) echo "  ⛔ $gerund → consider: publish, published, publisher" ;;
      *subscribing*) echo "  ⛔ $gerund → consider: subscribe, subscribed, subscriber" ;;
      *emitting*) echo "  ⛔ $gerund → consider: emit, emitted, emitter" ;;
      *dispatching*) echo "  ⛔ $gerund → consider: dispatch, dispatched, dispatcher" ;;
      *triggering*) echo "  ⛔ $gerund → consider: trigger, triggered" ;;
      *importing*) echo "  ⛔ $gerund → consider: import, imported, importer" ;;
      *exporting*) echo "  ⛔ $gerund → consider: export, exported, exporter" ;;
      *scanning*)  echo "  ⛔ $gerund → consider: scan, scanned, scanner" ;;
      *profiling*) echo "  ⛔ $gerund → consider: profile, profiled, profiler" ;;
      *debugging*) echo "  ⛔ $gerund → consider: debug, debugged, debugger" ;;
      *tracing*)  echo "  ⛔ $gerund → consider: trace, traced, tracer" ;;
      *sampling*) echo "  ⛔ $gerund → consider: sample, sampled, sampler" ;;
      *mocking*)  echo "  ⛔ $gerund → consider: mock, mocked, mocker" ;;
      *stubbing*) echo "  ⛔ $gerund → consider: stub, stubbed" ;;
      *spying*)   echo "  ⛔ $gerund → consider: spy, spied" ;;
      *asserting*) echo "  ⛔ $gerund → consider: assert, asserted" ;;
      *expecting*) echo "  ⛔ $gerund → consider: expect, expected" ;;
      *throwing*) echo "  ⛔ $gerund → consider: throw, thrown, thrower" ;;
      *catching*) echo "  ⛔ $gerund → consider: catch, caught, catcher" ;;
      *warning*)  echo "  ⛔ $gerund → consider: warn, warned, warner" ;;
      *nesting*)  echo "  ⛔ $gerund → consider: nest, nested" ;;
      *flattening*) echo "  ⛔ $gerund → consider: flatten, flattened" ;;
      *iterating*) echo "  ⛔ $gerund → consider: iterate, iterated, iterator" ;;
      *looping*)  echo "  ⛔ $gerund → consider: loop, looped" ;;
      *recursing*) echo "  ⛔ $gerund → consider: recurse, recursed" ;;
      *branching*) echo "  ⛔ $gerund → consider: branch, branched" ;;
      *spacing*)  echo "  ⛔ $gerund → consider: space, spaced, spacer" ;;
      *)          echo "  ⛔ $gerund → consider: remove -ing suffix" ;;
    esac
  done
  echo ""
  echo "gerunds degrade clarity. see rule.forbid.gerunds for alternatives."
  echo ""
  echo "if this is intentional and absolutely unavoidable (e.g., library API requirement), retry the same operation."
  echo ""
} >&2

exit 2
