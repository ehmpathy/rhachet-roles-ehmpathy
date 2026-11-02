#!/usr/bin/env bash
######################################################################
# .what = the pr-watch daemon: one per machine per key; ticks each 60s,
#         reads github per watched pr, alerts each watcher of ci failures,
#         new comments, approval, and the pr's end
#
# .why  = the mechanic that idles after a push is woken by github's own
#         signals, with no director relay
#
# usage:
#   spawned by gen_watch_daemon, detached, from v=$key/bin/; never by hand
#   bash v=$key/bin/git.pull.watch.daemon.sh <key>
#
# guarantee:
#   - at boot, exits if another live daemon of its key holds the pid record (F1)
#   - runs from its own copy, cwd in the state dir; reads no spawner file (F10)
#   - exits once it holds zero watches, under the lock (F3)
#   - reads github with the ehmpath keyrack token only; the human login never (F11)
#   - an alert sits in the outbox before its cursors advance, so a crash re-sends
#     at most once and never drops one (F6, F7)
#   - a rate limit holds every read until it lifts; an outage holds the cursors,
#     and one past 30 min earns one note per clone (A29, A30)
#   - a keyrack fault holds the tick and logs its cause; one past 30 min earns
#     one note per clone, with the cause and the check
#   - a record is written back only under the key lock and only if it still
#     stands, so a `del` or a `set` move is never undone by a tick in flight
######################################################################
set -uo pipefail

# .note = a daemon spawned from a session whose PATH lacks gh or jq would read naught
#         and blame github thirty minutes later; it exits at boot instead, before its
#         sources or its pid claim, so the findsert names the absent tool
for tool in gh jq; do
  command -v "$tool" >/dev/null 2>&1 || { echo "boot defect: $tool is not on PATH ($PATH)"; exit 1; }
done

DAEMON_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# .note = a source that fails is a boot defect: exit before the pid record is
#         claimed, so the findsert reports it rather than a daemon that half runs
# shellcheck source=git.pull.watch.operations.sh
source "$DAEMON_DIR/git.pull.watch.operations.sh" || { echo "boot defect: could not source git.pull.watch.operations.sh"; exit 1; }
# shellcheck source=git.pull.watch.github.sh
source "$DAEMON_DIR/git.pull.watch.github.sh" || { echo "boot defect: could not source git.pull.watch.github.sh"; exit 1; }
# shellcheck source=git.pull.watch.alert.sh
source "$DAEMON_DIR/git.pull.watch.alert.sh" || { echo "boot defect: could not source git.pull.watch.alert.sh"; exit 1; }
# shellcheck source=git.pull.watch.token.sh
source "$DAEMON_DIR/git.pull.watch.token.sh" || { echo "boot defect: could not source git.pull.watch.token.sh"; exit 1; }

KEY="${1:-}"
[[ -n "$KEY" ]] || { echo "git.pull.watch.daemon: a key is required" >&2; exit 2; }
KEY_DIR="$(get_watch_key_dir "$KEY")"

# .note = the daemon writes cursors, alerts, and cached github bodies; only its owner
#         may read them. set here, not in the sourced files, so no verb inherits it
umask 077

# .what = a log line with a timestamp
# .why  = stdout goes to daemon.log; a timestamp lets a reader line it up with a tick
log_watch() {
  echo "$(get_watch_iso_now) $*"
}

######################################################################
# boot: claim the pid record, or leave (F1)
######################################################################

take_watch_lock "$KEY_DIR" || { log_watch "boot: lock timed out; exit"; exit 1; }
PID_PRIOR="$(get_watch_daemon_pid "$KEY_DIR")"
PROBE_RC=1
[[ -n "$PID_PRIOR" && "$PID_PRIOR" != "$$" ]] && { is_watch_daemon_pid "$PID_PRIOR" "$KEY"; PROBE_RC=$?; }
# a live holder, or one `ps` cannot name, keeps the key: never a twin (F1)
if [[ $PROBE_RC -eq 0 || $PROBE_RC -eq 2 ]]; then
  drop_watch_lock "$KEY_DIR"
  log_watch "boot: daemon pid $PID_PRIOR already holds key $KEY; exit"
  exit 0
fi
jq -n --argjson pid "$$" --arg key "$KEY" --arg at "$(get_watch_iso_now)" \
  '{ pid: $pid, key: $key, bootedAt: $at }' | set_watch_file_atomic "$KEY_DIR/daemon.pid"
get_watch_epoch_now | set_watch_file_atomic "$KEY_DIR/daemon.heartbeat"
drop_watch_lock "$KEY_DIR"
log_watch "boot: daemon pid $$ key $KEY tick ${WATCH_TICK_SECONDS}s"

# .what = on exit, clear the pid record if it still names this process
# .why  = a record left behind reads as stale and costs the next findsert a
#         probe; a record that names a successor is never touched
on_watch_daemon_exit() {
  if [[ "$(get_watch_daemon_pid "$KEY_DIR")" == "$$" ]]; then
    rm -f "$KEY_DIR/daemon.pid"
  fi
  # the awaited sleep would outlive the daemon by up to one tick
  local job
  for job in $(jobs -p); do
    kill "$job" 2>/dev/null || true
  done
}
trap on_watch_daemon_exit EXIT
trap 'exit 0' TERM INT

######################################################################
# the diff: github state × watch cursors → events, cursors, end
######################################################################

# .what = one watch's events since its cursors, as json
# .why  = one pure jq transform, so the tick reads as narrative
# input: { watch, pull, checks, issueComments, reviewComments, reviews, ledger, peers }
# output: { events: [...], cursors: {...}, prEnd: null|"merged"|"closed" }
WATCH_DIFF_JQ='
  def is_failed: (.status == "completed") and ([.conclusion] | inside(["failure","cancelled","timed_out","action_required"]));
  def is_bot: ((.user.type // "") == "Bot") or ((.user.login // "") | endswith("[bot]"));
  # a peer clone is labeled on proof, never on text alone (A20): its comment id
  # sits in some clone ledger on this box, or it opens with the 🐢 mark that
  # git.pull.comment.set writes AND its author is a bot or a login that wrote a
  # ledgered comment. a stranger who types 🐢 reads as human
  def is_peer($peers; $peerLogins): (.id as $id | $peers | any(. == $id))
    or (((.body // "") | startswith("🐢")) and (is_bot or ((.user.login // "") as $l | $peerLogins | any(. == $l))));
  def who($peers; $peerLogins): if is_peer($peers; $peerLogins) then "clone" elif is_bot then "bot" else "human" end;
  # a control byte (an escape, a tab, a bell) in text from github would make the
  # whole alert undeliverable at `clone say`, so every github string is cleaned
  def clean: "\(. // "")" | gsub("\\p{Cc}"; "");
  # an inline review comment names its file and line, so the clone opens the spot at once
  def file_line: if (.path // "") == "" then null else "\(.path | clean):\(.line // .original_line // "?")" end;
  def first_line_whole: ((.body // "") | split("\n") | map(select(test("\\S"))) | (.[0] // "") | clean);
  def first_line: (first_line_whole | .[0:120]);
  # the alert marks a cut excerpt with an ellipsis, so the clone knows to read the
  # rest: a first line past 120 chars, or a body with more lines than the first
  def line_cut: ((first_line_whole | length) > 120)
    or (((.body // "") | split("\n") | map(select(test("\\S"))) | length) > 1);
  def is_own($ledger): . as $id | $ledger | any(. == $id);
  def max_id($rows; $prior): ([$prior] + [$rows[]?.id]) | max;
  . as $in
  | $in.watch.cursors as $c
  | ($in.pull.head.sha // null) as $head
  | ($in.ledger // []) as $ledger
  | ($in.peers // []) as $peers
  | ([($in.issueComments // [])[], ($in.reviewComments // [])[], ($in.reviews // [])[]]
     | map(select(.id as $id | $peers | any(. == $id)) | .user.login // empty) | unique) as $peerLogins
  | (if $c.headSha == $head then ($c.checkRunIdsSeen // []) else [] end) as $seen
  | [($in.checks.check_runs // [])[]] as $runs
  | (if ($runs | length) == 0 then "none" elif ($runs | any(is_failed)) then "failed"
     elif ($runs | all(.status == "completed")) then "passed" else "unfinished" end) as $ci
  | [$runs[] | select(is_failed)] as $failed
  | [$failed[] | select(.id as $id | $seen | any(. == $id) | not)] as $failedNew
  | [($in.issueComments // [])[] | select(.id > $c.issueCommentIdMax) | select(.id | is_own($ledger) | not)] as $issueNew
  | [($in.reviewComments // [])[] | select(.id > $c.reviewCommentIdMax) | select(.id | is_own($ledger) | not)] as $reviewCommentNew
  | [($in.reviews // [])[] | select(.id > $c.reviewIdMax)] as $reviewNew
  | (if $in.pull.merged == true then "merged" elif $in.pull.state == "closed" then "closed" else null end) as $prEnd
  | ($in.watch.primed == true) as $primed
  | ($in.watch.setAt // "9999") as $setAt
  # the prime tick alerts only what happened after the watch was set, so a check
  # that fails between `set` and the first tick still alerts (A3 holds: older stays quiet)
  | def fresh($t): $primed or ("\($t // "")" >= $setAt);
    {
      events: (
        [ $failedNew[] | select(fresh(.completed_at)) | { kind: "ci.failed", name: (.name | clean), conclusion: (.conclusion | clean), head: (($head | clean) | .[0:7]), url: (.html_url | clean) } ]
        + [ $issueNew[] | select(fresh(.created_at)) | { kind: "comment.new", label: "comment", author: ((.user.login // "?") | clean), who: who($peers; $peerLogins), line: first_line, lineCut: line_cut, url: (.html_url | clean) } ]
        + [ $reviewCommentNew[] | select(fresh(.created_at)) | { kind: "comment.new", label: "review comment", author: ((.user.login // "?") | clean), who: who($peers; $peerLogins), file: file_line, line: first_line, lineCut: line_cut, url: (.html_url | clean) } ]
        + [ $reviewNew[] | select(fresh(.submitted_at)) | select(.state == "APPROVED") | { kind: "review.approved", author: ((.user.login // "?") | clean), who: who($peers; $peerLogins), ci: $ci, url: (.html_url | clean) } ]
        + [ $reviewNew[] | select(fresh(.submitted_at)) | select(.state != "APPROVED" and ((.state == "CHANGES_REQUESTED") or ((.body // "") | test("\\S")))) | { kind: "comment.new", label: ("review: " + (.state | ascii_downcase | gsub("_"; " "))), author: ((.user.login // "?") | clean), who: who($peers; $peerLogins), line: first_line, lineCut: line_cut, reviewId: .id, url: (.html_url | clean) } ]
      ),
      cursors: {
        headSha: $head,
        checkRunIdsSeen: (($seen + [$failed[].id]) | unique),
        issueCommentIdMax: max_id($in.issueComments // []; $c.issueCommentIdMax),
        reviewCommentIdMax: max_id($in.reviewComments // []; $c.reviewCommentIdMax),
        reviewIdMax: max_id($in.reviews // []; $c.reviewIdMax)
      },
      prEnd: $prEnd
    }
'

######################################################################
# per-tick operations
######################################################################

# .what = touch the heartbeat
# .why  = a findsert reads its age to tell a live daemon from a wedged one
set_watch_heartbeat() {
  get_watch_epoch_now | set_watch_file_atomic "$KEY_DIR/daemon.heartbeat"
}

# .what = touch the heartbeat, only while the daemon itself lives
# .why  = a bound inside `$(…)` returns in a subshell; `$$` stays the daemon's pid
#         there, so an orphan subshell of a killed daemon never forges a fresh tick
set_watch_heartbeat_if_daemon_lives() {
  kill -0 "$$" 2>/dev/null || return 0
  set_watch_heartbeat
}

# every bound that returns touches the heartbeat, so no call site can forget it
WATCH_ON_BOUND_DONE=set_watch_heartbeat_if_daemon_lives

# .what = delete one watch life and its outbox, under the key lock
# .why  = a held alert for a gone watch has no clone to reach; it leaves too.
#         the lock and the life id keep a `set` that renewed the record since
#         this tick judged it: the new life stays
# .note = a lock that times out leaves the record; the next tick judges it again
# usage: del_watch_record <record> <watch_id>   # the life id read when the tick judged it
del_watch_record() {
  local record="$1" watch_id="$2"
  del_watch_record_locked "$record" "$watch_id" \
    || log_watch "lock timed out; $(basename "$record") stays until the next tick"
}

# .what = put one alert in the outbox of a watch
# .why  = every alert lands on disk before it is sent, so a refusal or a crash
#         holds it rather than drops it (F6); the name sorts oldest first
set_watch_outbox_entry() {
  local record="$1" text="$2" stem
  stem="$(basename "$record" .json)"
  jq -n --arg text "$text" --arg at "$(get_watch_iso_now)" '{ text: $text, tries: 0, heldAt: $at }' \
    | set_watch_file_atomic "$(gen_watch_outbox_entry_path "$KEY_DIR" "$stem")"
}

# .what = exit if the key holds zero watches; checked under the lock
# .why  = a `set` writes its record before it takes the lock, so a record
#         that lands as the daemon leaves is seen here, or spawns a fresh daemon
exit_watch_daemon_if_idle() {
  [[ -n "$(get_all_watch_records "$KEY_DIR")" ]] && return 0
  take_watch_lock "$KEY_DIR" || return 0
  if [[ -z "$(get_all_watch_records "$KEY_DIR")" ]]; then
    rm -f "$KEY_DIR/daemon.pid"
    # the pause and outage marks belong to this life; the next daemon judges afresh
    rm -f "$KEY_DIR"/daemon.paused* "$KEY_DIR"/daemon.unreachable* "$KEY_DIR"/daemon.tokenfault*
    drop_watch_lock "$KEY_DIR"
    log_watch "zero watches; exit"
    exit 0
  fi
  drop_watch_lock "$KEY_DIR"
}

# .what = drop each watch whose clone is dead or gone (A17)
# .why  = a dead clone on a quiet pr is found with no event; its watch must
#         end, or the daemon could never reach zero watches and exit (F3)
# .note = one clone list per repo root per tick; `unknown` holds the watch
# .note = a repo root that is no longer a dir (a removed worktree) is an answer,
#         not a fault: no clone can live there, so its watches drop
del_watch_records_of_dead_clones() {
  local root list
  while IFS= read -r root; do
    [[ -n "$root" ]] || continue
    if [[ ! -d "$root" ]]; then
      del_watch_records_at_root "$root" "repo root gone"
      continue
    fi
    list="$(get_watch_clone_list "$root")"
    del_watch_records_of_dead_clones_at_root "$root" "$list"
  done < <(get_all_watch_repo_roots)
}

# .what = drop every watch at one repo root
# usage: del_watch_records_at_root <root> <why>
del_watch_records_at_root() {
  local root="$1" why="$2" record row_root watch_id
  while IFS= read -r record; do
    [[ -n "$record" ]] || continue
    IFS=$'\t' read -r row_root watch_id < <(jq -r '[.repoRoot, (.watchId // "")] | @tsv' "$record")
    [[ "$row_root" == "$root" ]] || continue
    log_watch "$why ($root); drop $(basename "$record")"
    del_watch_record "$record" "$watch_id"
  done < <(get_all_watch_records "$KEY_DIR")
}

# .what = every repo root that holds a watch of this key, once each
get_all_watch_repo_roots() {
  local record
  while IFS= read -r record; do
    [[ -n "$record" ]] && jq -r '.repoRoot' "$record"
  done < <(get_all_watch_records "$KEY_DIR") | sort -u
}

# .what = drop each watch at one repo root whose clone the clone list names dead or gone
del_watch_records_of_dead_clones_at_root() {
  local root="$1" list="$2" record row_root serial watch_id reach
  while IFS= read -r record; do
    [[ -n "$record" ]] || continue
    IFS=$'\t' read -r row_root serial watch_id < <(jq -r '[.repoRoot, .cloneSerial, (.watchId // "")] | @tsv' "$record")
    [[ "$row_root" == "$root" ]] || continue
    reach="$(as_watch_clone_reach "$list" "$serial")"
    if [[ "$reach" == "DEAD" || "$reach" == "absent" ]]; then
      log_watch "clone $serial is $reach; drop $(basename "$record")"
      del_watch_record "$record" "$watch_id"
    fi
  done < <(get_all_watch_records "$KEY_DIR")
}

# .what = pause: one paused alert per clone, once per pause cause (F7)
# .why  = a daemon that reads naught must say so, or the mechanic believes it
#         is watched; `daemon.paused` holds the cause, so the alert goes once
#         per cause, and a new cause (locked → expired) names its own fix
# .note = `daemon.paused.told` holds the clones told of this cause, so a clone
#         that sets its first watch mid-pause is told too, on the next tick
set_watch_paused() {
  local status="$1"
  if [[ "$(cat "$KEY_DIR/daemon.paused" 2>/dev/null || echo "")" != "$status" ]]; then
    log_watch "paused: token $status"
    rm -f "$KEY_DIR/daemon.paused.told"
    printf '%s' "$status" | set_watch_file_atomic "$KEY_DIR/daemon.paused"
  fi
  set_watch_note_per_untold_clone "$KEY_DIR/daemon.paused.told" as_watch_paused_text "$status"
}

# .what = the pause is over: clear its marks
# .why  = the next pause starts fresh, and tells every clone again
del_watch_paused() {
  [[ -f "$KEY_DIR/daemon.paused" ]] || return 0
  rm -f "$KEY_DIR/daemon.paused" "$KEY_DIR/daemon.paused.told"
  log_watch "resumed: github accepts the token"
}

# .what = the serials of every clone that holds a watch of this key, once each
get_all_watch_clone_serials() {
  local record
  while IFS= read -r record; do
    [[ -n "$record" ]] && jq -r '.cloneSerial' "$record"
  done < <(get_all_watch_records "$KEY_DIR") | sort -u
}

# .what = the prs one clone watches, as `#1220, #1221`
get_watch_prs_of_clone() {
  local serial="$1" record
  while IFS= read -r record; do
    [[ -n "$record" ]] && jq -r --arg s "$serial" 'select(.cloneSerial == $s) | "#\(.pr)"' "$record"
  done < <(get_all_watch_records "$KEY_DIR") | paste -sd, - | sed 's/,/, /g'
}

# .what = one watch record of one clone, or empty
# .why  = a note per clone rides one of its watches' outboxes, so it is delivered
#         to that clone's repo root by that clone's serial
get_one_watch_record_of_clone() {
  local serial="$1" record
  while IFS= read -r record; do
    [[ -n "$record" && "$(jq -r '.cloneSerial' "$record")" == "$serial" ]] && { echo "$record"; return 0; }
  done < <(get_all_watch_records "$KEY_DIR")
  return 0
}

# .what = queue one note to one clone; the note names its prs
# usage: set_watch_note_for_clone <serial> <text_fn> [arg...]   # text_fn gets the prs last
# returns: 0 queued · 1 the clone holds no watch now, so no outbox holds a note
set_watch_note_for_clone() {
  local serial="$1" text_fn="$2"
  shift 2
  local record
  record="$(get_one_watch_record_of_clone "$serial")"
  [[ -n "$record" ]] || return 1
  set_watch_outbox_entry "$record" "$("$text_fn" "$@" "$(get_watch_prs_of_clone "$serial")")"
}

# .what = queue one note to each clone with a watch that the told file does not
#         yet name; then name it there
# .why  = a box-wide fault (token, outage) is one note per clone, not one per
#         watch; a clone that joins mid-fault is told on its first tick, once
# usage: set_watch_note_per_untold_clone <told_file> <text_fn> [arg...]
# .note = the note lands before the serial is named told: a crash between the two
#         re-sends the note once on the next tick, and never loses it
set_watch_note_per_untold_clone() {
  local told="$1" text_fn="$2"
  shift 2
  local serial
  while IFS= read -r serial; do
    [[ -n "$serial" ]] || continue
    grep -qxF "$serial" "$told" 2>/dev/null && continue
    set_watch_note_for_clone "$serial" "$text_fn" "$@" || continue
    echo "$serial" >>"$told"
  done < <(get_all_watch_clone_serials)
}

# .what = is a rate limit still in force? clears the record once it lifts (A29)
# .why  = a read before the reset earns only another refusal and may lengthen
#         a secondary limit; the tick waits it out
is_watch_backoff_live() {
  local until
  [[ -f "$KEY_DIR/daemon.backoff" ]] || return 1
  until="$(cat "$KEY_DIR/daemon.backoff")"
  [[ "$until" =~ ^[0-9]+$ && "$until" -gt "$(get_watch_epoch_now)" ]] && return 0
  rm -f "$KEY_DIR/daemon.backoff"
  log_watch "rate limit lifted; reads resume"
  return 1
}

# .what = hold every read until the rate limit lifts; cursors hold, so no event is lost
# .why  = one token serves every pr on the box, so a limit on one read binds them all
set_watch_backoff() {
  local cache="$1" until
  until="$(cat "$cache/ratelimit.until" 2>/dev/null || echo "")"
  [[ "$until" =~ ^[0-9]+$ ]] || until=$(( $(get_watch_epoch_now) + 60 ))
  rm -f "$cache/ratelimit.until"
  printf '%s' "$until" | set_watch_file_atomic "$KEY_DIR/daemon.backoff"
  log_watch "rate limited until epoch $until; reads hold, cursors hold"
}

# .what = start an outage clock at its first failed tick; once the outage
#         outlasts the note bound, queue one note per clone (A30)
# .why  = a blip needs no word; a long silence must be named, or the clone
#         reads a quiet pr where in truth the daemon is blind
# usage: set_watch_outage <name> <text_fn> [arg...]   # text_fn gets minutes first, prs last
# .note = `daemon.$name.told` names each clone told of this outage, so the note
#         goes once per clone, and a clone that joins mid-outage is told too
set_watch_outage() {
  local name="$1" text_fn="$2"
  shift 2
  local mark="$KEY_DIR/daemon.$name" since now
  now="$(get_watch_epoch_now)"
  [[ -f "$mark" ]] || printf '%s' "$now" | set_watch_file_atomic "$mark"
  # a clock that did not land, or that holds no number, arms no note: an empty
  # start would read as an outage since the epoch, and alert at once
  since="$(cat "$mark" 2>/dev/null || echo "")"
  if [[ ! "$since" =~ ^[0-9]+$ ]]; then
    log_watch "$name clock unreadable at $mark; no note this tick"
    rm -f "$mark"
    return 0
  fi
  [[ $(( now - since )) -ge $WATCH_UNREACHABLE_NOTE_SECONDS ]] || return 0
  [[ -f "$mark.told" ]] || log_watch "$name since epoch $since; note sent"
  touch "$mark.told"
  set_watch_note_per_untold_clone "$mark.told" "$text_fn" "$(as_watch_minutes_ceil "$(( now - since ))")" "$@"
}

# .what = the outage is over: clear its marks
# .why  = the next outage starts its own clock and earns its own note
del_watch_outage() {
  local name="$1" said="$2" mark="$KEY_DIR/daemon.$1"
  [[ -f "$mark" ]] || return 0
  rm -f "$mark" "$mark.told"
  log_watch "$said"
}

# .what = github gave no reply, or a 5xx: the outage clock of github itself
set_watch_unreachable() {
  set_watch_outage unreachable as_watch_unreachable_text
}

# .what = github answered: its outage is over
del_watch_unreachable() {
  del_watch_outage unreachable "github reachable again"
}

# .what = read one endpoint into the pr cache; print the path of its body file
# .why  = bodies can outgrow one argv slot (128k), so jq reads them as files
get_watch_pr_resource_file() {
  local cache="$1" endpoint="$2" rc=0
  get_watch_github_resource "$cache" "$endpoint" "$WATCH_TOKEN" >/dev/null || rc=$?
  [[ $rc -eq 0 ]] || return $rc
  echo "$cache/$(as_watch_cache_stem "$endpoint").json"
}

# .what = the cache dir of one pr
# .why  = etags and bodies live per pr, so every watcher of it shares one read
get_watch_pr_cache_dir() {
  local repo="$1" pr="$2"
  echo "$KEY_DIR/cache/${repo%%/*}.${repo#*/}.pr=$pr"
}

# .what = was this pr closed with no merge? (reads a pull json file)
is_watch_pr_closed_unmerged() {
  [[ "$(jq -r '(.state == "closed") and (.merged != true)' "$1")" == "true" ]]
}

# .what = read the github state of one pr into a json file
# .why  = one read per pr per tick, shared by every watch on it
# returns: 0 ok · 3 auth refused · 4 rate limited · 5 unreachable · 1 other fault
get_watch_pr_state() {
  local repo="$1" pr="$2" out="$3" cache base pull head checks issues reviews_c reviews closed_by="" issue
  cache="$(get_watch_pr_cache_dir "$repo" "$pr")"
  base="repos/$repo"
  pull="$(get_watch_pr_resource_file "$cache" "$base/pulls/$pr")" || return $?
  head="$(jq -r '.head.sha // empty' "$pull")"
  checks="$cache/checks.none.json"
  echo '{"check_runs":[]}' >"$checks"
  if [[ -n "$head" ]]; then
    checks="$(get_watch_pr_resource_file "$cache" "$base/commits/$head/check-runs?per_page=100")" || return $?
  fi
  issues="$(get_watch_pr_resource_file "$cache" "$base/issues/$pr/comments?per_page=100")" || return $?
  reviews_c="$(get_watch_pr_resource_file "$cache" "$base/pulls/$pr/comments?per_page=100")" || return $?
  reviews="$(get_watch_pr_resource_file "$cache" "$base/pulls/$pr/reviews?per_page=100")" || return $?

  # who closed it: only read once the pr is closed without merge
  if is_watch_pr_closed_unmerged "$pull"; then
    issue="$(get_watch_pr_resource_file "$cache" "$base/issues/$pr")" || return $?
    closed_by="$(jq -r '.closed_by.login // empty' "$issue")"
  fi

  jq -n --slurpfile pull "$pull" --slurpfile checks "$checks" --slurpfile issues "$issues" \
    --slurpfile reviewComments "$reviews_c" --slurpfile reviews "$reviews" --arg closedBy "$closed_by" \
    '{ pull: $pull[0], checks: $checks[0], issueComments: $issues[0], reviewComments: $reviewComments[0], reviews: $reviews[0], closedBy: $closedBy }' >"$out"
}

# .what = diff one watch against its pr state; queue its alert; advance its cursors
# .why  = the alert lands in the outbox before the cursors move, so a crash
#         between the two re-sends at most once and never drops one (F6, F7)
set_watch_alert_for_record() {
  local record="$1" state_file="$2" serial diff events end closed_by text repo pr ledger peers watch_id
  watch_id="$(jq -r '.watchId // ""' "$record")"
  serial="$(jq -r '.cloneSerial' "$record")"
  repo="$(jq -r '.repo' "$record")"
  pr="$(jq -r '.pr' "$record")"

  # an unreadable ledger could echo the clone's own words (F5); hold this watch,
  # cursors and all, until it reads again
  ledger="$(get_watch_ledger_json "$serial")" || {
    log_watch "ledger of clone $serial unreadable; $(basename "$record") holds this tick"
    return 0
  }
  peers="$(get_all_watch_ledger_peer_json 2>/dev/null)" || peers='[]'
  [[ -n "$peers" ]] || peers='[]'
  diff="$(jq -n --slurpfile watch "$record" --slurpfile state "$state_file" \
    --argjson ledger "$ledger" --argjson peers "$peers" \
    '$state[0] + { watch: $watch[0], ledger: $ledger, peers: $peers }' | jq "$WATCH_DIFF_JQ")" || {
    log_watch "diff failed for $(basename "$record")"
    return 0
  }
  events="$(printf '%s' "$diff" | jq -c '.events')"
  end="$(printf '%s' "$diff" | jq -r '.prEnd // empty')"
  closed_by="$(jq -r '.closedBy // empty' "$state_file")"

  # queue the alert first, then advance the cursors (F6, F7); a queue write that
  # does not land holds the cursors too, so the next tick queues it again
  text="$(as_watch_alert_text "$repo" "$pr" "$events" "$end" "$closed_by")"
  if [[ -n "$text" ]] && ! set_watch_outbox_entry "$record" "$text"; then
    log_watch "outbox write failed for $(basename "$record") (cause above); cursors hold, so its alert is queued again next tick"
    return 0
  fi
  # .note = a write that does not land holds the cursors, so each such tick
  #         queues that alert once more: a repeat, never a drop (F6)
  get_watch_record_advanced "$record" "$(printf '%s' "$diff" | jq -c '.cursors')" "$end" \
    | set_watch_record_if_same "$KEY_DIR" "$record" "$watch_id" \
    || log_watch "record write held (lock timed out, or the write faulted; cause above); $(basename "$record") cursors hold, so its alert repeats next tick"
}

# .what = a watch record with its cursors advanced, primed, and its end noted
get_watch_record_advanced() {
  local record="$1" cursors="$2" end="$3"
  jq --argjson cursors "$cursors" --arg prEnd "$end" \
    '.cursors = $cursors | .primed = true | if $prEnd != "" then .ended = $prEnd else . end' "$record"
}

# .what = deliver each outbox entry, oldest first; drop the watches whose clone died
# .why  = a refused alert waits for the clone, never forced (F8); oldest first
#         keeps the clone's read in the order events happened
# .note = a watch marked ended is deleted once its outbox is empty
set_watch_outbox_drained() {
  local entry stem record root serial watch_id text tries rc held=""
  # .note = the entries ride fd 4, so no read in the loop can drain them from stdin
  while IFS= read -r -u 4 entry; do
    [[ -f "$entry" ]] || continue
    stem="$(as_watch_record_stem_of_outbox_entry "$entry")"
    record="$(as_watch_record_path "$KEY_DIR" "$stem.json")"
    # an entry whose watch is gone has no clone to reach
    if [[ ! -f "$record" ]]; then
      rm -f "$entry"
      continue
    fi
    IFS=$'\t' read -r root serial watch_id < <(jq -r '[.repoRoot, .cloneSerial, (.watchId // "")] | @tsv' "$record")
    text="$(jq -r '.text' "$entry")"
    tries="$(jq -r '.tries' "$entry")"
    # a clone that held one alert this tick holds the rest too: its later alerts
    # wait in order, and a wedged clone costs one bound per tick, not one per alert
    if [[ $'\n'"$held"$'\n' == *$'\n'"$serial"$'\n'* ]]; then
      jq --argjson tries "$((tries + 1))" '.tries = $tries' "$entry" | set_watch_file_atomic "$entry"
      continue
    fi
    [[ "$tries" != "0" ]] && text="$(as_watch_alert_text_held "$text" "$tries")"
    rc=0
    send_watch_alert "$root" "$serial" "$text" || rc=$?
    # a long drain of slow clones is still a live daemon
    set_watch_heartbeat
    if [[ $rc -eq 0 ]]; then
      rm -f "$entry"
      continue
    fi
    if [[ $rc -eq 3 ]]; then
      log_watch "clone $serial is DEAD; drop $(basename "$record")"
      del_watch_record "$record" "$watch_id"
      continue
    fi
    held="$held"$'\n'"$serial"
    tries=$((tries + 1))
    jq --argjson tries "$tries" '.tries = $tries' "$entry" | set_watch_file_atomic "$entry"
    [[ $((tries % 10)) -eq 0 ]] && log_watch "alert for $stem held $tries ticks"
  done 4< <(get_all_watch_outbox_entries)

  # a watch that ended leaves once its last alert is out
  while IFS= read -r record; do
    [[ -n "$record" ]] || continue
    # the life id is read before the ended mark, so a `set` that renews it after keeps its new life
    watch_id="$(jq -r '.watchId // ""' "$record")"
    is_watch_ended "$record" || continue
    stem="$(basename "$record" .json)"
    is_watch_outbox_empty "$stem" || continue
    log_watch "watch $stem ended ($(jq -r '.ended' "$record"))"
    del_watch_record "$record" "$watch_id"
  done < <(get_all_watch_records "$KEY_DIR")
  return 0
}

# .what = every outbox entry of this key, oldest first within each watch
# .note = an entry name is `<record stem>.<epoch>.<pid>.<random>.json`, so a byte sort
#         groups by watch, then orders each watch's entries by time; order across
#         watches is by name, which no alert relies on
get_all_watch_outbox_entries() {
  local entry
  for entry in "$(as_watch_outbox_dir "$KEY_DIR")/"*.json; do
    [[ -f "$entry" ]] && echo "$entry"
  done | LC_ALL=C sort
}

# .what = has this watch's pr merged or closed?
is_watch_ended() {
  [[ -n "$(jq -r '.ended // empty' "$1")" ]]
}

# .what = does this watch hold no outbox entry?
is_watch_outbox_empty() {
  [[ -z "$(get_all_watch_outbox_entries_of_stem "$KEY_DIR" "$1")" ]]
}

# .what = read the token at each watched repo root that stands, until one grants
# .why  = the token is one per machine, but keyrack reads it through a repo's own
#         rhachet (R3); a root with no manifest, or an old rhachet, must not pause
#         every watch on the box while another root would grant
# sets: WATCH_TOKEN, WATCH_TOKEN_STATUS, WATCH_TOKEN_FAULT, WATCH_TOKEN_ROOT
# .note = where none grants, the status a human can act on outranks a fault, and
#         `locked` outranks `absent` (a root with no manifest reads absent)
get_watch_token_of_any_root() {
  local root status="" fault="" from=""
  while IFS= read -r root; do
    [[ -n "$root" && -d "$root" ]] || continue
    get_watch_token "$root"
    set_watch_heartbeat
    if [[ "$WATCH_TOKEN_STATUS" == "granted" ]]; then
      WATCH_TOKEN_ROOT="$root"
      return 0
    fi
    if [[ "$(as_watch_token_status_rank "$WATCH_TOKEN_STATUS")" -gt "$(as_watch_token_status_rank "$status")" ]]; then
      status="$WATCH_TOKEN_STATUS"
      fault="$WATCH_TOKEN_FAULT"
      from="$root"
    fi
  done < <(get_all_watch_repo_roots)
  WATCH_TOKEN=""
  WATCH_TOKEN_STATUS="${status:-fault}"
  WATCH_TOKEN_FAULT="$fault"
  [[ -n "$status" ]] || WATCH_TOKEN_FAULT="no watched repo root stands"
  WATCH_TOKEN_ROOT="$from"
}

# .what = how well one token status tells a human what to do; higher wins
as_watch_token_status_rank() {
  case "$1" in
    locked) echo 4 ;;
    blocked) echo 3 ;;
    absent) echo 2 ;;
    fault) echo 1 ;;
    *) echo 0 ;;
  esac
}

# .what = every live repo|pr pair of this key, once each
# .why  = one github read per pr per tick serves every watch on it
get_all_watched_repo_prs() {
  local record
  while IFS= read -r record; do
    [[ -n "$record" ]] && jq -r 'select((.ended // "") == "") | "\(.repo)|\(.pr)"' "$record"
  done < <(get_all_watch_records "$KEY_DIR") | sort -u
}

# .what = every live watch record of one repo#pr
get_all_watch_records_of_pr() {
  local repo="$1" pr="$2" record
  while IFS= read -r record; do
    [[ -n "$record" ]] || continue
    [[ "$(jq -r --arg repo "$repo" --argjson pr "$pr" \
      '(.repo == $repo) and (.pr == $pr) and ((.ended // "") == "")' "$record")" == "true" ]] && echo "$record"
  done < <(get_all_watch_records "$KEY_DIR")
  return 0
}

######################################################################
# the tick
######################################################################

# .what = one tick: heartbeat, clone probe, token, one read per pr, alerts, outbox
# .why  = the whole of the daemon's work; the loop below only paces it
run_watch_tick() {
  set_watch_heartbeat
  exit_watch_daemon_if_idle
  del_watch_records_of_dead_clones
  exit_watch_daemon_if_idle

  # a rate limit holds every read until it lifts; held alerts still go out
  if is_watch_backoff_live; then
    set_watch_outbox_drained
    return 0
  fi

  # the token, read where a watch's repo manifest lives
  get_watch_token_of_any_root

  # a fault no human state explains: hold this tick; one that lasts earns a note
  if [[ "$WATCH_TOKEN_STATUS" == "fault" ]]; then
    log_watch "token read faulted: ${WATCH_TOKEN_FAULT:-no reply}; skip tick"
    set_watch_outage tokenfault as_watch_token_fault_text "$WATCH_TOKEN_FAULT" "${WATCH_TOKEN_ROOT:-<a watched repo root>}"
    set_watch_outbox_drained
    return 0
  fi
  del_watch_outage tokenfault "token read answers again"

  # a token state a human can act on: pause, loud, once
  if [[ "$WATCH_TOKEN_STATUS" != "granted" ]]; then
    set_watch_paused "$WATCH_TOKEN_STATUS"
    set_watch_outbox_drained
    return 0
  fi

  # one github read per pr, shared by its watchers
  # .note = a pause lifts only once github accepts the token; a granted keyrack
  #         read alone would lift a 401 pause each tick, and re-alert it (F7)
  # .note = the pairs ride fd 3, so no read in the loop can drain them from stdin
  local repo pr state_file rc record
  while IFS='|' read -r -u 3 repo pr; do
    [[ -n "$repo" ]] || continue
    state_file="$(mktemp)"
    rc=0
    get_watch_pr_state "$repo" "$pr" "$state_file" || rc=$?
    if [[ $rc -eq 3 ]]; then
      rm -f "$state_file"
      set_watch_paused "expired"
      set_watch_outbox_drained
      return 0
    fi
    if [[ $rc -eq 4 ]]; then
      rm -f "$state_file"
      set_watch_backoff "$(get_watch_pr_cache_dir "$repo" "$pr")"
      set_watch_outbox_drained
      return 0
    fi
    if [[ $rc -eq 5 ]]; then
      log_watch "github unreachable for $repo#$pr; cursors hold"
      rm -f "$state_file"
      set_watch_unreachable
      continue
    fi
    if [[ $rc -ne 0 ]]; then
      log_watch "read of $repo#$pr failed; cursors hold"
      rm -f "$state_file"
      continue
    fi
    del_watch_paused
    del_watch_unreachable
    while IFS= read -r -u 4 record; do
      [[ -n "$record" ]] && set_watch_alert_for_record "$record" "$state_file"
    done 4< <(get_all_watch_records_of_pr "$repo" "$pr")
    rm -f "$state_file"
    set_watch_heartbeat
  done 3< <(get_all_watched_repo_prs)

  set_watch_outbox_drained
}

# .note = the sleep runs in the background and is awaited, so a TERM lands at
#         once rather than after the sleep ends
# .note = daemon.ticks counts each tick done, so a reader can await whole ticks
TICKS_DONE=0
while true; do
  run_watch_tick
  TICKS_DONE=$((TICKS_DONE + 1))
  echo "$TICKS_DONE" | set_watch_file_atomic "$KEY_DIR/daemon.ticks"
  sleep "$WATCH_TICK_SECONDS" &
  wait $! || true
done
