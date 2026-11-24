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
#   - reads github with a keyrack token only: the ehmpath seaturtle token, else,
#     where it is absent, locked, or blocked, the grove's @all.prep.GITHUB_TOKEN;
#     the human login never (F11)
#   - an alert sits in the outbox before its cursors advance, so a crash re-sends
#     at most once and never drops one (F6, F7)
#   - a rate limit holds every read until it lifts; an outage holds the cursors,
#     and one past 30 min earns one note per clone (A29, A30)
#   - a keyrack fault holds the tick and logs its cause; one past 30 min earns
#     one note per clone, with the cause and the check
#   - a quiet pr is read less often: the gap doubles per quiet read, up to 30 min;
#     a change, a push, or a fresh watch snaps it back to one tick
#   - a pr with no change for a week ends its watches, with a note that names the rewatch
#   - a human review comment the crew has not answered reaches it as a reply task, its
#     text whole up to the cap, with the command that answers it; a thread the crew or
#     a peer answered, a bot's thread, and the crew's own words raise naught
#   - each comment is tracked by its id and a print of its body, so a draft review
#     that lands late raises, and a human's edit raises again
#   - an older key's watch whose repo root runs this key now is taken, cursors and
#     held alerts with it, so an upgrade moves every clone at once
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

# .what = the most bytes daemon.log keeps; past it, the oldest lines go
WATCH_LOG_MAX_BYTES="${GIT_PULL_WATCH_LOG_MAX_BYTES:-1048576}"

# .what = how long a repeated log line stays quiet before it logs again
WATCH_LOG_REPEAT_SECONDS="${GIT_PULL_WATCH_LOG_REPEAT_SECONDS:-3600}"

# .what = recent log lines, as `epoch<TAB>text`, newest last, at most 50
WATCH_LOG_SEEN=""

# .what = a log line with a timestamp; a line repeated within the hour logs once
# .why  = stdout goes to daemon.log; a timestamp lets a reader line it up with a tick.
#         a fault that recurs each tick would else add ~140 KB a day for the life of a
#         watch, so its repeats stay quiet until the hour passes
log_watch() {
  local text="$*" now row
  now="$(get_watch_epoch_now)"
  row="$(printf '%s\n' "$WATCH_LOG_SEEN" | awk -F '\t' -v t="$text" '$2 == t { at = $1 } END { print at }')"
  [[ -n "$row" && $((now - row)) -lt $WATCH_LOG_REPEAT_SECONDS ]] && return 0
  WATCH_LOG_SEEN="$(printf '%s\n' "$WATCH_LOG_SEEN" | awk -F '\t' -v t="$text" 'NF && $2 != t' | tail -n 49)"$'\n'"$now"$'\t'"$text"
  echo "$(get_watch_iso_now) $text"
}

# .what = cut daemon.log to its last WATCH_LOG_MAX_BYTES, in place
# .why  = the daemon's stdout holds the log open in append mode, so the cut rewrites
#         the same file rather than swap it; each later write lands at the new end
WATCH_LOG_CAPPED_AT=0
set_watch_log_capped() {
  local log="$KEY_DIR/daemon.log" size tmp
  WATCH_LOG_CAPPED_AT="$(get_watch_epoch_now)"
  size="$(wc -c <"$log" 2>/dev/null || echo 0)"
  [[ ${size// /} -gt $WATCH_LOG_MAX_BYTES ]] || return 0
  tmp="$(mktemp)" || return 0
  tail -c "$WATCH_LOG_MAX_BYTES" "$log" >"$tmp" 2>/dev/null && cat "$tmp" >"$log"
  rm -f "$tmp"
  return 0
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
set_watch_log_capped
log_watch "boot: daemon pid $$ key $KEY tick ${WATCH_TICK_SECONDS}s"
# a cap knob that is no whole number falls back to the default; the log names the swap
[[ "$WATCH_REPLY_TEXT_MAX_CHARS" == "${GIT_PULL_WATCH_REPLY_TEXT_MAX_CHARS:-$WATCH_REPLY_TEXT_MAX_CHARS}" ]] \
  || log_watch "boot: GIT_PULL_WATCH_REPLY_TEXT_MAX_CHARS='${GIT_PULL_WATCH_REPLY_TEXT_MAX_CHARS}' is no whole number; reply text caps at $WATCH_REPLY_TEXT_MAX_CHARS chars"
[[ "$WATCH_ALERT_CHECKS_SHOWN_MAX" == "${GIT_PULL_WATCH_ALERT_CHECKS_SHOWN_MAX:-$WATCH_ALERT_CHECKS_SHOWN_MAX}" ]] \
  || log_watch "boot: GIT_PULL_WATCH_ALERT_CHECKS_SHOWN_MAX='${GIT_PULL_WATCH_ALERT_CHECKS_SHOWN_MAX}' is no whole number; an alert lists $WATCH_ALERT_CHECKS_SHOWN_MAX checks"

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
# input: { watch, pull, checks, issueComments, reviewComments, reviews, ledger, peers, textCap }
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
  # whole alert undeliverable at `clone say`, so every github string is cleaned:
  # a whole ansi sequence goes (never a half that leaves `[31m`), a tab reads as a
  # space so words stay apart, and any other control byte goes
  def clean: "\(. // "")"
    | gsub("(\u001b\\[|\u009b)[0-?]*[ -/]*[@-~]"; "")
    | gsub("\u001b[@-_]"; "")
    | gsub("\t"; " ")
    | gsub("\\p{Cc}"; "");
  # an inline review comment names its file and line, so the clone opens the spot at once
  # a push that moves the code nulls `line`; the comment then names the line it was
  # left on, marked so the crew reads it as a past place, not the current one
  # a comment on a whole file holds no line at all, so it names the file alone
  def file_line: if (.path // "") == "" then null
    elif .line != null then "\(.path | clean):\(.line)"
    elif .original_line != null then "\(.path | clean):\(.original_line) (outdated)"
    else "\(.path | clean)" end;
  # the excerpt reads prose only: a fence line and each line inside a fence go, so a
  # suggestion-only comment reads `(a suggestion)`, never its bare ```suggestion fence
  def prose_lines: reduce ((.body // "") | split("\n"))[] as $l ({ fenced: false, out: [] };
    if ($l | test("^\\s*```")) then .fenced = (.fenced | not)
    elif .fenced or ($l | test("\\S") | not) then .
    else .out += [$l] end) | .out;
  def has_fence: (.body // "") | test("```");
  def first_line_whole: ((prose_lines | .[0])
    // (if ((.body // "") | test("```suggestion")) then "(a suggestion)" elif has_fence then "(a code block)" else "" end))
    | clean;
  def first_line: (first_line_whole | .[0:120]);
  # the alert marks a cut excerpt with an ellipsis, so the clone knows to read the
  # rest: a first line past 120 chars, a second prose line, or a fence
  def line_cut: ((first_line_whole | length) > 120)
    or ((prose_lines | length) > 1)
    or has_fence;
  def max_id($rows; $prior): ([$prior] + [$rows[]?.id]) | max;
  # a comment body as a print: its length and a sum of its code points, each weighted
  # by its place. jq holds no sha; an edit that keeps both is rare
  def body_print: ((.body // "") | explode) as $c
    | "\($c | length):\(reduce $c[] as $x (7; (. * 31 + $x) % 2147483647))";
  # the seen state of one comment list: id → body print. a record from before seen
  # state reads each id at or below its max cursor as seen, at its current print,
  # so an upgrade re-raises naught
  # .note = a record carried to a new key merges onto a fresh template, whose seen map
  #         is empty; an empty map beside a max cursor past zero is that legacy record,
  #         never a watch that saw naught, so it reads by the cursor
  def seen_of($rows; $map; $max):
    if ($map | type) == "object" and ((($map | length) > 0) or (($max // 0) == 0)) then $map
    else ([$rows[] | select(.id <= ($max // 0)) | { key: (.id | tostring), value: body_print }] | from_entries) end;
  def seen_now($rows): [$rows[] | { key: (.id | tostring), value: body_print }] | from_entries;
  # a comment no read has seen, whatever its id: a draft review lands with ids
  # below comments read before its submit, so a max-id cursor would drop it (F8)
  def is_unseen($seen): (.id | tostring) as $k | ($seen | has($k) | not);
  # a comment seen before whose body changed; its id stays (F9)
  def is_edited($seen): (.id | tostring) as $k | ($seen | has($k)) and ($seen[$k] != body_print);
  # the whole key of the answer a reply task owes, to print as is: the comment id, its
  # print for an edit, and the clone. a keyed set edits in place and an edit sends no
  # notice, so the answer to an edited ask, or a second clone, must post fresh, never
  # edit an answer another wrote
  def answer_key($seen; $clone): "answer-\(.id)"
    + (if is_edited($seen) then "-e\(body_print | split(":") | .[1])" else "" end)
    + "-c\($clone[0:8])";
  # the text a reply task carries: the body up to the cap, line by line, each cleaned;
  # a blank line is dropped, since a tree leaf cannot be blank
  def task_comment($cap): (.body // "") as $b | {
      id, author: ((.user.login // "?") | clean),
      lines: (($b | .[0:$cap] | split("\n") | map(clean | sub("\\s+$"; "")) | map(select(test("\\S")))) as $l
        | if ($l | length) == 0 then ["(no text)"] else $l end),
      more: ([($b | length) - $cap, 0] | max)
    };
  . as $in
  | $in.watch.cursors as $c
  | ($in.textCap // 2000) as $cap
  # a record with no serial keys as `unknown`, which still fits the key grammar of
  # `git.pull.comment set` (a-z 0-9 . _ -)
  | ($in.watch.cloneSerial // "unknown" | tostring | ascii_downcase) as $clone
  | ($in.pull.head.sha // null) as $head
  | ($in.ledger // []) as $ledger
  | ($in.peers // []) as $peers
  | ($in.issueComments // []) as $ic
  | ($in.reviewComments // []) as $rc
  | ([$ic[], $rc[], ($in.reviews // [])[]]
     | map(select(.id as $id | $peers | any(. == $id)) | .user.login // empty) | unique) as $peerLogins
  | (if $c.headSha == $head then ($c.checkRunIdsSeen // []) else [] end) as $seen
  | seen_of($ic; $c.issueCommentsSeen; $c.issueCommentIdMax) as $seenIc
  | seen_of($rc; $c.reviewCommentsSeen; $c.reviewCommentIdMax) as $seenRc
  | ([($in.reviews // [])[] | { key: (.id | tostring), value: (.submitted_at // null) }] | from_entries) as $reviewAt
  | [($in.checks.check_runs // [])[]] as $runs
  | (if ($runs | length) == 0 then "none" elif ($runs | any(is_failed)) then "failed"
     elif ($runs | all(.status == "completed")) then "passed" else "unfinished" end) as $ci
  | [$runs[] | select(is_failed)] as $failed
  | [$failed[] | select(.id as $id | $seen | any(. == $id) | not)] as $failedNew
  | [($in.reviews // [])[] | select(.id > $c.reviewIdMax)] as $reviewNew
  | (if $in.pull.merged == true then "merged" elif $in.pull.state == "closed" then "closed" else null end) as $prEnd
  | ($in.watch.primed == true) as $primed
  | ($in.watch.setAt // "9999") as $setAt
  # the prime tick alerts only what happened after the watch was set, so a check
  # that fails between `set` and the first tick still alerts (A3 holds: older stays quiet)
  | def fresh($t): $primed or ("\($t // "")" >= $setAt);
    # the crew own words, under any of its logins: its ledger is the proof
    def is_own: .id as $id | $ledger | any(. == $id);
    # an answer: the crew own, or a peer clone. a 🐢 body counts only from a login that
    # holds a ledgered comment, so a stranger or a 🐢 app bot never answers
    def is_answerer: is_own or (.id as $id | $peers | any(. == $id))
      or (((.body // "") | startswith("🐢")) and ((.user.login // "") as $l | $peerLogins | any(. == $l)));
    def is_human: (is_answerer | not) and (is_peer($peers; $peerLogins) | not) and (is_bot | not);
    # a reply task hands up to the whole comment to the crew as work, so only a human
    # the repo trusts may raise one; any other human keeps the extant excerpt alert.
    # a row with no association reads as untrusted, so the gate fails closed
    def is_trusted: (.author_association // "NONE") as $a | ["OWNER", "MEMBER", "COLLABORATOR"] | any(. == $a);
    # a comment in a draft review reaches the api at the submit, not when drafted
    def arrived_at: (if .pull_request_review_id != null then $reviewAt[(.pull_request_review_id | tostring)] else null end) // .created_at;
    # the reply task of one thread, or empty: each human comment after its last answer
    # that no read has seen, plus each human comment edited since the last read
    # .note = a thread is ordered by arrival, not by draft: a draft follow-up that
    #         reached the api after a crew answer must sort after that answer, or it
    #         reads as answered. a row with no stamp sorts last
    def thread_task($seenMap; $root):
      sort_by((arrived_at // "~"), .id) as $t
      | ([$t | to_entries[] | select(.value | is_answerer) | .key] | max // -1) as $last
      | (if $last >= 0 then ($t[$last] | arrived_at) else null end) as $lastAt
      | [$t | to_entries[] | select(.key > $last) | .value
          | select(is_human and is_trusted and is_unseen($seenMap) and fresh(arrived_at))] as $asks
      # an edit raises when it landed after the last answer: one the crew answered after
      # the edit (via a relay, in the same read gap) is answered. a row with no edit
      # stamp raises, so an edit is never lost to an absent field
      | [$t[] | select(is_human and is_trusted and is_edited($seenMap)
          and ($lastAt == null or ((.updated_at // "~") >= $lastAt)))] as $edits
      | (($asks + $edits) | unique_by(.id) | sort_by((arrived_at // "~"), .id)) as $all
      | if ($all | length) == 0 then empty else
          ($t | map(select(.id == $root)) | first) as $rootRow
          | (if ($asks | length) == 0 then "edited"
             elif ($asks | any(.id == $root) | not) then "follow-up"
             else "new" end) as $label
          | { kind: "reply.task", root: $root, label: $label,
              file: ($all[0] | file_line),
              re: (if $label != "new" and $rootRow != null and $all[0].id != $root then ($rootRow | first_line) else null end),
              url: ($all[0].html_url | clean), key: ($all[0] | answer_key($seenMap; $clone)),
              comments: [$all[] | task_comment($cap)] }
        end;
    # a review thread groups under its root
    ($rc | group_by(.in_reply_to_id // .id) | map((.[0].in_reply_to_id // .[0].id) as $root | thread_task($seenRc; $root))) as $replyReview
    # a top-level comment keeps the extant alert, a human one included: the conversation
    # tab has no reply link, so no answer can be proven per comment (vision Q9, ruled out)
    | [$ic[] | select(is_unseen($seenIc) and (is_own | not))] as $issueNew
    # on a review thread a ledger-proven peer clone, or a human the repo does not trust,
    # keeps the extant alert: a bot thread raises naught, a 🐢 on an app bot proves no
    # clone, a trusted human rides a reply task
    | [$rc[] | select(is_unseen($seenRc) and (is_own | not)
        and (is_answerer or (is_human and (is_trusted | not))))] as $reviewCommentNew
    | {
      events: (
        $replyReview
        + [ $failedNew[] | select(fresh(.completed_at)) | { kind: "ci.failed", name: (.name | clean), conclusion: (.conclusion | clean), head: (($head | clean) | .[0:7]), url: (.html_url | clean) } ]
        + [ $issueNew[] | select(fresh(.created_at)) | { kind: "comment.new", label: "comment", author: ((.user.login // "?") | clean), who: who($peers; $peerLogins), line: first_line, lineCut: line_cut, url: (.html_url | clean) } ]
        + [ $reviewCommentNew[] | select(fresh(arrived_at)) | { kind: "comment.new", label: "review comment", author: ((.user.login // "?") | clean), who: who($peers; $peerLogins), file: file_line, line: first_line, lineCut: line_cut, url: (.html_url | clean) } ]
        + [ $reviewNew[] | select(fresh(.submitted_at)) | select(.state == "APPROVED") | { kind: "review.approved", author: ((.user.login // "?") | clean), who: who($peers; $peerLogins), ci: $ci, url: (.html_url | clean) } ]
        + [ $reviewNew[] | select(fresh(.submitted_at)) | select(.state != "APPROVED" and ((.state == "CHANGES_REQUESTED") or ((.body // "") | test("\\S")))) | { kind: "comment.new", label: ("review: " + (.state | ascii_downcase | gsub("_"; " "))), author: ((.user.login // "?") | clean), who: who($peers; $peerLogins), line: first_line, lineCut: line_cut, reviewId: .id, url: (.html_url | clean) } ]
      ),
      cursors: {
        headSha: $head,
        checkRunIdsSeen: (($seen + [$failed[].id]) | unique),
        # merged, never replaced: a read that omits a row once must not re-raise it on
        # the next; the current print wins, so an edit still shows (F8, F9)
        issueCommentsSeen: ($seenIc + seen_now($ic)),
        reviewCommentsSeen: ($seenRc + seen_now($rc)),
        # the max-id cursors stay written: an older daemon on this box reads only them,
        # so a downgrade keeps its place
        issueCommentIdMax: max_id($ic; $c.issueCommentIdMax),
        reviewCommentIdMax: max_id($rc; $c.reviewCommentIdMax),
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
# .note = the text rides stdin, not argv: one argv slot caps at 128 KiB, and an alert
#         of many whole comments passes that
set_watch_outbox_entry() {
  local record="$1" text="$2" stem
  stem="$(basename "$record" .json)"
  printf '%s' "$text" | jq -R -s --arg at "$(get_watch_iso_now)" '{ text: ., tries: 0, heldAt: $at }' \
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
    # the caches and the bin copy serve only a live daemon; the next spawn copies bin
    # afresh under this same lock, and every pr reads cold, so naught stale stays
    rm -rf "${KEY_DIR:?}/cache" "${KEY_DIR:?}/bin"
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

# .what = record a failed read of one pr in its cache dir: since, rc, cause
# .why  = one pr that fails each tick must not hide behind another that reads fine;
#         its own clock names it in `get`, and an outage of that pr alone earns a note
# .note = `since` holds from the first failed read; rc and cause track the latest
set_watch_pr_read_fault() {
  local repo="$1" pr="$2" rc="$3" cause="$4" cache file since
  cache="$(get_watch_pr_cache_dir "$repo" "$pr")"
  mkdir -p "$cache"
  file="$cache/read.fault"
  since="$(jq -r '.since // empty' "$file" 2>/dev/null || echo "")"
  [[ "$since" =~ ^[0-9]+$ ]] || since="$(get_watch_epoch_now)"
  jq -n -c --argjson since "$since" --argjson rc "$rc" --arg cause "$cause" \
    '{ since: $since, rc: $rc, cause: $cause }' | set_watch_file_atomic "$file"
}

# .what = a good read of one pr: its fault clock and its told list go
del_watch_pr_read_fault() {
  local cache
  cache="$(get_watch_pr_cache_dir "$1" "$2")"
  rm -f "$cache/read.fault" "$cache/read.fault.told"
}

# .what = once one pr has been unreachable past the note bound, while others read
#         fine, queue one outage note to each clone that watches it
# .why  = a box-wide note would say github is down; here only this pr is dark, so its
#         own watchers hear it, once per fault, and no other clone is woken
# .note = only an unreachable read (no reply, a 5xx) earns a note; a 404 or a 403 on
#         one pr shows in `get` alone, since what it should say is held for the commander
set_watch_pr_outage_notes() {
  local repo="$1" pr="$2" cache file since rc now record serial told
  cache="$(get_watch_pr_cache_dir "$repo" "$pr")"
  file="$cache/read.fault"
  told="$cache/read.fault.told"
  IFS=$'\t' read -r since rc < <(jq -r '[.since, .rc] | @tsv' "$file" 2>/dev/null) || return 0
  [[ "$rc" == "5" && "$since" =~ ^[0-9]+$ ]] || return 0
  now="$(get_watch_epoch_now)"
  [[ $(( now - since )) -ge $WATCH_UNREACHABLE_NOTE_SECONDS ]] || return 0
  while IFS= read -r record; do
    [[ -n "$record" ]] || continue
    serial="$(jq -r '.cloneSerial' "$record" 2>/dev/null || echo "")"
    [[ -n "$serial" ]] || continue
    grep -qxF "$serial" "$told" 2>/dev/null && continue
    set_watch_outbox_entry "$record" "$(as_watch_unreachable_text "$(as_watch_minutes_ceil "$(( now - since ))")" "#$pr")"
    echo "$serial" >>"$told"
    log_watch "github unreachable for $repo#$pr alone since epoch $since; note sent to $serial"
  done < <(get_all_watch_records_of_pr "$repo" "$pr")
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
  # .note = the ledgers ride stdin, not argv: the box-wide peer ledger never prunes,
  #         and one argv slot caps at 128 KiB; past it every diff on the box would fault
  diff="$(printf '{"ledger":%s,"peers":%s}' "$ledger" "$peers" \
    | jq --slurpfile watch "$record" --slurpfile state "$state_file" --argjson cap "$WATCH_REPLY_TEXT_MAX_CHARS" \
    '$state[0] + { watch: $watch[0], ledger: .ledger, peers: .peers, textCap: $cap }' | jq "$WATCH_DIFF_JQ")" || {
    log_watch "diff failed for $(basename "$record")"
    return 0
  }
  events="$(printf '%s' "$diff" | jq -c '.events')"
  end="$(printf '%s' "$diff" | jq -r '.prEnd // empty')"
  closed_by="$(jq -r '.closedBy // empty' "$state_file")"

  # queue the alert first, then advance the cursors (F6, F7); a queue write that
  # does not land holds the cursors too, so the next tick queues it again
  # a render that faults holds the cursors too: a bare or half alert would drop its task
  text="$(as_watch_alert_text "$repo" "$pr" "$events" "$end" "$closed_by")" || {
    log_watch "alert render failed for $(basename "$record"); cursors hold, so its alert is tried again next tick"
    return 0
  }
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
# .note = the cursors ride stdin, not argv: with a seen map per comment they pass one
#         argv slot (128 KiB) on a long pr, and a write that never lands re-queues forever
get_watch_record_advanced() {
  local record="$1" cursors="$2" end="$3"
  printf '%s' "$cursors" | jq --slurpfile record "$record" --arg prEnd "$end" \
    '. as $cursors | $record[0] | .cursors = $cursors | .primed = true | if $prEnd != "" then .ended = $prEnd else . end'
}

# .what = note one more refused try on a held alert, and the refusal's cause
# .why  = under the key lock, and only if the entry still stands: the prompt hook
#         may have printed and removed it mid-send, and a write-back would revive it
set_watch_outbox_entry_held() {
  local entry="$1" tries="$2" cause="$3"
  take_watch_lock "$KEY_DIR" || { log_watch "lock timed out; $(basename "$entry") keeps its try count"; return 0; }
  if [[ -f "$entry" ]]; then
    jq --argjson tries "$tries" --arg cause "$cause" \
      '.tries = $tries | if $cause != "" then .cause = $cause else . end' "$entry" | set_watch_file_atomic "$entry"
  fi
  drop_watch_lock "$KEY_DIR"
}

# .what = deliver each outbox entry, oldest first; drop the watches whose clone died
# .why  = a refused alert waits for the clone, never forced (F8); oldest first
#         keeps the clone's read in the order events happened
# .note = a watch marked ended is deleted once its outbox is empty
set_watch_outbox_drained() {
  local entry stem record root serial watch_id text tries rc held="" held_cause=""
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
      set_watch_outbox_entry_held "$entry" "$((tries + 1))" "$held_cause"
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
    held_cause="$WATCH_SAY_CAUSE"
    tries=$((tries + 1))
    set_watch_outbox_entry_held "$entry" "$tries" "$held_cause"
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
  WATCH_TOKEN_SOURCE=""
  WATCH_TOKEN_STATUS="${status:-fault}"
  WATCH_TOKEN_FAULT="$fault"
  [[ -n "$status" ]] || WATCH_TOKEN_FAULT="no watched repo root stands"
  WATCH_TOKEN_ROOT="$from"

  # no root grants the seaturtle token (absent, locked, or blocked): the grove's
  # machine token serves; where it too is not granted, the seaturtle status stands,
  # so the pause names the seaturtle fix
  # .note = a keyrack fault is no token state: it holds the tick, never falls back
  case "$WATCH_TOKEN_STATUS" in
    absent | locked | blocked) ;;
    *) return 0 ;;
  esac
  status="$WATCH_TOKEN_STATUS"
  get_watch_token_ambient "$from" || WATCH_TOKEN_STATUS="$status"
  set_watch_heartbeat
  return 0
}

# .what = log the key the token came from, once per change
# .why  = a daemon on the grove token reads as a different identity than the
#         seaturtle; the log names which, so a 401 or a quota is traced to its key
WATCH_TOKEN_SOURCE_LOGGED=""
set_watch_token_source_logged() {
  [[ "$WATCH_TOKEN_SOURCE" == "$WATCH_TOKEN_SOURCE_LOGGED" ]] && return 0
  WATCH_TOKEN_SOURCE_LOGGED="$WATCH_TOKEN_SOURCE"
  [[ "$WATCH_TOKEN_SOURCE" == "ambient" ]] \
    && log_watch "token: $WATCH_TOKEN_SLUG_AMBIENT, the grove token (the seaturtle token is not granted)" \
    && return 0
  log_watch "token: $WATCH_TOKEN_SLUG"
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

# .what = is any live watch of this pr not yet primed?
# .why  = a fresh watch reads its pr at the next tick, whatever the pr's cadence
is_watch_pr_unprimed() {
  local repo="$1" pr="$2" record
  while IFS= read -r record; do
    [[ -n "$record" && "$(jq -r '.primed // false' "$record")" != "true" ]] && return 0
  done < <(get_all_watch_records_of_pr "$repo" "$pr")
  return 1
}

# .what = end each watch of a pr idle past the ttl; tell its clone how to rewatch
# .why  = a pr with no change for a week holds a poll for naught; its watch ends,
#         and the drain deletes it once the note is out, so the daemon can reach zero
set_watch_idle_ended() {
  local repo="$1" pr="$2" record watch_id
  log_watch "$repo#$pr had no change in ${WATCH_IDLE_TTL_SECONDS}s; its watches end"
  while IFS= read -r -u 4 record; do
    [[ -n "$record" ]] || continue
    watch_id="$(jq -r '.watchId // ""' "$record")"
    set_watch_outbox_entry "$record" "$(as_watch_closure_text "$pr" idle "")" || continue
    jq '.ended = "idle"' "$record" | set_watch_record_if_same "$KEY_DIR" "$record" "$watch_id" \
      || log_watch "record write held; $(basename "$record") ends next tick"
  done 4< <(get_all_watch_records_of_pr "$repo" "$pr")
}

# .what = the key a repo root runs now, read once per root per tick
# .note = a newline list of `root<TAB>key`, so bash 3 (macos) needs no assoc array
WATCH_ROOT_KEYS=""
get_watch_key_of_root_cached() {
  local root="$1" row key
  row="$(printf '%s\n' "$WATCH_ROOT_KEYS" | grep -F -m1 "$root"$'\t' || true)"
  if [[ -n "$row" ]]; then
    echo "${row#*$'\t'}"
    return 0
  fi
  key="$(get_watch_key_of_root "$root")"
  WATCH_ROOT_KEYS="$WATCH_ROOT_KEYS"$'\n'"$root"$'\t'"$key"
  echo "$key"
}

# .what = take one watch from an older key into this one, its held alerts with it
# .why  = under the old key's lock, so the old daemon cannot write it back mid-move;
#         the cursors ride along, so no event re-alerts (case=14)
set_watch_record_stolen() {
  local record="$1" root="$2" slug="$3" watch_id="$4" old_dir target outbox entry
  old_dir="$(as_watch_key_dir_of_record "$record")"
  target="$(as_watch_record_path "$KEY_DIR" "$(basename "$record")")"
  outbox="$(as_watch_outbox_dir "$KEY_DIR")"
  take_watch_lock "$old_dir" || { log_watch "lock of $old_dir timed out; steal waits a tick"; return 0; }
  # the old life left, or was renewed, since this tick read it: leave it be
  if [[ ! -f "$record" || "$(jq -r '.watchId // ""' "$record" 2>/dev/null)" != "$watch_id" ]]; then
    drop_watch_lock "$old_dir"
    return 0
  fi
  # one key per watch (F9): a twin here already holds it, so the old one only leaves
  if [[ ! -f "$target" ]]; then
    as_watch_record_moved "$record" "$root" "$slug" | set_watch_file_atomic "$target" \
      || { drop_watch_lock "$old_dir"; log_watch "steal of $(basename "$record") failed to write; it stays"; return 0; }
    mkdir -p "$outbox"
    while IFS= read -r entry; do
      [[ -n "$entry" ]] && mv "$entry" "$outbox/"
    done < <(get_all_watch_outbox_entries_of_record "$record")
  fi
  rm -f "$record"
  drop_watch_lock "$old_dir"
  log_watch "took $(basename "$record") from v$(as_watch_key_from_dir "$old_dir"): its root runs v$KEY now"
}

# .what = take every live watch an older key holds whose repo root runs this key now
# .why  = an upgrade moves its clones at once, not at each clone's next `set`; the
#         old daemon drops to zero watches and exits
set_watch_records_stolen() {
  local dir record root slug watch_id
  WATCH_ROOT_KEYS=""
  while IFS= read -r dir; do
    [[ -n "$dir" && "$dir" != "$KEY_DIR" ]] || continue
    while IFS= read -r record; do
      [[ -n "$record" ]] || continue
      is_watch_ended "$record" && continue
      IFS=$'\t' read -r root slug watch_id < <(jq -r '[.repoRoot, .cloneSlug, (.watchId // "")] | @tsv' "$record")
      [[ -d "$root" ]] || continue
      [[ "$(get_watch_key_of_root_cached "$root")" == "$KEY" ]] || continue
      set_watch_record_stolen "$record" "$root" "$slug" "$watch_id"
    done < <(get_all_watch_records "$dir")
  done < <(get_all_watch_key_dirs)
}

######################################################################
# the tick
######################################################################

# .what = one tick: heartbeat, clone probe, token, one read per pr, alerts, outbox
# .why  = the whole of the daemon's work; the loop below only paces it
run_watch_tick() {
  set_watch_heartbeat
  [[ $(( $(get_watch_epoch_now) - WATCH_LOG_CAPPED_AT )) -ge 86400 ]] && set_watch_log_capped
  set_watch_records_stolen
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
  set_watch_token_source_logged

  # one github read per pr, shared by its watchers
  # .note = a pause lifts only once github accepts the token; a granted keyrack
  #         read alone would lift a 401 pause each tick, and re-alert it (F7)
  # .note = the pairs ride fd 3, so no read in the loop can drain them from stdin
  # .note = the box-wide outage clock runs only while no read of the tick gets a reply;
  #         a pr dark alone keeps its own clock (read.fault), so a good read of another
  #         pr cannot clear it
  local repo pr state_file err_file line cause rc record reads_ok=0 reads_down=0 prs_down=()
  while IFS='|' read -r -u 3 repo pr; do
    [[ -n "$repo" ]] || continue
    # a pr with no change past the ttl ends its watches; a quiet pr waits its gap
    if is_watch_pr_idle "$KEY_DIR" "$repo" "$pr"; then
      set_watch_idle_ended "$repo" "$pr"
      continue
    fi
    is_watch_pr_due "$KEY_DIR" "$repo" "$pr" || is_watch_pr_unprimed "$repo" "$pr" || continue
    state_file="$(mktemp)"
    err_file="$(mktemp)"
    rc=0
    get_watch_pr_state "$repo" "$pr" "$state_file" 2>"$err_file" || rc=$?
    # the read's fault lines reach the log through log_watch, so a repeat stays quiet;
    # the last one is the cause a read fault records
    while IFS= read -r line; do
      [[ -n "$line" ]] && log_watch "$line"
    done <"$err_file"
    cause="$(as_watch_last_text_line <"$err_file" 2>/dev/null || echo "")"
    rm -f "$err_file"
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
      set_watch_pr_read_fault "$repo" "$pr" 5 "${cause:0:200}"
      reads_down=$((reads_down + 1))
      prs_down+=("$repo|$pr")
      continue
    fi
    if [[ $rc -ne 0 ]]; then
      log_watch "read of $repo#$pr failed; cursors hold"
      rm -f "$state_file"
      set_watch_pr_read_fault "$repo" "$pr" "$rc" "${cause:0:200}"
      continue
    fi
    reads_ok=$((reads_ok + 1))
    del_watch_paused
    del_watch_pr_read_fault "$repo" "$pr"
    while IFS= read -r -u 4 record; do
      [[ -n "$record" ]] && set_watch_alert_for_record "$record" "$state_file"
    done 4< <(get_all_watch_records_of_pr "$repo" "$pr")
    set_watch_pr_cadence "$KEY_DIR" "$repo" "$pr" "$state_file"
    rm -f "$state_file"
    set_watch_heartbeat
  done 3< <(get_all_watched_repo_prs)

  # no reply at all this tick: github itself is down, one note per clone; any reply
  # ends that outage, and each pr still dark then speaks to its own watchers
  [[ $reads_down -gt 0 && $reads_ok -eq 0 ]] && set_watch_unreachable
  if [[ $reads_ok -gt 0 ]]; then
    del_watch_unreachable
    local one
    for one in "${prs_down[@]+"${prs_down[@]}"}"; do
      set_watch_pr_outage_notes "${one%%|*}" "${one#*|}"
    done
  fi

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
