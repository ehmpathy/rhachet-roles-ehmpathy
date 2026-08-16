#!/usr/bin/env bash
######################################################################
# .what = PermissionRequest hook — auto-decide suspicious prompts that
#         reached the permission seam, so a supervised clone survives
#         false-positive prompts without a human babysitter.
#
# .why  = claude-cli flags many safe commands as "suspicious" (parens,
#         quoted flags, etc) and stalls the run on a human prompt. the
#         super-suspicious injection forms ($(), backticks, process
#         substitution, redirection) are already hard-blocked upstream
#         by the PreToolUse forbid-suspicious-shell-syntax hook (exit 2).
#         what reaches THIS seam is the benign-but-flagged tail — and a
#         clean single rhx call is safe by design. this hook auto-approves
#         exactly that, denies an obvious command-chain, and lifts every
#         other case to a brain (the human today, an inline haiku later).
#
# .the posture = default-deny. a command is APPROVED only if it is
#   provably a single, clean rhx/npx-rhachet call with balanced quotes and
#   NO shell-active metacharacter outside quotes. every other case is DENY
#   or LIFT. this holds even if this hook runs first or the upstream hook
#   drifts.
#
# .why no rhx-subcommand denylist: rhx is an open-ended skill namespace — a glob,
#   effectively — so a decider cannot know which subcommands are dangerous without
#   an enumerated list that decays with every new skill, and to imply it can is a
#   false safety. so this hook does NOT try. the sensitive grants self-protect at
#   EXECUTION inside their own skill scripts, independent of this prompt-level seam.
#
#   - unquoted command-chain char (& ; newline)   -> DENY  (runs a 2nd command)
#   - single clean rhx call, no unquoted metachar -> APPROVE (safe by design)
#   - every other case (non-rhx, unbalanced quote,
#     or rhx with a pipe/redirect/subshell/expansion
#     residue)                                     -> LIFT  (a brain decides:
#                                                            human now, haiku later)
#
# .how  = reads hook json from stdin, extracts tool_input.command, computes
#         the shell-active "residue" (both single- AND double-quote aware,
#         backslash aware), and classifies on the residue via two named
#         predicates. emits the NESTED decision schema on stdout (the shape
#         proven to suppress the prompt on 2.1.87). LIFT emits no stdout, so
#         claude falls back to the human prompt.
#
# usage:
#   configure in .claude/settings.json under hooks.PermissionRequest
#
# verdict schema (nested — proven on claude-cli 2.1.87):
#   allow: {"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"},...}}
#   deny:  {"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"deny"},...}}
#   lift:  (no stdout)
#
# guarantee:
#   ✔ default-deny: approves only a provably clean single rhx call
#   ✔ quote-aware: single- and double-quoted metachars are inert data
#   ✔ fail-safe: any doubt or error -> no decisive stdout -> human prompt
######################################################################

set -euo pipefail

# read hook json from stdin (claude-cli passes input via stdin)
INPUT="$(cat)"

# extract the command; empty -> lift (let the normal flow decide)
CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo '')"
if [[ -z "$CMD" ]]; then
  exit 0
fi

# find the nearest .claude dir upward (as the peer hooks do), for the audit log
find_claude_dir() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.claude" ]]; then echo "$dir/.claude"; return 0; fi
    dir="$(dirname "$dir")"
  done
  return 1
}

# .what = append one auto-decision to a durable, reviewable audit trail.
# .why  = G3 (auditable gate) — "why did the clone run that command?" must have
#         a recorded answer, not a shrug. only allow/deny are logged (a lift
#         makes no decision — the human's own choice is claude-cli's record).
# .note = jsonl in .claude/permission.decisions.local.log — matches the peer
#         `.local` convention and is gitignored (*.log). a write fault degrades
#         to a one-line stderr note, never a hook failure (fail-safe): the
#         decision on stdout is the product; the audit line is a side record.
# .note = the line carries NO timestamp. the verdict is a pure function of the
#         command, so a timeless record stays deterministic and diffable; a
#         wall-clock stamp adds noise, not signal (this .log is local + gitignored,
#         not a forensic chain-of-custody). its removal also spares a `date` fork
#         per decision. the shape is {verdict, reason, command}.
audit_decision() {
  local verdict="$1" reason="$2" claude_dir
  claude_dir="$(find_claude_dir)" || return 0
  printf '{"verdict":"%s","reason":"%s","command":%s}\n' \
    "$verdict" "$reason" "$(printf '%s' "$CMD" | jq -R -s .)" \
    >> "$claude_dir/permission.decisions.local.log" 2>/dev/null \
    || printf 'permissionrequest.decide-permissions: audit write failed (best-effort)\n' >&2
}

# emit the nested allow/deny schema (the shape that suppresses on 2.1.87), THEN
# record the decision to the audit trail (G3).
# .note = only decision.behavior is proven to drive suppression; the reason label
#         is cosmetic, ignored if unread.
# .order = the suppression printf runs FIRST, then the audit i/o (dir walk + jq
#          subprocess) as a side record. this is a DEFENSIVE reorder: IF
#          claude-cli consumes the hook's stdout incrementally, the decision
#          reaches it before any audit cost, so a future fatter audit cannot
#          delay the emit. whether claude-cli reads stdout incrementally or only
#          at process exit is NOT proven — the reorder is harmless either way,
#          not a proven latency win.
# .safety = `reason` is sanitized with pure bash param expansion (no subprocess,
#           so it stays off the critical path): backslash, double-quote, and
#           newline/return are dropped. today every reason is an internal literal,
#           but this clamps a future DYNAMIC value so it can never break the
#           emitted JSON.
emit_decision() {
  local behavior="$1" reason="$2"
  reason="${reason//\\/}"; reason="${reason//\"/}"
  reason="${reason//$'\n'/ }"; reason="${reason//$'\r'/ }"
  # emit FIRST — the latency-critical suppression
  printf '%s\n' "{\"hookSpecificOutput\":{\"hookEventName\":\"PermissionRequest\",\"decision\":{\"behavior\":\"$behavior\"},\"reasoning\":\"$reason\"}}"
  # audit AFTER — a side record, off the critical path
  audit_decision "$behavior" "$reason"
}
emit_allow() { emit_decision "allow" "$1"; }
emit_deny() { emit_decision "deny" "$1"; }

# .what = transformer: compute the shell-active RESIDUE of a command — the
#         command with all QUOTED spans removed, so only chars that bash would
#         actually interpret as shell-active remain. also reports whether the
#         quotes were BALANCED (no span left open at end).
# .why   = a metacharacter inside single OR double quotes is inert data (an
#          rhx arg); only an unquoted one composes, chains, redirects, expands.
#          a single-quote-only model is UNSOUND: an apostrophe inside a
#          double-quoted arg would falsely open a single-quote span and swallow
#          a real, unquoted `; rm -rf ~` — so we model both quote kinds and
#          backslash escapes, exactly as the peer hooks do.
# .the bash rules modeled:
#   - single-quote span: each char literal until the next ' (no escapes within)
#   - double-quote span: literal EXCEPT $ and ` (still expand -> stay active),
#     \ (escapes the next char), and " (closes the span)
#   - unquoted \ escapes the next char (that char is then literal data)
# .outputs = sets globals RESIDUE (the active residue) and RESIDUE_BALANCED
#            (false if a quote span or an open escape was left at the end).
compute_active_residue() {
  local cmd="$1"
  # accumulate active chars into an array (amortized O(1) append), joined once
  # at the end — a per-char `out="$out$ch"` string concat would be O(n^2).
  local -a out_chars=()
  local in_single=false in_double=false escaped=false
  local i=0 len=${#cmd} ch
  while [[ "$i" -lt "$len" ]]; do
    ch="${cmd:$i:1}"
    i=$((i+1))

    # a backslash-escaped char is literal data -> never active
    if [[ "$escaped" == true ]]; then escaped=false; continue; fi

    # inside a single-quote span: each char literal until the close '
    if [[ "$in_single" == true ]]; then
      [[ "$ch" == "'" ]] && in_single=false
      continue
    fi

    # inside a double-quote span: literal except $ ` (active), \ (escape), " (close)
    if [[ "$in_double" == true ]]; then
      if [[ "$ch" == '"' ]]; then in_double=false; continue; fi
      if [[ "$ch" == '\' ]]; then escaped=true; continue; fi
      if [[ "$ch" == '$' || "$ch" == '`' ]]; then out_chars+=("$ch"); continue; fi
      continue
    fi

    # unquoted: quotes open spans, backslash escapes, all else is active residue
    if [[ "$ch" == '\' ]]; then escaped=true; continue; fi
    if [[ "$ch" == "'" ]]; then in_single=true; continue; fi
    if [[ "$ch" == '"' ]]; then in_double=true; continue; fi
    out_chars+=("$ch")
  done

  # join the accumulated chars once (O(n)); printf reuses %s per arg, no separator
  local out=""
  (( ${#out_chars[@]} > 0 )) && printf -v out '%s' "${out_chars[@]}"
  RESIDUE="$out"
  if [[ "$in_single" == true || "$in_double" == true || "$escaped" == true ]]; then
    RESIDUE_BALANCED=false
  else
    RESIDUE_BALANCED=true
  fi
}

# .what = predicate: does the residue chain or background a SECOND command?
# .why   = ; & (background) && (via &) || and a literal newline/carriage-return
#          each run a second command. a single pipe | is a data pipeline, not a
#          chain — it is judged by is_clean_rhx_call (an rhx with a pipe lifts).
is_command_chain() {
  case "$1" in
    *";"*|*"&"*|*"||"*|*$'\n'*|*$'\r'*) return 0 ;;
  esac
  return 1
}

# .what = predicate: is this a single, CLEAN rhx / npx-rhachet call?
# .why   = clean = leads with rhx/npx-rhachet AND the residue holds no other
#          shell-active metachar (no pipe |, redirect < >, subshell ( ),
#          expansion $ or backtick). such a call is safe by design.
# .inputs = $1 = the raw command (for the lead-prefix match, whitespace-trimmed),
#           $2 = the active residue (for the metachar scan).
is_clean_rhx_call() {
  local trimmed="$1" residue="$2"
  while [[ "$trimmed" == [[:space:]]* ]]; do trimmed="${trimmed#?}"; done
  case "$trimmed" in
    rhx\ *|npx\ rhachet\ run\ *|npx\ rhachet\ *|npx\ rhx\ *) ;;
    *) return 1 ;;
  esac
  # ALLOWLIST the residue: a provably-clean single rhx call holds ONLY word chars,
  # blanks, and the punctuation that appears in skill names / flags / plain values
  # (. / = : @ , + -). any other char -> not provably clean -> LIFT. an allowlist
  # is sound where the old denylist ( | < > ( ) $ ` ) silently missed the shell
  # EXPANSIONS bash runs before exec — brace `{ }`, glob `[ ] * ?`, tilde `~` —
  # each able to smuggle a hidden `git.commit.uses set` token past the argv scan
  # (a live auto-approve of a self-grant, caught by the red-team corpus).
  case "$residue" in
    *[![:alnum:]_./=:@,+[:blank:]-]*) return 1 ;;
  esac
  return 0
}

# --- the decider, as narrative ---

# compute the shell-active residue once (both-quote + backslash aware)
compute_active_residue "$CMD"

# 1. an unquoted chain runs a second command -> DENY
if is_command_chain "$RESIDUE"; then
  emit_deny "command chains or backgrounds a second command; banned — run each command as its own separate call"
  exit 0
fi

# 2. a single clean rhx call, with balanced quotes and no active metachar -> APPROVE.
#    rhx is safe by design; the sensitive grants self-protect at EXECUTION inside
#    their own skill scripts, so the seam does not try to enumerate dangerous rhx
#    subcommands — an open-ended, glob-like namespace it cannot soundly denylist.
if [[ "$RESIDUE_BALANCED" == true ]] && is_clean_rhx_call "$CMD" "$RESIDUE"; then
  emit_allow "single clean rhx call, safe by design"
  exit 0
fi

# 3. else -> LIFT: emit no stdout (claude falls back to a brain — human now).
#    a one-line stderr breadcrumb records WHY it lifted, OFF the critical path:
#    stdout stays empty, so the fail-safe fallback is unchanged, but a human is no
#    longer left to guess why a command that looks safe was not auto-approved. the
#    reason names the miss so "why did it lift" is legible, not tribal knowledge.
if [[ "$RESIDUE_BALANCED" != true ]]; then
  printf 'permissionrequest.decide-permissions: lifted to human — unbalanced quotes in command\n' >&2
else
  printf 'permissionrequest.decide-permissions: lifted to human — not a clean single rhx call (an extra shell-active metachar in the residue)\n' >&2
fi
exit 0
