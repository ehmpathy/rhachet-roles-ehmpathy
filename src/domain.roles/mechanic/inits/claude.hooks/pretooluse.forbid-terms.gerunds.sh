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
#   ✔ respects allowlist for the one unavoidable term ("string"); every other -ing word blocks
######################################################################

# 🟡 .note = this hook runs under a timeout (getMechanicRole.ts), and a killed
#            PreToolUse hook reads as NOT blocked ⇒ a gerund lands with no
#            diagnostic. the cap stays: no timeout hangs every tool call.
#            ⇒ .dream/v2026_09_12.fix.pt5s-hook-timeout-fails-open.md

set -euo pipefail

# fail closed on a crash: claude code reads any PreToolUse exit but 2 as a permit, so an unbound
# var or a failed command would otherwise open this gate in silence
# .note = each write is guarded and SIGPIPE ignored, so a closed stream cannot stop the exit 2
trap '' PIPE
trap 'hook_exit=$?; if [[ $hook_exit -ne 0 && $hook_exit -ne 2 ]]; then hook_crash="💥 MalfunctionError: ${0##*/} crashed (exit $hook_exit); the tool call stays blocked — retry once; if it recurs, report the defect to the ehmpathy mechanic role repo"; printf "%s\n" "$hook_crash" || true; printf "%s\n" "$hook_crash" >&2 || true; exit 2; fi' EXIT

# find hook directory, for the shared lib and the allowlist
# .note = ${x%/*} is a bash expansion at zero forks, where dirname costs one. it strips
#         no segment when the path holds no slash, so a bare "hook.sh" invocation falls
#         back to "." — the same answer dirname would have given.
HOOK_DIR="${BASH_SOURCE[0]%/*}"
[[ "$HOOK_DIR" == "${BASH_SOURCE[0]}" ]] && HOOK_DIR="."
ALLOWLIST_FILE="$HOOK_DIR/terms.gerunds.allowlist.jsonc"

# load the shared HARDNUDGE mechanism; an absent lib blocks, loud
# shellcheck source=_hardnudge.lib.sh
source "$HOOK_DIR/_hardnudge.lib.sh" 2>/dev/null || {
  echo "💥 MalfunctionError: ${0##*/} could not load $HOOK_DIR/_hardnudge.lib.sh; the write stays blocked — reinstall the mechanic role" >&2
  exit 2
}

# read the payload: sets TOOL_NAME FILE_PATH CONTENT; exits 0 for a non-Write/Edit or empty content
set_hardnudge_payload

# pre-scan: no -ing word at all => no gerund possible, so exit before any list read
# .why = most writes hold no -ing word. the allowlist read costs 3 execs and the scan
#        costs 3 more; both are wasted when the cheap test already answers "none".
# .note = this OVER-approximates deliberately. it drops the \b anchors and the camelCase
#         split the real scan applies, so every word the real scan finds post-split still
#         holds an -ing substring pre-split and cannot be missed here. a false "maybe"
#         costs one parse; a false "no" would be a silent policy hole.
if ! grep -qE '[a-zA-Z]+ing' <<< "$CONTENT"; then
  exit 0
fi

# load allowlist into a set (strip comments, extract all words)
# .note = an ABSENT allowlist leaves this empty, so every -ing word blocks (fail closed).
# 🔴 .note = a MALFORMED allowlist also fails closed, and it says so: the parse error
#            is reported on stderr, so a human who sees `string` blocked learns the
#            cause is the config, not the word. the verdict stays a block.
declare -A ALLOWED=()
ALLOWLIST_WORDS=""

# every string in the allowlist, one per line: sets ALLOWLIST_WORDS, or ALLOWLIST_CAUSE and
# returns 1 (its partial read is dropped, so no half-read word is allowed)
# .note = only whole-line `//` comments are stripped, so a `//` inside a string survives.
#         jq writes naught to stderr on success, so `2>&1` leaves the words clean; on failure
#         the last line captured is jq's own complaint, so the cause costs no extra fork
set_allowlist_words() {
  local file="${1#file=}"
  ALLOWLIST_WORDS=$(sed 's|^[[:space:]]*//.*$||' "$file" | jq -r '.. | strings' 2>&1) && return 0
  ALLOWLIST_CAUSE="${ALLOWLIST_WORDS##*$'\n'}"
  ALLOWLIST_WORDS=""
  return 1
}

# read the allowlist; a parse failure warns and allows no word
if [[ -f "$ALLOWLIST_FILE" ]] && ! set_allowlist_words file="$ALLOWLIST_FILE"; then
  {
    echo "💥 MalfunctionError: the gerunds allowlist could not be parsed; no word is allowed"
    echo "    config: $ALLOWLIST_FILE"
    echo "    why:    $ALLOWLIST_CAUSE"
    echo "    effect: every -ing word blocks, the allowlisted ones too"
    echo "    fix:    repair the json in terms.gerunds.allowlist.jsonc"
    echo ""
  } >&2
  WARNED=1
fi

# index the allowed words for an O(1) lookup per -ing word
while read -r allowed_word; do
  [[ "$allowed_word" =~ ^[a-zA-Z]+$ ]] || continue
  ALLOWED["${allowed_word,,}"]=1
done <<< "$ALLOWLIST_WORDS"

# extract all -ing words from content (handle camelCase by split on case boundaries)
mapfile -t ING_WORDS < <(
  echo "$CONTENT" | \
    sed 's/\([a-z]\)\([A-Z]\)/\1 \2/g' | \
    grep -oE '\b[a-zA-Z]+ing\b' | \
    sort -u || true
)

# filter against allowlist to get gerunds
# .note = ${word,,} lowercases in-shell, where echo|tr cost one exec PER WORD;
#         the set lookup is O(1), where the prior scan was O(allowlist) per word
GERUNDS=()
for word in "${ING_WORDS[@]}"; do
  if [[ -n "$word" ]] && [[ -z "${ALLOWED[${word,,}]:-}" ]]; then
    GERUNDS+=("$word")
  fi
done

# if no gerunds detected, allow
if [[ ${#GERUNDS[@]} -eq 0 ]]; then
  exit 0
fi

# HARDNUDGE: a retry within the window exits 0 here; a first attempt is stamped and falls
# through to the block. the window, the lock, and the stamp live in _hardnudge.lib.sh.
run_hardnudge_gate nudge_name=terms.gerunds -- "${GERUNDS[@]}"

# the suggestion table: one row per gerund, matched EXACTLY on the lowercased word
# .why = a glob `case` with `*loading*` arms let an earlier arm shadow a later one —
#        `*wrapping*` caught `unwrapping` before its own arm, and `*binding*` caught
#        `rebinding`. an exact key cannot shadow another key.
# .note = a word with no exact row falls back to the LONGEST row it ends with, so
#         `preloading` still reads `loading`'s alternatives
declare -A GERUND_ALTS=(
  [existing]="found, prior, current"
  [loading]="load, loaded, loader"
  [processing]="process, processed, processor"
  [running]="run, active, runner"
  [pending]="queued, awaited, unresolved"
  [building]="build, built, structure"
  [handling]="handle, handler"
  [missing]="absent, notFound, lacks"
  [matching]="matched, match, fits"
  [remaining]="left, rest, residual"
  [setting]="set, config, option"
  [getting]="get, fetch, retrieve"
  [creating]="create, created, creator"
  [updating]="update, updated, updater"
  [deleting]="delete, deleted, remover"
  [saving]="save, saved, persist"
  [reading]="read, reader"
  [writing]="write, writer"
  [opening]="open, opened, opener"
  [closing]="close, closed, closer"
  [starting]="start, started, starter"
  [stopping]="stop, stopped, stopper"
  [waiting]="wait, awaited, pending"
  [checking]="check, checked, checker"
  [testing]="test, tested, tester"
  [parsing]="parse, parsed, parser"
  [formatting]="format, formatted, formatter"
  [validating]="validate, validated, validator"
  [filtering]="filter, filtered"
  [sorting]="sort, sorted, sorter"
  [mapping]="map, mapped, mapper"
  [reducing]="reduce, reduced, reducer"
  [finding]="find, found, finder"
  [searching]="search, searched, searcher"
  [logging]="log, logged, logger"
  [tracking]="track, tracked, tracker"
  [rendering]="render, rendered, renderer"
  [computing]="compute, computed"
  [calculating]="calculate, calculated"
  [fetching]="fetch, fetched, fetcher"
  [sending]="send, sent, sender"
  [receiving]="receive, received, receiver"
  [connecting]="connect, connected, connector"
  [disconnecting]="disconnect, disconnected"
  [encoding]="encode, encoded, encoder"
  [decoding]="decode, decoded, decoder"
  [compiling]="compile, compiled, compiler"
  [executing]="execute, executed, executor"
  [calling]="call, called, caller"
  [invoking]="invoke, invoked, invoker"
  [binding]="bind, bound, binder"
  [rebinding]="rebind, rebound"
  [listening]="listen, listener"
  [watching]="watch, watched, watcher"
  [streaming]="stream, streamed, streamer"
  [buffering]="buffer, buffered"
  [caching]="cache, cached"
  [queuing]="queue, queued"
  [polling]="poll, polled, poller"
  [retrying]="retry, retried"
  [timing]="time, timed, timer"
  [scheduling]="schedule, scheduled, scheduler"
  [spawning]="spawn, spawned, spawner"
  [forking]="fork, forked"
  [cloning]="clone, cloned"
  [copying]="copy, copied"
  [moving]="move, moved, mover"
  [renaming]="rename, renamed"
  [merging]="merge, merged, merger"
  [splitting]="split, splitter"
  [joining]="join, joined, joiner"
  [grouping]="group, grouped"
  [padding]="pad, padded"
  [trimming]="trim, trimmed"
  [wrapping]="wrap, wrapped, wrapper"
  [unwrapping]="unwrap, unwrapped"
  [locking]="lock, locked, locker"
  [unlocking]="unlock, unlocked"
  [hashing]="hash, hashed, hasher"
  [signing]="sign, signed, signer"
  [verifying]="verify, verified, verifier"
  [initializing]="init, initialized, initializer"
  [configuring]="configure, configured"
  [migrating]="migrate, migrated, migrator"
  [seeding]="seed, seeded, seeder"
  [deploying]="deploy, deployed, deployer"
  [provisioning]="provision, provisioned"
  [scaling]="scale, scaled, scaler"
  [monitoring]="monitor, monitored"
  [alerting]="alert, alerted, alerter"
  [notifying]="notify, notified, notifier"
  [publishing]="publish, published, publisher"
  [subscribing]="subscribe, subscribed, subscriber"
  [emitting]="emit, emitted, emitter"
  [dispatching]="dispatch, dispatched, dispatcher"
  [triggering]="trigger, triggered"
  [importing]="import, imported, importer"
  [exporting]="export, exported, exporter"
  [scanning]="scan, scanned, scanner"
  [profiling]="profile, profiled, profiler"
  [debugging]="debug, debugged, debugger"
  [tracing]="trace, traced, tracer"
  [sampling]="sample, sampled, sampler"
  [mocking]="mock, mocked, mocker"
  [stubbing]="stub, stubbed"
  [spying]="spy, spied"
  [asserting]="assert, asserted"
  [expecting]="expect, expected"
  [throwing]="throw, thrown, thrower"
  [catching]="catch, caught, catcher"
  [warning]="warn, warned, warner"
  [nesting]="nest, nested"
  [flattening]="flatten, flattened"
  [iterating]="iterate, iterated, iterator"
  [looping]="loop, looped"
  [recursing]="recurse, recursed"
  [branching]="branch, branched"
  [spacing]="space, spaced, spacer"
)

# .what = the alternatives for one gerund: its exact row, else the longest row it ends with
# .note = sets GERUND_ALT rather than prints it, so the caller pays no `$( )` fork per word
# .note = the fallback walk runs only on the block path, per blocked word
# .note = bash walks an associative array in hash order, which no run may rely on: two rows
#         of one length that both end the word tie, and the alphabetically first wins
set_gerund_alt() {
  local word="${1#word=}"
  word="${word,,}"
  GERUND_ALT="${GERUND_ALTS[$word]:-}"
  [[ -n "$GERUND_ALT" ]] && return 0
  local key best=""
  for key in "${!GERUND_ALTS[@]}"; do
    [[ "$word" == *"$key" ]] || continue
    [[ ${#key} -lt ${#best} ]] && continue
    [[ ${#key} -eq ${#best} && "$key" > "$best" ]] && continue
    best="$key"
  done
  # .note = an empty key is a bad subscript for an associative array, so the default
  #         lands first and the row lookup runs only when a row was found
  GERUND_ALT="remove -ing suffix"
  [[ -n "$best" ]] && GERUND_ALT="${GERUND_ALTS[$best]}"
  return 0
}

# build block message
# 🟡 .note = stderr ONLY is deliberate, and it is a declared exception to
#            rule.require.skill-output-streams (which asks for both streams).
#            a PreToolUse hook is not a skill a human reads: claude code reads
#            the BLOCK REASON from stderr, and treats stdout as the hook's own
#            channel to the model. a copy on stdout would be injected into the
#            turn as hook output, so the human would read the refusal twice and
#            the model once as content. the tests assert `stdout === ''` to hold
#            this line — do not "fix" the stream split.
#
# 🟡 .note = the `fix:` lines in this hook's error messages are UNMARKED PROSE,
#            and that is a second declared exception — to rule.require.coconut-hints,
#            which asks a next-move to render as a `🥥 did you know?` treestruct.
#            this stderr is not a cli render — it is a BLOCK REASON claude code reads
#            back to the model, where a `🥥` header is a token cost with no reader to
#            serve. rule.require.errors-name-the-fix IS satisfied: every message here
#            names what, why, and the exact next move.
{
  # .note = the blank is SKIPPED when a warn above already closed with one.
  #         `set -u` is on, so the default expansion is required.
  [[ -n "${WARNED:-}" ]] || echo ""
  echo "✋ ConstraintError: gerund(s) detected in file write"
  echo ""
  echo "file: $FILE_PATH"
  echo ""
  echo "detected gerunds:"
  for gerund in "${GERUNDS[@]}"; do
    set_gerund_alt word="$gerund"
    echo "  ⛔ $gerund → consider: $GERUND_ALT"
  done
  echo ""
  echo "gerunds degrade clarity. see rule.forbid.gerunds for alternatives."
  echo ""
  echo "if this is intentional and absolutely unavoidable (e.g., library API requirement), retry the same operation."
  echo ""
} >&2

exit 2
