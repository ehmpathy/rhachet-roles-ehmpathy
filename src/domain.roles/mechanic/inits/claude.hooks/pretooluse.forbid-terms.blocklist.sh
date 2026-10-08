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

# fail closed on a crash: claude code reads any PreToolUse exit but 2 as a permit, so an unbound
# var or a failed command would otherwise open this gate in silence
# .note = each write is guarded and SIGPIPE ignored, so a closed stream cannot stop the exit 2
trap '' PIPE
trap 'hook_exit=$?; if [[ $hook_exit -ne 0 && $hook_exit -ne 2 ]]; then hook_crash="💥 MalfunctionError: ${0##*/} crashed (exit $hook_exit); the tool call stays blocked — retry once; if it recurs, report the defect to the ehmpathy mechanic role repo"; printf "%s\n" "$hook_crash" || true; printf "%s\n" "$hook_crash" >&2 || true; exit 2; fi' EXIT

# find hook directory, for the shared lib and the blocklist config
# .note = ${x%/*} is a bash expansion at zero forks, where dirname costs one. it strips
#         no segment when the path holds no slash, so a bare "hook.sh" invocation falls
#         back to "." — the same answer dirname would have given.
HOOK_DIR="${BASH_SOURCE[0]%/*}"
[[ "$HOOK_DIR" == "${BASH_SOURCE[0]}" ]] && HOOK_DIR="."
BLOCKLIST_FILE="$HOOK_DIR/terms.blocklist.jsonc"

# load the shared HARDNUDGE mechanism; an absent lib blocks, loud
# shellcheck source=_hardnudge.lib.sh
source "$HOOK_DIR/_hardnudge.lib.sh" 2>/dev/null || {
  echo "💥 MalfunctionError: ${0##*/} could not load $HOOK_DIR/_hardnudge.lib.sh; the write stays blocked — reinstall the mechanic role" >&2
  exit 2
}

# read the payload: sets TOOL_NAME FILE_PATH CONTENT; exits 0 for a non-Write/Edit or empty content
set_hardnudge_payload

# skip if no blocklist config
# .note = an ABSENT config is the documented way to disable this gate
if [[ ! -f "$BLOCKLIST_FILE" ]]; then
  exit 0
fi

# load the blocklist ONCE: the alternation to test with, then one record per term
# .why = one exec emits the alternation on line 1 and term<TAB>why<TAB>alt on each line
#        after. a per-term read costs 3 jq × 9 terms = 27 execs for detail the common
#        clean write discards unread.
# 🔴 .note = a MALFORMED blocklist fails LOUD and blocks. a parse error once yielded an
#            empty result, and the gate opened for every term with no signal. an ABSENT
#            file (the check above) is the one quiet off switch.
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
# .note = sets BLOCKLIST_LINES, or BLOCKLIST_CAUSE and returns 1. jq writes naught to
#         stderr on success, so `2>&1` leaves the lines clean; on failure the last line
#         captured is jq's own complaint, so the cause costs no extra fork
set_blocklist_lines() {
  local file="${1#file=}"
  BLOCKLIST_LINES=$(
    sed 's|^[[:space:]]*//.*$||' "$file" \
      | jq -r '(.terms // []) as $t
               | [([$t[] | .term | strings] | join("|")),
                  ($t[] | [((.term | strings) // ""),
                           ((.why | strings) // ""),
                           (try ((.alt // []) | join(", ")) catch "")] | @tsv)]
               | .[]' 2>&1
  ) && return 0
  BLOCKLIST_CAUSE="${BLOCKLIST_LINES##*$'\n'}"
  return 1
}

# .note = the read sits in an `if` condition, so `set -e` cannot abort on it and the
#         failure branch always renders the message and the block
if ! set_blocklist_lines file="$BLOCKLIST_FILE"; then
  {
    echo ""
    echo "💥 MalfunctionError: the blocklist config could not be parsed ($BLOCKLIST_CAUSE)"
    echo ""
    echo "config: $BLOCKLIST_FILE"
    echo "file:   $FILE_PATH"
    echo ""
    echo "why: the config is not valid json (after whole-line // comments are stripped), or its"
    echo "     .terms is not a list. a config that cannot be read guards no term."
    echo ""
    echo "fix: repair the json in terms.blocklist.jsonc — or delete the file to turn"
    echo "     this gate off on purpose."
    echo ""
  } >&2
  exit 2
fi

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
# the terms the content holds, each with its why and alt, from the `term<TAB>why<TAB>alt` rows
# .note = named args `content=` `rows=`; sets the global array DETECTED_TERMS and the global
#         DETECTED_INFO (the render lines). a term grep cannot compile is skipped and warned
set_detected_terms() {
  local content="" rows=""
  local "$@"
  DETECTED_TERMS=()
  DETECTED_INFO=""
  local term why alt grep_status
  while IFS=$'\t' read -r term why alt; do
    [[ -z "$term" ]] && continue

    # grep exit 0 = present, 1 = absent, >1 = a term that is not a valid regex
    grep_status=0
    grep -iqE "\\b${term}\\b" <<< "$content" 2>/dev/null || grep_status=$?
    [[ $grep_status -eq 1 ]] && continue

    # present: record it with its why and alt
    if [[ $grep_status -eq 0 ]]; then
      DETECTED_TERMS+=("$term")
      DETECTED_INFO="${DETECTED_INFO}  ⛔ ${term}\n    why: ${why}\n    alt: ${alt}\n"
      continue
    fi

    # not a valid regex: skip it, loud; the verdict is untouched
    {
      echo "💥 MalfunctionError: blocklist term SKIPPED — it is not a valid regex: ${term}"
      echo "    why:    grep could not compile it, so this term guarded naught"
      echo "    effect: every other term still guards; only this one is blind"
      echo "    fix:    escape or remove it in terms.blocklist.jsonc"
      echo ""
    } >&2
    # .what = this warn already closed with a blank line
    # .why  = the block message below opens with its own `echo ""`. both are
    #         right alone and stack into a DOUBLE blank when both fire. the
    #         flag lets the header drop its first blank, and only then.
    WARNED=1
  done <<< "$rows"
  return 0
}
set_detected_terms content="$CONTENT" rows="${BLOCKLIST_LINES#*$'\n'}"

# if no terms detected, allow
# .note = reachable when the alternation matches but no single term does — the alternation
#         is a superset gate, so it over-approximates and this walk stays the authority
if [[ ${#DETECTED_TERMS[@]} -eq 0 ]]; then
  exit 0
fi

# HARDNUDGE: a retry within the window exits 0 here; a first attempt is stamped and falls
# through to the block. the window, the lock, and the stamp live in _hardnudge.lib.sh.
run_hardnudge_gate nudge_name=terms.blocklist -- "${DETECTED_TERMS[@]}"

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
