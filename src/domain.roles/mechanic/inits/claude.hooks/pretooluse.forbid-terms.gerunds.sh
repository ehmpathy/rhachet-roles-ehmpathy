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

# 🟡 .note = this hook runs under a timeout (getMechanicRole.ts), and a killed
#            PreToolUse hook reads as NOT blocked ⇒ a gerund lands with no
#            diagnostic. the cap stays: no timeout hangs every tool call.
#            ⇒ .dream/v2026_09_12.fix.pt5s-hook-timeout-fails-open.md

set -euo pipefail

# config
HARDNUDGE_WINDOW_SECONDS=300  # 5 minutes
STALE_THRESHOLD_SECONDS=3600  # 1 hour

# read JSON from stdin
STDIN_INPUT=$(cat)

# failfast: if no input, error
if [[ -z "$STDIN_INPUT" ]]; then
  {
    echo "✋ ConstraintError: PreToolUse hook received no input via stdin"
    echo "  why: claude code pipes {tool_name, tool_input} as json on stdin"
    echo "  fix: pipe a payload, e.g."
    echo "       echo '{\"tool_name\":\"Write\",\"tool_input\":{\"content\":\"…\"}}' | ${BASH_SOURCE[0]}"
  } >&2
  exit 2
fi

# extract tool name and file path in ONE jq pass
# .why = three jq execs over one payload cost three forks; one emits both fields.
#        -j drops the trailing newline, so a tab-split yields exact values. a tab
#        cannot appear in a tool_name, and jq's @tsv escapes one in a path.
# .note = read returns 1 at EOF even when it set both vars, and -j guarantees EOF with
#         no newline. the `|| true` keeps set -e from a false failure here.
IFS=$'\t' read -r TOOL_NAME FILE_PATH < <(
  echo "$STDIN_INPUT" | jq -rj '[(.tool_name // ""), (.tool_input.file_path // "")] | @tsv' 2>/dev/null || echo ""
) || true

# 🟡 .note = a malformed (non-empty) payload is a SILENT PERMIT, by verdict rather than
#            by oversight. `2>/dev/null || echo ""` leaves TOOL_NAME empty, so the guard
#            below reads true and the hook exits 0 with no signal.
#
#            🔴 it is the SECOND of this hook's two fail-opens; the other is the
#            timeout named in the header. ⇒ the `case=5` asymmetry a reader expects of
#            this file holds for the CONFIG read and NOT for the PAYLOAD read.
#
#            acceptance #2's "no policy change, either direction" covers DEGRADED mode,
#            so a repair here is as forbidden as a relaxation. the verdict is PINNED
#            rather than fixed: `[case18]` asserts exit 0 with empty streams, so any
#            future repair is a visible test change.

# skip if not Write or Edit
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# extract content to scan based on tool type
# .why = content holds tabs and newlines, so it cannot ride the tsv above
# .note = an Edit is scanned on new_string only, so a word REMOVED never blocks.
#         the gate above admits only Write or Edit, so these two cases are total.
CONTENT_FIELD='.tool_input.content'
if [[ "$TOOL_NAME" == "Edit" ]]; then
  CONTENT_FIELD='.tool_input.new_string'
fi
CONTENT=$(echo "$STDIN_INPUT" | jq -r "$CONTENT_FIELD // empty" 2>/dev/null || echo "")

# skip if no content
if [[ -z "$CONTENT" ]]; then
  exit 0
fi

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

# find hook directory for allowlist
# .note = ${x%/*} is a bash expansion at zero forks, where dirname costs one. it strips
#         no segment when the path holds no slash, so a bare "hook.sh" invocation falls
#         back to "." — the same answer dirname would have given.
HOOK_DIR="${BASH_SOURCE[0]%/*}"
[[ "$HOOK_DIR" == "${BASH_SOURCE[0]}" ]] && HOOK_DIR="."
ALLOWLIST_FILE="$HOOK_DIR/terms.gerunds.allowlist.jsonc"

# load allowlist into a set (strip comments, extract all words)
# .note = an ABSENT or MALFORMED allowlist leaves this empty, so every -ing word blocks.
#         that is extant fail-CLOSED behavior, preserved deliberately (acceptance #2).
declare -A ALLOWED=()
if [[ -f "$ALLOWLIST_FILE" ]]; then
  while read -r allowed_word; do
    [[ -n "$allowed_word" ]] && ALLOWED["$allowed_word"]=1
  done < <(
    sed 's|//.*||' "$ALLOWLIST_FILE" | jq -r '.. | strings' 2>/dev/null | grep -E '^[a-zA-Z]+$' || true
  )
fi

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

# find .claude directory
# .note = ${dir%/*} strips the last path segment in-shell. dirname cost one exec PER
#         PARENT DIR, so a deep worktree paid ~7 forks here on every invocation.
# .note = the walk stops at "/" exactly as the dirname form did, so "/.claude" is never
#         consulted. ${dir%/*} yields "" where dirname yields "/", hence the -z guard.
find_claude_dir() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.claude" ]]; then
      echo "$dir/.claude"
      return 0
    fi
    dir="${dir%/*}"
    [[ -z "$dir" ]] && dir="/"
  done
  return 1
}

CLAUDE_DIR=$(find_claude_dir) || {
  # no .claude dir, create it
  mkdir -p "$PWD/.claude"
  CLAUDE_DIR="$PWD/.claude"
}

NUDGE_FILE="$CLAUDE_DIR/terms.gerunds.nudges.local.json"

# ensure nudge file exists
#
# 🔴 .note = the `|| true` is LOAD-BEARING. a bare simple command under `set -euo
#            pipefail` exits the shell on failure, so an unwritable `.claude` (read-only
#            mount, full disk) aborts at status 1 — BEFORE the block message and BEFORE
#            `exit 2`. claude code reads a non-2 exit as NOT BLOCKED ⇒ the gerund lands,
#            silently. the same fail-open family as the hook timeout, the `rm -f` sweep,
#            and the `mv` that `[case18]` clamps.
#
# .note = guarded, an absent file fails CLOSED: the read below is `|| echo "0"`, so
#         LAST_ATTEMPT is 0, `elapsed` is enormous, the window check falls through, and
#         the hook blocks. ⇒ an unwritable state dir costs the RETRY, never the gate.
#
# .note = no VERDICT changes on any healthy path — this branch runs only when the file is
#         absent AND unwritable, so healthy output stays byte-identical (acceptance #4).
#         clamp: `[case21]`.
if [[ ! -f "$NUDGE_FILE" ]]; then
  echo '{}' > "$NUDGE_FILE" || true
fi

NOW=$(date +%s)

# build nudge key as hash of file_path
NUDGE_KEY=$(echo -n "${FILE_PATH}" | sha256sum | cut -d' ' -f1)

# check last attempt time (nudge format: { hash: { time, path, terms } })
LAST_ATTEMPT=$(jq -r --arg key "$NUDGE_KEY" '.[$key].time // 0' "$NUDGE_FILE" 2>/dev/null || echo "0")
elapsed=$((NOW - LAST_ATTEMPT))

# ⚠️ .note = this window reads the WALL CLOCK, never a monotonic counter. a backwards
#            clock jump (ntp correction, `date -s`, container snapshot restore) holds the
#            gate OPEN for this path until the clock catches up: `elapsed` goes negative,
#            `-lt` stays true, every retry permits. the stale sweep reads the same clock,
#            so the record is not pruned either.
# .why  = the fix is a monotonic source, which changes WHEN the gate re-blocks — and
#         acceptance #3 freezes the HARDNUDGE contract ("first attempt blocks, a retry
#         within the window passes"). a correctness repair here is a policy change.
#         ⇒ .dream/v2026_09_12.fix.hardnudge-window-keyed-to-a-wall-clock.md
# .note = the exposure is bounded by construction: the window is 300s and the key is a
#         hash of ONE file path, so a jump of N seconds opens that one path for at most
#         N seconds. it is not a global gate release.
if [[ $elapsed -lt $HARDNUDGE_WINDOW_SECONDS ]]; then
  # within retry window, allow
  exit 0
fi

# cleanup stale entries (older than 1 hour)
# nudge format: { hash: { time, path, terms } }
# .why = the sweep runs on the BLOCK branch ONLY. ahead of detection it costs every clean
#        write 3 execs to prune a file it never reads; ahead of the window check it costs
#        every permitted RETRY the same 3 execs.
#
# .note = this placement is verdict-neutral, and the proof is an inequality rather than a
#         trace: STALE_THRESHOLD_SECONDS (3600) > HARDNUDGE_WINDOW_SECONDS (300), so any
#         record old enough to sweep was ALREADY outside the window. swept or not, elapsed
#         exceeds the window and the hook blocks. ⇒ fresh, mid, and stale all render the
#         same verdict.
#
# 🔴 .note = the `|| true` below is LOAD-BEARING, never defensive clutter. `set -e` exits
#            on a failed simple command unless it sits in an `if` CONDITION or is a
#            NON-LAST element of an `&&`/`||` list. as the LAST element, a failed `rm -f`
#            aborts the hook — and on the BLOCK branch that abort returns a non-2 status,
#            which claude code reads as NOT BLOCKED.
#            ⇒ a failed cleanup of a temp file would PERMIT a forbidden gerund.
#            the same fail-open family as the hook timeout and the `mv` that `[case19]`
#            clamps. it is negligible in LIKELIHOOD (`rm -f` needs an unwritable TMPDIR)
#            and not in KIND, and the cost to close it is one token.
TMP_FILE=$(mktemp)
jq --argjson now "$NOW" --argjson threshold "$STALE_THRESHOLD_SECONDS" \
  'to_entries | map(select(.value.time > ($now - $threshold))) | from_entries' \
  "$NUDGE_FILE" > "$TMP_FILE" 2>/dev/null && mv "$TMP_FILE" "$NUDGE_FILE" || rm -f "$TMP_FILE" || true

# outside window - all detected gerunds are blocked
BLOCKED_GERUNDS=("${GERUNDS[@]}")

# record attempt with new format: { hash: { time, path, terms } }
# 🔴 .note = the terms ride in as jq positional args, never as a hand-built json string.
#            an interpolated `"${gerund}"` handed to `--argjson` yields malformed json for
#            any word that holds a `"` or a `\`. `--args` escapes each element itself, at
#            zero extra forks (rule.forbid.failhide).
#
# 🔴 .why loud = a lost stamp is STATE LOST, and its harm outlives this invocation. the
#                block still exits 2, so the refusal reads as ordinary — and the deliberate
#                retry then RE-BLOCKS forever, on every future write to this file, because
#                the clock it reads was never started. a silent `|| rm -f` makes that
#                permanent condition indistinguishable from a normal first block.
#
# .note = the warn changes no VERDICT in any state: the decision is already rendered, and
#         the message below is emitted either way. it adds a diagnostic on a path that
#         never runs while the state file is valid ⇒ healthy output stays byte-identical
#         (acceptance #4).
#
# ⚠️ .note = the stale sweep above stays QUIET, and the asymmetry is the design. a failed
#            sweep loses NO state — it defers a prune, and a deferred prune is invisible.
#            any cause that breaks the sweep (unparseable nudge file, full disk) breaks
#            THIS write one line later, where it goes loud. ⇒ one report of one root
#            cause, never two reports of one symptom.
#
# 🔴 .note = the `mv` sits INSIDE the `if` condition, joined by `&&`, and that placement
#            carries the whole guard under `set -euo pipefail`. a failed STANDALONE command
#            in a `then` branch exits the shell with its own status, so `if jq …; then mv …;
#            else <warn> fi` dies at status 1 the moment `mv` fails (read-only dir, full
#            disk, transient rename error) — BEFORE the block message and BEFORE `exit 2`.
#            claude code reads non-2 as NOT BLOCKED ⇒ the forbidden term lands silently, on
#            exactly the "or the write failed" branch the message below advertises.
#            a command in an `if` CONDITION is exempt from `set -e`, so this form always
#            reaches the warn and always reaches `exit 2`. clamp: `[case19]`.
#
# .note = `2>/dev/null` on the `mv` keeps its own diagnostic off stderr. the warn below is
#         the one report a human reads, and a raw `mv: cannot move …` beside it would put
#         a temp path into the block output (acceptance #4).
TMP_FILE=$(mktemp)
if ! { jq --arg key "$NUDGE_KEY" --argjson time "$NOW" --arg path "$FILE_PATH" \
  '. + {($key): {time: $time, path: $path, terms: $ARGS.positional}}' \
  "$NUDGE_FILE" --args "${BLOCKED_GERUNDS[@]}" > "$TMP_FILE" 2>/dev/null \
  && mv "$TMP_FILE" "$NUDGE_FILE" 2>/dev/null; }; then
  # 🔴 .note = `|| true` again, and THIS site is the sharper of the two: an `if`
  #            CONDITION is `set -e`-exempt, an `if` BODY is NOT. an unguarded `rm -f`
  #            here aborts the very path that exists to reach the warn and `exit 2`.
  rm -f "$TMP_FILE" || true
  {
    echo "💥 MalfunctionError: HARDNUDGE record NOT saved — could not update the nudge file"
    echo "    file:   $NUDGE_FILE"
    echo "    why:    it is unparseable json, or the write failed"
    echo "    effect: a deliberate retry will RE-BLOCK instead of pass"
    echo "    fix:    rm '$NUDGE_FILE'  — it is a local cache and regenerates"
    echo ""
  } >&2
  # .what = this warn already closed with a blank line
  # .why  = the block message below opens with its own `echo ""`. both are right
  #         alone and stack into a DOUBLE blank when both fire. the flag lets the
  #         header drop the blank it would otherwise print first, and only then.
  WARNED=1
fi

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
#            the same carve-out applies, for the same reason: that rule scopes
#            itself to "a cli render" and binds to `print_coconut_hint` in this
#            repo's `git.commit/output.sh`. this stderr is not a cli render — it
#            is a BLOCK REASON claude code reads back to the model, where a `🥥`
#            header is a token cost with no reader to serve.
#            ⇒ the universal demand beneath that rule — rule.require.errors-name-the-fix
#            — IS satisfied: every message here names what, why, and the exact
#            next move. only the house SHAPE is skipped.
{
  # .note = the blank is SKIPPED when a warn above already closed with one.
  #         `set -u` is on, so the default expansion is required.
  [[ -n "${WARNED:-}" ]] || echo ""
  echo "✋ ConstraintError: gerund(s) detected in file write"
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
