#!/usr/bin/env bash
######################################################################
# .what = render a pr-watch alert, and deliver it into a clone
#
# .why  = an alert names the event and the next command, so a woken clone
#         acts at once; delivery goes through `clone say`, which never types
#         into a modal or over a human's text
#
# usage:
#   source "$SKILL_DIR/git.pull.watch.alert.sh"
#   text="$(as_watch_alert_text "$repo" "$pr" "$events_json" "$end" "$closed_by")"
#   send_watch_alert "$repo_root" "$serial" "$text"   # 0 done · 1 hold · 3 clone dead
#
# guarantee:
#   - never passes --force to clone say (F8)
#   - reads the verdict from the json record, never the exit code alone (F16)
######################################################################

# .what = the longest one `clone say` may take, in seconds
# .why  = a wedged clone socket would stall the tick past its heartbeat; at the
#         bound the alert holds for the next tick, like any other refusal
WATCH_SAY_MAX_SECONDS="${GIT_PULL_WATCH_SAY_MAX_SECONDS:-60}"

# .what = the header phrase of one alert, from its event kinds
# .why  = the first line is what a busy clone scans; it names the event at once
as_watch_alert_phrase() {
  local pr="$1" events="$2" count kinds
  count="$(printf '%s' "$events" | jq 'length')"
  kinds="$(printf '%s' "$events" | jq -r '[.[].kind] | unique | join(",")')"
  [[ "$kinds" == "ci.failed" && "$count" == "1" ]] && { echo "ci failed on #$pr"; return 0; }
  [[ "$kinds" == "ci.failed" ]] && { echo "$count checks failed on #$pr"; return 0; }
  [[ "$kinds" == "review.approved" ]] && { echo "approved #$pr"; return 0; }
  [[ "$kinds" == "comment.new" && "$count" == "1" ]] && { echo "new comment on #$pr"; return 0; }
  [[ "$kinds" == "comment.new" ]] && { echo "$count new comments on #$pr"; return 0; }
  echo "$count events on #$pr"
}

# .what = the mascot vibe line of one alert, from its event kinds
# .why  = the mascot + artifact shape: a 🐢 line sets the mood, then the 🐚
#         root names what it is about; a red check reads as a bummer, an
#         approval as a win, all else as a heads up
as_watch_alert_vibe() {
  local events="$1" kinds
  kinds="$(printf '%s' "$events" | jq -r '[.[].kind] | unique | join(",")')"
  [[ ",$kinds," == *",ci.failed,"* ]] && { echo "bummer dude..."; return 0; }
  [[ "$kinds" == "review.approved" ]] && { echo "shell yeah!"; return 0; }
  echo "heads up dude..."
}

# .what = print the mascot + artifact header: the 🐢 vibe, a gap, the 🐚 root
# usage: print_watch_alert_header <vibe> <root>
print_watch_alert_header() {
  echo "🐢 $1"
  echo ""
  echo "🐚 git.pull.watch — $2"
}

# .what = the leaf lines of one event, one per line, tab-free
# .why  = one shape per event kind, shared by the flat and the sectioned alert
# .note = a ci failure names the head it failed on: an alert held while the clone
#         pushed a fix reads as stale against the clone's own HEAD
# .note = a review body is no comment, so `git.pull.comment get` never shows it;
#         a review event carries its id, and its leaves name the read of the body whole
as_watch_event_leaves() {
  local event="$1" repo="$2" pr="$3"
  printf '%s' "$event" | jq -r --arg repo "$repo" --arg pr "$pr" '
    if .kind == "ci.failed" then
      "check: \(.name) (\(.conclusion))", "head: \(.head // "?")", "url: \(.url)"
    elif .kind == "comment.new" then
      "by: @\(.author)\(if .who == "human" then "" else " (\(.who))" end) · \(.label)",
      (if (.file // null) != null then "file: \(.file)" else empty end),
      (if (.line // "") != "" then "says: \(.line)\(if .lineCut == true then "…" else "" end)" else empty end),
      (if (.reviewId // null) != null then "read: gh api --method GET repos/\($repo)/pulls/\($pr)/reviews/\(.reviewId) --jq .body" else empty end),
      "url: \(.url)"
    elif .kind == "review.approved" then
      "by: @\(.author)\(if .who == "human" then "" else " (\(.who))" end)",
      "ci: \({ passed: "passed", failed: "failed", unfinished: "in progress", none: "no checks" }[.ci // "none"])",
      "url: \(.url)"
    else empty end'
}

# .what = the next command for one event
# .why  = a woken clone acts at once when the alert hands it the command
# .note = an approval's next move turns on its ci: green → release, red → read
#         the errors, unfinished or absent → watch it land
as_watch_event_next() {
  local event="$1" repo="$2" pr="$3" kind ci
  kind="$(printf '%s' "$event" | jq -r '.kind')"
  ci="$(printf '%s' "$event" | jq -r '.ci // "none"')"
  [[ "$kind" == "ci.failed" ]] && { echo "rhx show.gh.test.errors"; return 0; }
  [[ "$kind" == "comment.new" ]] && { echo "rhx git.pull.comment get --which $pr --in $repo"; return 0; }
  [[ "$kind" == "review.approved" && "$ci" == "passed" ]] && { echo "rhx git.release --mode apply"; return 0; }
  [[ "$kind" == "review.approved" && "$ci" == "failed" ]] && { echo "rhx show.gh.test.errors"; return 0; }
  [[ "$kind" == "review.approved" ]] && { echo "rhx git.release --watch"; return 0; }
  echo ""
}

# .what = the section label of one event kind, for a mixed alert
# .why  = a mixed alert names each event's kind atop its own section
as_watch_event_label() {
  local kind="$1"
  [[ "$kind" == "ci.failed" ]] && { echo "ci failed"; return 0; }
  [[ "$kind" == "comment.new" ]] && { echo "new comment"; return 0; }
  [[ "$kind" == "review.approved" ]] && { echo "approved"; return 0; }
  echo "$kind"
}

# .what = print a list of lines as tree branches under one prefix
# .why  = the last branch takes `└─`, the rest `├─`, whatever the count
# usage: print_watch_branches <prefix> <line...>
print_watch_branches() {
  local prefix="$1"
  shift
  local i=0 line
  for line in "$@"; do
    i=$((i + 1))
    [[ $i -lt $# ]] && echo "${prefix}├─ $line"
    [[ $i -eq $# ]] && echo "${prefix}└─ $line"
  done
  return 0
}

# .what = the most failed checks one alert lists by name; the rest read as a count
WATCH_ALERT_CHECKS_SHOWN_MAX="${GIT_PULL_WATCH_ALERT_CHECKS_SHOWN_MAX:-5}"

# .what = the one head every ci failure of a burst shares, else empty
# .why  = a burst on one push names its head once, not once per check
as_watch_ci_head_shared() {
  local events="$1"
  printf '%s' "$events" | jq -r '
    if (all(.[]; .kind == "ci.failed")) and ([.[].head // "?"] | unique | length) == 1
    then (.[0].head // "?") else empty end'
}

# .what = the text of one event alert (no closure)
# .why  = all of one tick's events on one pr ride one alert (A9)
# .note = one event → its leaves sit flat under the pr; several events of one
#         kind → one section per event, headed by its first leaf, then one
#         `next:`; several kinds → one labeled section per event, each with its own `next:`
as_watch_events_text() {
  local repo="$1" pr="$2" events="$3" kinds_count count
  count="$(printf '%s' "$events" | jq 'length')"
  kinds_count="$(printf '%s' "$events" | jq '[.[].kind] | unique | length')"
  print_watch_alert_header "$(as_watch_alert_vibe "$events")" "$(as_watch_alert_phrase "$pr" "$events")"

  # one event: flat leaves, one next line
  if [[ "$count" == "1" ]]; then
    local lines=() event leaf
    event="$(printf '%s' "$events" | jq -c '.[0]')"
    lines+=("pr: $repo#$pr")
    while IFS= read -r leaf; do
      lines+=("$leaf")
    done < <(as_watch_event_leaves "$event" "$repo" "$pr")
    lines+=("next: $(as_watch_event_next "$event" "$repo" "$pr")")
    print_watch_branches "   " "${lines[@]}"
    return 0
  fi

  # several events of one kind: a section per event, so each field sits under its own event
  # .note = a ci burst names its shared head once and shows the first few checks; the
  #         rest are one command away, so twelve red jobs stay one screen
  if [[ "$kinds_count" == "1" ]]; then
    echo "   ├─ pr: $repo#$pr"
    local event last="" leaves=() leaf head_shared="" shown=0 cap=0
    head_shared="$(as_watch_ci_head_shared "$events")"
    [[ -n "$head_shared" ]] && echo "   ├─ head: $head_shared"
    [[ -n "$head_shared" ]] && cap="$WATCH_ALERT_CHECKS_SHOWN_MAX"
    while IFS= read -r event; do
      last="$event"
      shown=$((shown + 1))
      [[ $cap -gt 0 && $shown -gt $cap ]] && continue
      leaves=()
      while IFS= read -r leaf; do
        [[ -n "$head_shared" && "$leaf" == "head: "* ]] && continue
        leaves+=("$leaf")
      done < <(as_watch_event_leaves "$event" "$repo" "$pr")
      echo "   ├─ ${leaves[0]}"
      print_watch_branches "   │  " "${leaves[@]:1}"
    done < <(printf '%s' "$events" | jq -c '.[]')
    [[ $cap -gt 0 && $count -gt $cap ]] && echo "   ├─ + $((count - cap)) more: rhx show.gh.test.errors"
    echo "   └─ next: $(as_watch_event_next "$last" "$repo" "$pr")"
    return 0
  fi

  # several kinds: one section per event
  echo "   ├─ pr: $repo#$pr"
  local i=0 event kind leaves=() leaf branch prefix
  while IFS= read -r event; do
    i=$((i + 1))
    kind="$(printf '%s' "$event" | jq -r '.kind')"
    branch="├─"
    prefix="   │  "
    if [[ $i -eq $count ]]; then
      branch="└─"
      prefix="      "
    fi
    echo "   $branch $(as_watch_event_label "$kind")"
    leaves=()
    while IFS= read -r leaf; do
      leaves+=("$leaf")
    done < <(as_watch_event_leaves "$event" "$repo" "$pr")
    leaves+=("next: $(as_watch_event_next "$event" "$repo" "$pr")")
    print_watch_branches "$prefix" "${leaves[@]}"
  done < <(printf '%s' "$events" | jq -c '.[]')
  return 0
}

# .what = an idle span in the largest whole unit that fits: days, else minutes
as_watch_idle_label() {
  local seconds="$1"
  [[ $seconds -ge 86400 ]] && { echo "$((seconds / 86400)) days"; return 0; }
  echo "$(as_watch_minutes_ceil "$seconds") min"
}

# .what = the note of a watch whose pull answered 404: gone, or hidden from the token
# .why  = a 404 has two readings, and the fix differs by the token that got it: under
#         the grove token, the likely cause is that token's reach, so the note puts
#         the seaturtle unlock before the rewatch; a bare rewatch would only 404 again
# usage: as_watch_gone_text <pr> <seaturtle|ambient>
as_watch_gone_text() {
  local pr="$1" source="$2"
  if [[ "$source" == "ambient" ]]; then
    print_watch_alert_header "bummer dude..." "#$pr answers 404 to the grove token (${WATCH_TOKEN_SLUG_AMBIENT:-@all.prep.GITHUB_TOKEN}); watch ended"
    echo "   ├─ the pr may be gone, or out of the grove token's reach; the seaturtle token was not granted"
    echo "   ├─ 1. unlock: rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN"
    echo "   └─ 2. rewatch: rhx git.pull.watch set --which $pr --mode apply"
    return 0
  fi
  print_watch_alert_header "bummer dude..." "#$pr answers 404 to the seaturtle token (gone, or out of its reach); watch ended"
  echo "   └─ rewatch: rhx git.pull.watch set --which $pr --mode apply"
}

# .what = the closure note of a watch that ended: the one switch over every end reason
# .why  = a close without merge must never read as a ship, so it says so and by whom;
#         a watch whose reads faulted to the idle ttl was unread, not quiet, so it names
#         the fault; a reason this switch does not know fails loud, never reads as a close
# usage: as_watch_closure_text <pr> <end> <detail>
#   end    = merged · closed · idle · dark · gone
#   detail = closed: who closed it · dark: the last fault · gone: the token source · else empty
as_watch_closure_text() {
  local pr="$1" end="$2" detail="$3"
  case "$end" in
    merged)
      print_watch_alert_header "cowabunga!" "#$pr merged; watch ended"
      ;;
    closed)
      print_watch_alert_header "bummer dude..." "#$pr closed without merge; watch ended"
      [[ -n "$detail" ]] && echo "   └─ by: @$detail"
      ;;
    idle)
      print_watch_alert_header "heads up dude..." "#$pr quiet for $(as_watch_idle_label "$WATCH_IDLE_TTL_SECONDS"); watch ended"
      echo "   └─ rewatch: rhx git.pull.watch set --which $pr --mode apply"
      ;;
    dark)
      print_watch_alert_header "heads up dude..." "#$pr unreadable for $(as_watch_idle_label "$WATCH_IDLE_TTL_SECONDS"); watch ended"
      echo "   ├─ last fault: $detail"
      echo "   └─ rewatch: rhx git.pull.watch set --which $pr --mode apply"
      ;;
    gone)
      as_watch_gone_text "$pr" "$detail"
      ;;
    *)
      echo "💥 MalfunctionError: as_watch_closure_text got an unknown end reason '$end' for #$pr" >&2
      return 1
      ;;
  esac
  return 0
}

# .what = the whole alert of one watch for one tick: events, then any closure
# .why  = events that landed before the merge still reach the clone, ahead of the end
as_watch_alert_text() {
  local repo="$1" pr="$2" events="$3" end="$4" closed_by="$5" count
  count="$(printf '%s' "$events" | jq 'length')"
  [[ "$count" != "0" ]] && as_watch_events_text "$repo" "$pr" "$events"
  [[ "$count" != "0" && -n "$end" ]] && echo ""
  [[ -n "$end" ]] && as_watch_closure_text "$pr" "$end" "$closed_by"
  return 0
}

# .what = the last line of every paused alert: when the watches resume, and how to resume them now
# .why  = a paused daemon re-reads keyrack on each pr's poll gap, which doubles up to its cap;
#         a human who fixed the token would otherwise wait out that gap with no word of it.
#         one good read lifts the pause and makes every watched pr due, so a set on the
#         first paused pr resumes them all at the next tick
# usage: as_watch_paused_resume_line <prs, as "#1220, #1221">
as_watch_paused_resume_line() {
  local prs="$1" first label="to resume now"
  first="${prs%%,*}"
  first="${first#\#}"
  [[ "$prs" == *,* ]] && label="to resume every paused watch now, one set"
  echo "   ├─ after the fix: alerts resume within $(as_watch_minutes_ceil "${WATCH_POLL_MAX_SECONDS:-1800}") min"
  echo "   └─ $label: rhx git.pull.watch set --which $first --mode apply"
}

# .what = the paused alert: the token is out, so the watches wait
# .why  = locked needs an unlock; absent needs a human fill first — each names its fix
as_watch_paused_text() {
  local status="$1" prs="$2"
  print_watch_alert_header "bummer dude..." "paused"
  if [[ "$status" == "absent" ]]; then
    echo "   ├─ ✋ ConstraintError: github token not filled"
    echo "   ├─ watches paused: $prs"
    echo "   ├─ fix: a human runs \`rhx keyrack fill --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN\`, then"
    echo "   │  ├─ rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN"
    echo "   │  └─ or, for the whole grove: \`rhx keyrack set --owner ehmpath --org @all --env prep --key GITHUB_TOKEN\`"
    as_watch_paused_resume_line "$prs"
    return 0
  fi
  # github refused the token: an unlock cannot clear it; a human sets one github accepts
  if [[ "$status" == "expired" ]]; then
    echo "   ├─ ✋ ConstraintError: github token expired"
    echo "   ├─ watches paused: $prs"
    echo "   ├─ fix: a human runs \`rhx keyrack fill --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN --refresh\`"
    echo "   │  └─ or, where the grove token served: \`rhx keyrack set --owner ehmpath --org @all --env prep --key GITHUB_TOKEN\`"
    as_watch_paused_resume_line "$prs"
    return 0
  fi
  local cause="github token locked"
  [[ "$status" == "blocked" ]] && cause="github token blocked by keyrack"
  echo "   ├─ ✋ ConstraintError: $cause"
  echo "   ├─ watches paused: $prs"
  echo "   ├─ fix: rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN"
  echo "   │  └─ or, for the whole grove: \`rhx keyrack set --owner ehmpath --org @all --env prep --key GITHUB_TOKEN\`"
  as_watch_paused_resume_line "$prs"
}

# .what = the outage note: github has not answered for a while; cursors hold
# .why  = the clone learns its quiet pr may not be quiet, and that it owes no act
as_watch_unreachable_text() {
  local minutes="$1" prs="$2"
  print_watch_alert_header "bummer dude..." "cannot reach github"
  echo "   ├─ 💥 MalfunctionError: github unreachable for $minutes min"
  echo "   ├─ watches held: $prs"
  echo "   └─ next: naught to do; no event is lost, and alerts resume within $(as_watch_minutes_ceil "${WATCH_POLL_MAX_SECONDS:-1800}") min of github's return"
}

# .what = the token-fault note: keyrack itself has not answered for a while
# .why  = a fault no human state explains (rhachet absent, a malformed reply) would
#         else blind the daemon in silence; the note names the cause and the check
as_watch_token_fault_text() {
  local minutes="$1" cause="$2" root="$3" prs="$4"
  print_watch_alert_header "bummer dude..." "cannot read its github token"
  echo "   ├─ 💥 MalfunctionError: keyrack token read faulted for $minutes min"
  echo "   ├─ cause: ${cause:-no reply}"
  echo "   ├─ watches held: $prs"
  echo "   └─ check: cd $root && rhx keyrack get --key ehmpathy.prep.EHMPATHY_SEATURTLE_GITHUB_TOKEN --owner ehmpath --env prep --json"
}

# .what = mark an alert as held, on its first 🐚 root line
# .why  = a clone told the alert waited reads it as late, not as new
as_watch_alert_text_held() {
  local text="$1" tries="$2"
  printf '%s\n' "$text" | awk -v mark=" (held $tries ticks; you were busy)" \
    '!done && /^🐚 / { print $0 mark; done = 1; next } { print }'
  return 0
}

# .what = the one-line cause of a `clone say` refusal: its json message, else its last line
# .why  = `get` and the prompt hook name why an alert waits, not just that it waits
as_watch_say_cause() {
  local said="$1" cause
  cause="$(printf '%s' "$said" | jq -r 'select(type == "object") | .message // empty' 2>/dev/null | head -n 1 || true)"
  [[ -n "$cause" ]] || cause="$(printf '%s\n' "$said" | grep -v '^[[:space:]]*$' | tail -n 1 || true)"
  printf '%s' "${cause:0:200}"
}

# .what = deliver one alert into a clone, by serial, from its repo root
# .why  = only `clone say` knows if a clone can take text now; its json verdict
#         decides done, hold, or drop (F16)
# returns: 0 = taken (released, enqueued, exited) · 1 = hold for a retry · 3 = clone dead
# sets: WATCH_SAY_CAUSE, the refusal's one-line cause, on a hold
# .note = a failure record carries reachState; only DEAD drops the watch.
#         withheld, buffered, absent, unreadable, DEAF, a wedged socket, no
#         answer within the bound: all hold
WATCH_SAY_CAUSE=""
send_watch_alert() {
  local repo_root="$1" serial="$2" text="$3" out_file err_file rc=0 said
  WATCH_SAY_CAUSE=""
  out_file="$(mktemp)"
  err_file="$(mktemp)"
  printf '%s' "$text" | run_watch_rhachet "$repo_root" "$WATCH_SAY_MAX_SECONDS" \
    clone say "@:$serial" --what @stdin --output json >"$out_file" 2>"$err_file" || rc=$?
  [[ $rc -eq 124 ]] && echo "clone say gave no answer in ${WATCH_SAY_MAX_SECONDS}s" >>"$err_file"
  said="$(cat "$out_file" "$err_file")"
  rm -f "$out_file" "$err_file"
  WATCH_SAY_CAUSE="$(as_watch_say_cause "$said")"

  # taken
  [[ $rc -eq 0 ]] && return 0

  # the clone is gone: its watch ends
  if printf '%s' "$said" | grep -qE '"reachState": *"DEAD"'; then
    return 3
  fi

  # any other refusal: hold, and say why in the log
  echo "$(get_watch_iso_now) hold @:$serial (exit $rc): $(printf '%s' "$said" | tr '\n' ' ' | cut -c1-300)" >&2
  return 1
}
