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
# .note = the reply layout hands it to `jq --argjson`, where a value that is no whole
#         number faults the render and holds every alert; such a value falls back to 5
WATCH_ALERT_CHECKS_SHOWN_MAX="${GIT_PULL_WATCH_ALERT_CHECKS_SHOWN_MAX:-5}"
[[ "$WATCH_ALERT_CHECKS_SHOWN_MAX" =~ ^[1-9][0-9]*$ ]] || WATCH_ALERT_CHECKS_SHOWN_MAX=5

# .what = the one head every ci failure of a burst shares, else empty
# .why  = a burst on one push names its head once, not once per check
as_watch_ci_head_shared() {
  local events="$1"
  printf '%s' "$events" | jq -r '
    if (all(.[]; .kind == "ci.failed")) and ([.[].head // "?"] | unique | length) == 1
    then (.[0].head // "?") else empty end'
}

# .what = jq defs that render a reply task as tree nodes, and nodes as tree lines
# .why  = a reply task nests a thread, its text, and its command; one renderer draws
#         `├─` / `└─` and the `│` spacers at every depth, so no layout hand-counts them
# .note = a node is { text, kids }; render prints the nodes under one prefix
WATCH_REPLY_JQ_DEFS='
  def render($p): . as $nodes | [range(0; $nodes | length) as $i | $nodes[$i] as $n
    | ($i == (($nodes | length) - 1)) as $last
    | ($p + (if $last then "└─ " else "├─ " end) + $n.text),
      ((($n.kids // []) | render($p + (if $last then "   " else "│  " end)))[])];
  def reply_cmd($repo; $pr): "rhx git.pull.comment set --which \($pr) --in \($repo) --reply-to \(.root) --key \(.key) --from <file|@stdin> --mode apply";
  def read_cmd($repo; $pr): "rhx git.pull.comment get --which \($pr) --in \($repo) --id \(.id) --kind review";
  def says_node($repo; $pr; $multi): {
    text: (if $multi then "says · @\(.author)" else "says" end),
    kids: ([.lines[] | { text: . }]
      + (if (.more // 0) > 0 then [{ text: "… \(.more) more chars: \(read_cmd($repo; $pr))" }] else [] end)) };
  # a says line names its author only when the thread holds more than one, since the
  # thread line already names the first
  def thread_node($repo; $pr; $withReply): . as $e | (([$e.comments[].author] | unique | length) > 1) as $multi | {
    text: "thread \($e.root) · \($e.label) · by @\($e.comments[0].author)",
    kids: ((if $e.file != null then [{ text: "file: \($e.file)" }] else [] end)
      + (if $e.re != null then [{ text: "re: \($e.re)" }] else [] end)
      + [{ text: "url: \($e.url)" }]
      + [$e.comments[] | says_node($repo; $pr; $multi)]
      + (if $e.label == "edited" then [{ text: "note: an edit sends no notice, so this answer posts as a new reply, under its own key" }] else [] end)
      + (if $withReply then [{ text: "reply: \($e | reply_cmd($repo; $pr))" }] else [] end)) };
  # every ci failure of one read as one section: its head once, the first $max checks,
  # then a count of the rest — the same shape the extant ci burst prints
  # .note = one read stamps one head on each of its ci failures, so the head names once
  def ci_node($max): . as $c | {
    text: "ci failed",
    kids: ([{ text: "head: \($c[0].head // "?")" }]
      + [$c[0:$max][] | { text: "check: \(.name) (\(.conclusion))", kids: [{ text: "url: \(.url)" }] }]
      + (if ($c | length) > $max then [{ text: "+ \(($c | length) - $max) more: rhx show.gh.test.errors" }] else [] end)
      + [{ text: "next: rhx show.gh.test.errors" }]) };
'

# .what = the header phrase of the reply tasks in one alert
# .why  = the first line is what a busy clone scans; it names the reply owed first
# usage: as_watch_reply_phrase pr=<n> count=<n>
as_watch_reply_phrase() {
  local pr="" count="" arg
  for arg in "$@"; do
    case "$arg" in
      pr=*) pr="${arg#*=}" ;;
      count=*) count="${arg#*=}" ;;
    esac
  done
  [[ "$count" == "1" ]] && { echo "reply task on #$pr"; return 0; }
  echo "$count reply tasks on #$pr"
}

# .what = the text of an alert that holds reply tasks, with any other events after them
# .why  = a human awaits the crew, so the reply leads (F2): the header names it first,
#         its section sits on top, and the last `next` puts it before code work. all of
#         one read still rides one alert (A9)
# .note = reply tasks alone: one → its thread flat under the pr, then `next` with its
#         command; several → a thread per reply task, each with its command. with other
#         events: a `reply task` section, then one `ci failed` section for every red
#         check (head once, capped), then one labeled section per other event
# usage: as_watch_reply_alert_text repo=<owner/name> pr=<n> replies=<json> rest=<json>
as_watch_reply_alert_text() {
  local repo="" pr="" replies="" rest="" arg count rest_count phrase vibe nodes rest_nodes event leaves label next
  for arg in "$@"; do
    case "$arg" in
      repo=*) repo="${arg#*=}" ;;
      pr=*) pr="${arg#*=}" ;;
      replies=*) replies="${arg#*=}" ;;
      rest=*) rest="${arg#*=}" ;;
    esac
  done
  count="$(printf '%s' "$replies" | jq 'length')" || return 1
  rest_count="$(printf '%s' "$rest" | jq 'length')" || return 1
  phrase="$(as_watch_reply_phrase pr="$pr" count="$count")"
  vibe="heads up dude..."
  if [[ "$rest_count" != "0" ]]; then
    local rest_phrase
    # the rest's own phrase names the pr too (`ci failed on #N`, `approved #N`); cut it
    rest_phrase="$(as_watch_alert_phrase "$pr" "$rest")"
    rest_phrase="${rest_phrase% on #"$pr"}"
    rest_phrase="${rest_phrase% #"$pr"}"
    phrase="$phrase, and $rest_phrase"
    vibe="$(as_watch_alert_vibe "$rest")"
    [[ "$vibe" == "shell yeah!" ]] && vibe="heads up dude..."
  fi
  print_watch_alert_header "$vibe" "$phrase"

  # every red check rides one section; each other event its own, with its own `next`
  rest_nodes="$(printf '%s' "$rest" | jq -c --argjson max "$WATCH_ALERT_CHECKS_SHOWN_MAX" "$WATCH_REPLY_JQ_DEFS"'
    [.[] | select(.kind == "ci.failed")] | if length > 0 then [ci_node($max)] else [] end')" || return 1
  while IFS= read -r event; do
    [[ -n "$event" ]] || continue
    leaves="$(as_watch_event_leaves "$event" "$repo" "$pr" | jq -R -s 'split("\n") | map(select(length > 0))')" || return 1
    label="$(as_watch_event_label "$(printf '%s' "$event" | jq -r '.kind')")" || return 1
    next="$(as_watch_event_next "$event" "$repo" "$pr")" || return 1
    rest_nodes="$(printf '{"nodes":%s,"leaves":%s}' "$rest_nodes" "$leaves" | jq --arg label "$label" --arg next "$next" \
      '.nodes + [{ text: $label, kids: ([.leaves[] | { text: . }] + [{ text: "next: \($next)" }]) }]')" || return 1
  done < <(printf '%s' "$rest" | jq -c '.[] | select(.kind != "ci.failed")')

  # a render that faults returns nonzero, so the caller holds the cursors (no lost task)
  # .note = the tasks ride stdin, not argv: one argv slot caps at 128 KiB, and a read
  #         of many whole comments passes that, which would hold every alert on the pr
  nodes="$(printf '{"replies":%s,"rest":%s}' "$replies" "$rest_nodes" \
    | jq --arg repo "$repo" --arg pr "$pr" "$WATCH_REPLY_JQ_DEFS"'
    .replies as $replies | .rest as $rest
    | [{ text: "pr: \($repo)#\($pr)" }]
    + (if ($rest | length) > 0 then
        [{ text: (if ($replies | length) > 1 then "reply tasks" else "reply task" end), kids: [$replies[] | thread_node($repo; $pr; true)] }] + $rest
        + [{ text: (if ($replies | length) > 1 then "next: reply to each thread first, then the rest" else "next: reply first, then the rest" end) }]
      elif ($replies | length) == 1 then
        [$replies[0] | thread_node($repo; $pr; false)]
        + [{ text: "next: reply first, then resume: \($replies[0] | reply_cmd($repo; $pr))" }]
      else
        [$replies[] | thread_node($repo; $pr; true)]
        + [{ text: "next: reply to each thread first, then resume" }]
      end)')" || return 1
  printf '%s' "$nodes" | jq -r "$WATCH_REPLY_JQ_DEFS"'render("   ")[]' || return 1
}

# .what = the text of one event alert (no closure)
# .why  = all of one tick's events on one pr ride one alert (A9)
# .note = one event → its leaves sit flat under the pr; several events of one
#         kind → one section per event, headed by its first leaf, then one
#         `next:`; several kinds → one labeled section per event, each with its own `next:`
# .note = an alert that holds a reply task takes the reply layout (F2)
as_watch_events_text() {
  local repo="$1" pr="$2" events="$3" kinds_count count replies
  replies="$(printf '%s' "$events" | jq -c '[.[] | select(.kind == "reply.task")]')"
  if [[ "$replies" != "[]" ]]; then
    as_watch_reply_alert_text repo="$repo" pr="$pr" replies="$replies" \
      rest="$(printf '%s' "$events" | jq -c '[.[] | select(.kind != "reply.task")]')" || return 1
    return 0
  fi
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

# .what = the closure note of a watch that ended
# .why  = a close without merge must never read as a ship, so it says so and by whom
as_watch_closure_text() {
  local pr="$1" end="$2" closed_by="$3"
  if [[ "$end" == "idle" ]]; then
    print_watch_alert_header "heads up dude..." "#$pr quiet for $(as_watch_idle_label "$WATCH_IDLE_TTL_SECONDS"); watch ended"
    echo "   └─ rewatch: rhx git.pull.watch set --which $pr --mode apply"
    return 0
  fi
  if [[ "$end" == "merged" ]]; then
    print_watch_alert_header "cowabunga!" "#$pr merged; watch ended"
    return 0
  fi
  print_watch_alert_header "bummer dude..." "#$pr closed without merge; watch ended"
  [[ -n "$closed_by" ]] && echo "   └─ by: @$closed_by"
  return 0
}

# .what = the whole alert of one watch for one tick: events, then any closure
# .why  = events that landed before the merge still reach the clone, ahead of the end
# .note = returns nonzero where the events fail to render, so the caller holds its cursors
as_watch_alert_text() {
  local repo="$1" pr="$2" events="$3" end="$4" closed_by="$5" count
  count="$(printf '%s' "$events" | jq 'length')"
  if [[ "$count" != "0" ]]; then
    as_watch_events_text "$repo" "$pr" "$events" || return 1
  fi
  [[ "$count" != "0" && -n "$end" ]] && echo ""
  [[ -n "$end" ]] && as_watch_closure_text "$pr" "$end" "$closed_by"
  return 0
}

# .what = the paused alert: the token is out, so the watches wait
# .why  = locked needs an unlock; absent needs a human fill first — each names its fix
as_watch_paused_text() {
  local status="$1" prs="$2"
  print_watch_alert_header "bummer dude..." "paused"
  if [[ "$status" == "absent" ]]; then
    echo "   ├─ ✋ ConstraintError: github token not filled"
    echo "   ├─ watches paused: $prs"
    echo "   └─ fix: a human runs \`rhx keyrack fill --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN\`, then"
    echo "      ├─ rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN"
    echo "      └─ or, for the whole grove: \`rhx keyrack set --owner ehmpath --org @all --env prep --key GITHUB_TOKEN\`"
    return 0
  fi
  # github refused the token: an unlock cannot clear it; a human sets one github accepts
  if [[ "$status" == "expired" ]]; then
    echo "   ├─ ✋ ConstraintError: github token expired"
    echo "   ├─ watches paused: $prs"
    echo "   └─ fix: a human runs \`rhx keyrack fill --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN --refresh\`"
    echo "      └─ or, where the grove token served: \`rhx keyrack set --owner ehmpath --org @all --env prep --key GITHUB_TOKEN\`"
    return 0
  fi
  local cause="github token locked"
  [[ "$status" == "blocked" ]] && cause="github token blocked by keyrack"
  echo "   ├─ ✋ ConstraintError: $cause"
  echo "   ├─ watches paused: $prs"
  echo "   └─ fix: rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN"
  echo "      └─ or, for the whole grove: \`rhx keyrack set --owner ehmpath --org @all --env prep --key GITHUB_TOKEN\`"
}

# .what = the outage note: github has not answered for a while; cursors hold
# .why  = the clone learns its quiet pr may not be quiet, and that it owes no act
as_watch_unreachable_text() {
  local minutes="$1" prs="$2"
  print_watch_alert_header "bummer dude..." "cannot reach github"
  echo "   ├─ 💥 MalfunctionError: github unreachable for $minutes min"
  echo "   ├─ watches held: $prs"
  echo "   └─ next: naught to do; cursors hold, and alerts resume once github answers"
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
# .note = a held reply task may already be answered by another route (a relay, the
#         web); its mark asks the crew to check the thread before it posts a twin
as_watch_alert_text_held() {
  local text="$1" tries="$2"
  printf '%s\n' "$text" | awk -v mark=" (held $tries ticks; you were busy)" \
    -v reply=" (held $tries ticks; you were busy; check each thread first, you may have answered it)" \
    '!done && /^🐚 / && /reply task/ { print $0 reply; done = 1; next }
     !done && /^🐚 / { print $0 mark; done = 1; next } { print }'
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
