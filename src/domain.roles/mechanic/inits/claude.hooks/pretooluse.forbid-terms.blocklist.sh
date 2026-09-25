#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to forbid terms from a configurable blocklist
#
# .why  = certain terms are overloaded or vague and degrade precision.
#         this hook blocks Write and Edit operations that contain
#         blocklisted terms, via the HARDNUDGE pattern (block first,
#         allow retry).
#
# .how  = reads JSON from stdin, extracts content from Write/Edit,
#         loads terms.blocklist.jsonc, scans for matches, blocks
#         on first attempt but allows retry within 5 minutes.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# guarantee:
#   - blocks blocklisted terms on first attempt
#   - allows retry within 5 min window (HARDNUDGE)
#   - shows why term is forbidden and alternatives
######################################################################

# 🟡 .note = this hook runs under a timeout (getMechanicRole.ts), and a killed
#            PreToolUse hook reads as NOT blocked ⇒ a forbidden term lands with
#            no diagnostic. the cap stays: no timeout hangs every tool call.
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
#        -j drops the final newline, so a tab-split yields exact values. a tab cannot
#        appear in a tool_name, and jq's @tsv escapes one in a path.
# .note = read returns 1 at EOF even when it set both vars, and -j guarantees EOF with
#         no newline. the `|| true` keeps set -e from reading that as a failure.
IFS=$'\t' read -r TOOL_NAME FILE_PATH < <(
  echo "$STDIN_INPUT" | jq -rj '[(.tool_name // ""), (.tool_input.file_path // "")] | @tsv' 2>/dev/null || echo ""
) || true

# 🟡 .note = a malformed (non-empty) payload is a SILENT PERMIT, by ruling rather than
#            by oversight. `2>/dev/null || echo ""` leaves TOOL_NAME empty, so the guard
#            below reads true and the hook exits 0 with no signal — the same fail-open
#            class as the timeout above and the config-list read below.
#
#            acceptance #2's "no policy change, either direction" covers DEGRADED mode,
#            so a repair here is as forbidden as a relaxation. the verdict is PINNED
#            rather than fixed: `[case22]` asserts exit 0 with empty streams, so any
#            future repair is a visible test change.

# skip if not Write or Edit
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# extract content to scan based on tool type
# .why = content holds tabs and newlines, so it cannot ride the tsv above
# .note = an Edit is scanned on new_string only, so a term REMOVED never blocks.
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

# find hook directory for blocklist config
# .note = ${x%/*} is a bash expansion at zero forks, where dirname costs one. it strips
#         no segment when the path holds no slash, so a bare "hook.sh" invocation falls
#         back to "." — the same answer dirname would have given.
HOOK_DIR="${BASH_SOURCE[0]%/*}"
[[ "$HOOK_DIR" == "${BASH_SOURCE[0]}" ]] && HOOK_DIR="."
BLOCKLIST_FILE="$HOOK_DIR/terms.blocklist.jsonc"

# skip if no blocklist config
if [[ ! -f "$BLOCKLIST_FILE" ]]; then
  exit 0
fi

# load the blocklist ONCE: the alternation to test with, then one record per term
# .why = one exec emits the alternation on line 1 and term<TAB>why<TAB>alt on each line
#        after. a per-term read costs 3 jq × 9 terms = 27 execs for detail the common
#        clean write discards unread.
# .note = an ABSENT or MALFORMED blocklist yields an empty result => the gate opens with no
#         signal. that is the extant failhide, kept deliberately (acceptance #2; A8 ruled).
#
# 🔴 .note = every guard in this jq is LOAD-BEARING, never defensive noise. one stream
#            means ANY jq error kills the SINGLE exec => every line is lost =>
#            TERM_ALTERNATION is empty => the whole gate exits 0, silently.
#            ⇒ one bad record disables all nine terms.
#
# 🔴 .note = the guards are by TYPE, never by presence, and that distinction carries the
#            weight. `.alt // []` covers an ABSENT alt and NOT a wrong-typed one:
#            `"alt": "use"` keeps the string, `"use" | join(", ")` errors, and the gate
#            opens for every write. ⇒ `strings` filters to the type that works; `try/catch`
#            degrades the rest. a human-edited file can hold ANY shape, so a presence check
#            is the wrong instrument — it enumerates one way to be wrong out of many.
#            clamp: `[case25]`.
#
# .note = `[$t[] | .term | strings]` drops a NULL term from the alternation. a bare
#         `[$t[].term]` renders it as an empty alternative — `\b(|deploy)\b` — which
#         matches at every word boundary. the per-term walk is the authority either way,
#         so this narrows a pathological over-approximation rather than a verdict.
#         clamp: `[case24]`.
#
# 🔴 .note = an EMPTY-STRING term differs from a null one: `strings` DROPS a null and
#            KEEPS `""`, so `"term": ""` renders `\b(deploy|)\b`.
#
#            ⇒ MEASURED: an empty alternative is undefined in posix ERE and GNU grep
#            resolves it as never-fires. the per-term walk's `\b\b` behaves the same.
#            an empty term is INERT at BOTH stages — `[case28]` pins that a clean write
#            is permitted AND that the neighbour term still blocks.
#
#            ⚠️ so the failure mode is a SILENT NO-OP, never a universal block: a
#            maintainer who clears a term value has disabled that term with no sign of it.
#
#            it stays as-is. a `select(.term != "")` drops the empty record from the
#            alternation, which is what already happens in effect — no verdict changes,
#            and it costs a policy edit acceptance #2 bars "either direction".
BLOCKLIST_LINES=$(
  sed 's|//.*||' "$BLOCKLIST_FILE" \
    | jq -r '(.terms // []) as $t
             | [([$t[] | .term | strings] | join("|")),
                ($t[] | [((.term | strings) // ""),
                         ((.why | strings) // ""),
                         (try ((.alt // []) | join(", ")) catch "")] | @tsv)]
             | .[]' 2>/dev/null || echo ""
)

# skip if no terms
TERM_ALTERNATION="${BLOCKLIST_LINES%%$'\n'*}"
if [[ -z "$TERM_ALTERNATION" ]]; then
  exit 0
fi

# ONE grep decides whether any term is present at all
# .why = one alternation in place of 9 per-term greps, so the common clean write pays a
#        single exec.
# 🔴 .note = grep exit 1 = "no match"; exit 2 = "bad pattern". ONE grep means a term that
#            holds a regex metacharacter errors the ONLY grep and permits ALL NINE, with
#            no signal. so exit 2 fails LOUD here, and must never be folded back into the
#            exit-1 path (rule.forbid.failhide).
#
# ⚠️ .note = stderr is suppressed HERE and re-derived in the error branch below. grep
#            writes its own `grep: Unmatched ( or \(` to inherited stderr, which would
#            land AHEAD of the message below — a human reads the cryptic tool error first
#            and the actionable one second. no diagnostic is lost: the branch re-runs grep
#            against EMPTY input to recover the exact line, and a pattern that cannot
#            compile fails on any input.
#            ⇒ the extra exec is paid ONLY on the fatal path, so the clean and tripped
#            paths are untouched (acceptance #1).
grep -iqE "\\b(${TERM_ALTERNATION})\\b" <<< "$CONTENT" 2>/dev/null && ANY_TERM_PRESENT=true || {
  GREP_STATUS=$?
  if [[ $GREP_STATUS -gt 1 ]]; then
    GREP_DIAG=$(grep -iqE "\\b(${TERM_ALTERNATION})\\b" <<< "" 2>&1 || true)
    {
      echo ""
      echo "💥 MalfunctionError: the blocklist holds a term that is not a valid regex"
      echo ""
      echo "file: $FILE_PATH"
      echo ""
      echo "the combined pattern failed to compile:"
      echo "  \\b(${TERM_ALTERNATION})\\b"
      echo ""
      echo "what grep said:"
      echo "  ${GREP_DIAG:-no detail available}"
      echo ""
      echo "fix: escape or remove the bad term in terms.blocklist.jsonc"
      echo "     a term is matched as a regex, so ( ) [ ] | * + ? . \\ must be escaped."
      echo ""
      echo "this fails loud on purpose: a pattern that cannot compile would otherwise"
      echo "permit EVERY blocklisted term with no signal at all."
      echo ""
    } >&2
    exit 2
  fi
  ANY_TERM_PRESENT=false
}

# if no term is present, allow — ahead of any nudge file work
if [[ "$ANY_TERM_PRESENT" != "true" ]]; then
  exit 0
fi

# a term IS present: walk the records to name which, with why and alt
# .why = this loop runs ONLY on a write that trips, and forks no jq per term
# 🔴 .note = DETECTED_TERMS is a bash ARRAY, never a hand-built json string. an
#            interpolated `"${TERM}"` handed to `--argjson` yields malformed json for any
#            term that holds a `"` or a `\` — and the blocklist is human-edited. jq then
#            fails, `|| rm -f` discards the write, and the HARDNUDGE record is never
#            stamped. the block still exits 2, so no signal is raised, and the deliberate
#            retry re-blocks forever. `--args` escapes each element itself, at zero extra
#            forks (rule.forbid.failhide).
#
# 🔴 .note = the TWO LAYERS DISAGREE about what a grep failure means, on purpose.
#            the alternation above fails LOUD on exit 2: its failure leaves ALL nine terms
#            unguarded — a hole the size of the whole blocklist. this walk SKIPS the term:
#            its failure costs exactly one term's detail, and a louder verdict here is a
#            policy change acceptance #2 bars in both directions.
#            ⇒ the SIZE OF THE HOLE sets the policy, never the class of the error.
# ⚠️ .note = the skip stays; the SILENCE does not. a bad pattern here is reported on
#            stderr with the verdict untouched — the same split the nudge-record write
#            makes (loud diagnostic, unchanged verdict).
DETECTED_TERMS=()
DETECTED_INFO=""
while IFS=$'\t' read -r TERM WHY ALT; do
  [[ -z "$TERM" ]] && continue
  if grep -iqE "\\b${TERM}\\b" <<< "$CONTENT" 2>/dev/null; then
    DETECTED_TERMS+=("$TERM")
    DETECTED_INFO="${DETECTED_INFO}  ⛔ ${TERM}\n    why: ${WHY}\n    alt: ${ALT}\n"
  elif [[ $? -gt 1 ]]; then
    {
      echo "💥 MalfunctionError: blocklist term SKIPPED — it is not a valid regex: ${TERM}"
      echo "    why:    grep could not compile it, so this term guarded naught"
      echo "    effect: every other term still guards; only this one is blind"
      echo "    fix:    escape or remove it in terms.blocklist.jsonc"
      echo ""
    } >&2
    # .what = this warn already closed with a blank line
    # .why  = the block message below opens with its own `echo ""`. both are
    #         right alone and stack into a DOUBLE blank when both fire. the
    #         flag lets the header drop its leading blank, and only then.
    WARNED=1
  fi
done <<< "${BLOCKLIST_LINES#*$'\n'}"

# if no terms detected, allow
# .note = reachable when the alternation matches but no single term does — the alternation
#         is a superset gate, so it over-approximates and this walk stays the authority
if [[ ${#DETECTED_TERMS[@]} -eq 0 ]]; then
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
  mkdir -p "$PWD/.claude"
  CLAUDE_DIR="$PWD/.claude"
}

NUDGE_FILE="$CLAUDE_DIR/terms.blocklist.nudges.local.json"

# ensure nudge file exists
#
# 🔴 .note = the `|| true` is LOAD-BEARING. a bare simple command under `set -euo
#            pipefail` exits the shell on failure, so an unwritable `.claude` (read-only
#            mount, full disk) aborts at status 1 — BEFORE the block message and BEFORE
#            `exit 2`. claude code reads a non-2 exit as NOT BLOCKED ⇒ the forbidden term
#            lands, silently. the same fail-open family as the hook timeout, the `rm -f`
#            sweep, and the `mv` that `[case26]` clamps.
#
# .note = guarded, an absent file fails CLOSED: the read below is `|| echo "0"`, so
#         LAST_ATTEMPT is 0, `elapsed` is enormous, the window check falls through, and
#         the hook blocks. ⇒ an unwritable state dir costs the RETRY, never the gate.
#
# .note = no VERDICT changes on any healthy path — this branch runs only when the file is
#         absent AND unwritable, so healthy output stays byte-identical (acceptance #4).
#         clamp: `[case29]`.
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
#            ⇒ a failed cleanup of a temp file would PERMIT a forbidden term.
#            the same fail-open family as the hook timeout and the `mv` that `[case26]`
#            clamps. it is negligible in LIKELIHOOD (`rm -f` needs an unwritable TMPDIR)
#            and not in KIND, and the cost to close it is one token.
TMP_FILE=$(mktemp)
jq --argjson now "$NOW" --argjson threshold "$STALE_THRESHOLD_SECONDS" \
  'to_entries | map(select(.value.time > ($now - $threshold))) | from_entries' \
  "$NUDGE_FILE" > "$TMP_FILE" 2>/dev/null && mv "$TMP_FILE" "$NUDGE_FILE" || rm -f "$TMP_FILE" || true

# first attempt - record and block
#
# 🔴 .why loud = a lost stamp is STATE LOST, and its harm outlives this invocation. the
#                block still exits 2, so the refusal reads as ordinary — and the deliberate
#                retry then RE-BLOCKS forever, on every future write to this file, because
#                the clock it reads was never started. a silent `|| rm -f` makes that
#                permanent condition indistinguishable from a normal first block
#                (rule.forbid.failhide).
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
#            reaches the warn and always reaches `exit 2`. clamp: `[case26]`.
#
# .note = `2>/dev/null` on the `mv` keeps its own diagnostic off stderr. the warn below is
#         the one report a human reads, and a raw `mv: cannot move …` beside it would put
#         a temp path into the block output (acceptance #4).
TMP_FILE=$(mktemp)
if ! { jq --arg key "$NUDGE_KEY" --argjson time "$NOW" --arg path "$FILE_PATH" \
  '. + {($key): {time: $time, path: $path, terms: $ARGS.positional}}' \
  "$NUDGE_FILE" --args "${DETECTED_TERMS[@]}" > "$TMP_FILE" 2>/dev/null \
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
  # .note = the leading blank is SKIPPED when a warn above already closed with
  #         one. `set -u` is on, so the default expansion is required.
  [[ -n "${WARNED:-}" ]] || echo ""
  echo "✋ ConstraintError: forbidden term(s) detected in file write"
  echo ""
  echo "file: $FILE_PATH"
  echo ""
  echo "detected terms:"
  echo -e "$DETECTED_INFO"
  echo "see rule.forbid.term-* briefs for rationale."
  echo ""
  echo "if this is intentional and absolutely unavoidable, retry the same operation."
  echo ""
} >&2

exit 2
