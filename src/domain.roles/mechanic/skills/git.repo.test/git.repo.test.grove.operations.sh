#!/usr/bin/env bash
######################################################################
# .what = grove operations for git.repo.test: a per-machine bound on
#         full jest suites, held as kernel flock slots
#
# .why  = many trees share one box. each full suite takes a slot from
#         one pool per machine, so the box never runs more suites than
#         the bound, and a sound change never reads red for load
#
# usage:
#   source "$SCRIPT_DIR/git.repo.test.grove.operations.sh"
#   set_grove_plan            # before the tree header; may exit 2 on bad input
#   set_grove_slot            # inside the tree; prints the grove branch, claims
#   del_grove_holder_record   # on exit; clears this run's own record
#
# reads (globals of git.repo.test.sh):
#   WHAT, PATH_PATTERNS, NAME_PATTERNS, THOROUGH, REPO_ROOT, and emit_to_both
#
# guarantee:
#   - pool dir = $GIT_REPO_TEST_SLOTS_DIR, else /run/lock/rhachet/git.repo.test
#     where /run/lock is sticky and world-writable, else /tmp/rhachet/git.repo.test
#     (keyed on the dir's mode, never the caller's rights: one pool per box)
#   - bound    = $GIT_REPO_TEST_SLOTS, else max(1, cores ÷ 6)
#   - the slot lock lives on fd 9 of this process alone (the contract:
#     set_grove_claim_once opens fd 9; every long child after the claim
#     closes it). two launches follow the claim: the timer and
#     run_test_child, each with 9>&-. the --listTests calls run before
#     the claim. so the slot frees the instant this pid dies. short tools
#     (git, date) inherit fd 9 for their milliseconds of life
#   - fd 9 opens read-only on an extant slot file: no O_CREAT, so a slot
#     file another user created (fs.protected_regular) still locks
#   - a holder record (slot.N.holder.<pid>) is display text; the lock is
#     truth. a record whose pid is gone is skipped, never shown as a target
#   - the waiter never kills a holder; it names a stale one and the fix
#   - bypass: non-jest types, path-scoped runs without --thorough, and
#     runs nested inside a live run that holds a slot
######################################################################

GROVE_RUN_LOCK="/run/lock"
GROVE_DIR_FALLBACK="/tmp/rhachet/git.repo.test"
GROVE_CORES_PER_SLOT=6
GROVE_POLL_SECONDS=1
GROVE_BEAT_SECONDS=30
GROVE_STALE_SECONDS=1800
GROVE_RECORD_GRACE_TRIES=50 # x 0.1s: how long a waiter awaits a fresh holder's record

GROVE_BYPASS_REASON=""
GROVE_BOUND=""
GROVE_BOUND_SOURCE=""
GROVE_DIR=""
GROVE_SLOT=""
GROVE_STALE_HINTED=" "

######################################################################
# is the nest marker held by a live run? (slot.N:<pid>, pid alive)
# .why = an env var outlives its holder in any descendant daemon; only
#        a live holder pid proves the slot still counts this run
######################################################################
is_grove_nest_live() {
  local marker="${GIT_REPO_TEST_GROVE_HELD:-}"
  local pid="${marker##*:}"
  [[ "$marker" == slot.*:* ]] || return 1
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

######################################################################
# get the reason this run bypasses the bound, or empty if bounded
######################################################################
get_grove_bypass_reason() {
  # quick checks are not jest suites; a lint must never queue behind a suite
  if [[ "$WHAT" == "types" ]] || [[ "$WHAT" == "format" ]] || [[ "$WHAT" == "lint" ]]; then
    echo "not a jest suite"
    return 0
  fi

  # a run spawned inside a live held slot is already counted by that slot
  if is_grove_nest_live; then
    echo "nested in a held slot"
    return 0
  fi

  # a path scope narrows the files; a name:// scope alone loads them all
  if [[ ${#PATH_PATTERNS[@]} -gt 0 ]] && [[ "$THOROUGH" != "true" ]]; then
    echo "scoped run"
    return 0
  fi

  echo ""
}

######################################################################
# get the core count of this box (linux, then posix, then macos)
######################################################################
# .note = gnu nproc obeys OMP_NUM_THREADS / OMP_THREAD_LIMIT; unset them, so
#         a caller's thread hint never shrinks the box's bound
# .note = a container cpu quota is not seen; GIT_REPO_TEST_SLOTS overrides
get_grove_cores() {
  env -u OMP_NUM_THREADS -u OMP_THREAD_LIMIT nproc 2>/dev/null || getconf _NPROCESSORS_ONLN 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1
}

######################################################################
# get a duration as 47s or 4m03s; `?` when unknown
######################################################################
get_grove_duration() {
  local seconds="$1"
  if ! [[ "$seconds" =~ ^[0-9]+$ ]]; then
    echo "?"
    return 0
  fi
  if [[ "$seconds" -lt 60 ]]; then
    echo "${seconds}s"
    return 0
  fi
  printf '%dm%02ds\n' $((seconds / 60)) $((seconds % 60))
}

######################################################################
# get "N slot" or "N slots"
######################################################################
get_grove_slots_noun() {
  if [[ "$1" -eq 1 ]]; then echo "slot"; return 0; fi
  echo "slots"
}

######################################################################
# set the bypass reason and the bound; exit 2 on an invalid override
# .note = runs before the tree header, so a bad bound refuses alone
######################################################################
set_grove_plan() {
  GROVE_BYPASS_REASON=$(get_grove_bypass_reason)
  if [[ -n "$GROVE_BYPASS_REASON" ]]; then
    return 0
  fi

  # refuse a relative pool dir: each tree would read its own pool, and the bound would vanish
  local dir_raw="${GIT_REPO_TEST_SLOTS_DIR:-}"
  if [[ -n "$dir_raw" ]] && [[ "$dir_raw" != /* ]]; then
    {
      echo "✋ ConstraintError: GIT_REPO_TEST_SLOTS_DIR must be an absolute path"
      echo "   ├─ got: $dir_raw"
      echo "   └─ fix: export GIT_REPO_TEST_SLOTS_DIR=\"\$PWD/$dir_raw\", or unset it for the per-machine pool"
    } | emit_to_both
    exit 2
  fi

  # bound from the env override, when set
  local raw="${GIT_REPO_TEST_SLOTS:-}"
  if [[ -n "$raw" ]]; then
    if ! [[ "$raw" =~ ^[1-9][0-9]*$ ]]; then
      {
        echo "✋ ConstraintError: GIT_REPO_TEST_SLOTS must be a whole number ≥ 1"
        echo "   ├─ got: $raw"
        echo "   └─ fix: export GIT_REPO_TEST_SLOTS=2, or unset it to derive from the core count"
      } | emit_to_both
      exit 2
    fi
    GROVE_BOUND="$raw"
    GROVE_BOUND_SOURCE="GIT_REPO_TEST_SLOTS"
    return 0
  fi

  # bound from the core count: jest uses 50% of cores per suite, so 2 suites per 12 cores
  local cores
  cores=$(get_grove_cores)
  GROVE_BOUND=$((cores / GROVE_CORES_PER_SLOT))
  GROVE_BOUND_SOURCE="$cores cores ÷ $GROVE_CORES_PER_SLOT"

  # under the per-slot core count the quotient is 0; the floor is 1, and the label says so
  if [[ "$GROVE_BOUND" -lt 1 ]]; then
    GROVE_BOUND=1
    GROVE_BOUND_SOURCE="$cores cores ÷ $GROVE_CORES_PER_SLOT, min 1"
  fi
}

######################################################################
# get the default pool dir: /run/lock when it is open to all (sticky and
# world-writable), else /tmp
# .why = /run/lock is absent on macos and group-only on some distros; the
#        choice keys on the dir's own mode, never on the caller's rights,
#        so every user of the box lands on one pool
######################################################################
get_grove_dir_default() {
  if [[ -n "$(find "$GROVE_RUN_LOCK" -maxdepth 0 -type d -perm -1002 2>/dev/null)" ]]; then
    echo "$GROVE_RUN_LOCK/rhachet/git.repo.test"
    return 0
  fi
  echo "$GROVE_DIR_FALLBACK"
}

######################################################################
# set the pool dir; create it shared (1777) when absent
# exits 1 when the dir cannot be created or written
# .note = the default pool's parent is made sticky too, so no user can
#         rename the leaf; an override's parents keep the caller's umask
######################################################################
set_grove_dir() {
  GROVE_DIR="${GIT_REPO_TEST_SLOTS_DIR:-}"
  if [[ -z "$GROVE_DIR" ]]; then
    GROVE_DIR=$(get_grove_dir_default)
    local parent
    parent=$(dirname "$GROVE_DIR")
    if [[ ! -d "$parent" ]]; then
      (umask 000 && mkdir -p "$parent") 2>/dev/null || true
      chmod 1777 "$parent" 2>/dev/null || true
    fi
  fi

  # create the pool itself, open to every user of the box
  if [[ ! -d "$GROVE_DIR" ]]; then
    mkdir -p "$(dirname "$GROVE_DIR")" 2>/dev/null || true
    (umask 000 && mkdir "$GROVE_DIR") 2>/dev/null || true
    chmod 1777 "$GROVE_DIR" 2>/dev/null || true
  fi

  # fail loud when the pool cannot hold a lock
  if [[ ! -d "$GROVE_DIR" ]] || [[ ! -w "$GROVE_DIR" ]]; then
    {
      echo "   └─ 💥 MalfunctionError: grove pool dir is not writable"
      echo "      ├─ dir: $GROVE_DIR"
      echo "      └─ fix: create it with mode 1777, or export GIT_REPO_TEST_SLOTS_DIR=<a writable dir>"
    } | emit_to_both
    exit 1
  fi
}

######################################################################
# fail loud on a slot file no one can lock: a silent skip could wait forever
######################################################################
print_grove_slot_unlockable() {
  {
    echo "   │  └─ 💥 MalfunctionError: grove slot file is not readable"
    echo "   │     ├─ file: $1"
    echo "   │     └─ fix: chmod 666 it, or remove it so the next run recreates it"
  } | emit_to_both
  exit 1
}

######################################################################
# try once to claim any free slot; on success the lock sits on fd 9
# .note = fd 9 is the grove contract: git.repo.test.sh closes 9 on each
#         child it launches after the claim. change one, change both
######################################################################
set_grove_claim_once() {
  local i file
  for ((i = 0; i < GROVE_BOUND; i++)); do
    file="$GROVE_DIR/slot.$i.lock"

    # create the slot file open to every user (a create race with another user is harmless)
    if [[ ! -e "$file" ]]; then
      (umask 000 && : >>"$file") 2>/dev/null || true
    fi

    # open read-only: flock needs no write access, and no O_CREAT means no protected_regular refusal
    [[ -r "$file" ]] || print_grove_slot_unlockable "$file"
    exec 9<"$file" || print_grove_slot_unlockable "$file"

    # flock -n is atomic in the kernel: of two claimants, exactly one wins
    if flock -n 9; then
      GROVE_SLOT="$i"
      return 0
    fi
    exec 9<&-
  done
  return 1
}

######################################################################
# is a holder pid alive? works across users (/proc or ps, not kill -0)
# .note = on linux, /proc needs no fork: a fork that fails on a loaded box
#         would otherwise read a live holder as gone, and list it as `?`
######################################################################
is_grove_holder_live() {
  [[ "$1" =~ ^[0-9]+$ ]] || return 1
  if [[ -d /proc/self ]]; then
    [[ -d "/proc/$1" ]]
    return
  fi
  ps -p "$1" >/dev/null 2>&1
}

######################################################################
# set the holder record for the claimed slot (display only)
# .note = one file per holder, slot.N.holder.<pid>: always a new file, so
#         no write ever lands on a file another user made
#         (fs.protected_regular); records of gone pids are pruned where
#         this user may, and read as absent where not
######################################################################
set_grove_holder_record() {
  local stale pid
  for stale in "$GROVE_DIR/slot.$GROVE_SLOT.holder."*; do
    [[ -f "$stale" ]] || continue
    pid="${stale##*.}"
    is_grove_holder_live "$pid" || rm -f "$stale" 2>/dev/null || true
  done
  (
    umask 022
    printf 'tree=%s\nwhat=%s\nsince=%s\n' \
      "$(basename "$REPO_ROOT")" "$WHAT" "$(date +%s)" >"$GROVE_DIR/slot.$GROVE_SLOT.holder.$$"
  ) 2>/dev/null || true
}

######################################################################
# clear this run's holder record on exit, so no stale pid outlives it
# .note = a kill -9 leaves it; waiters then read it as absent, its pid gone
######################################################################
del_grove_holder_record() {
  [[ -n "$GROVE_SLOT" ]] && [[ -n "$GROVE_DIR" ]] || return 0
  rm -f "$GROVE_DIR/slot.$GROVE_SLOT.holder.$$" 2>/dev/null || true
}

######################################################################
# set GROVE_HOLDER_{TREE,WHAT,PID,AGE} from slot N's live holder record
# .note = records whose pid is gone are leftovers and are skipped; of the
#         live ones, the latest claim wins; none live → all fields read `?`
######################################################################
set_grove_holder_vars() {
  local slot="$1"
  local record pid since tree what key value
  GROVE_HOLDER_TREE="?"
  GROVE_HOLDER_WHAT="?"
  GROVE_HOLDER_PID="?"
  GROVE_HOLDER_AGE=""
  local since_best=-1
  for record in "$GROVE_DIR/slot.$slot.holder."*; do
    [[ -f "$record" ]] || continue
    pid="${record##*.}"
    is_grove_holder_live "$pid" || continue
    # a holder removes its record as it exits; a record gone mid-read is skipped
    # .note = a builtin read, no fork, so a loaded box cannot blank the record
    tree="?" what="?" since=""
    while IFS='=' read -r key value; do
      case "$key" in
        tree) tree="$value" ;;
        what) what="$value" ;;
        since) since="$value" ;;
      esac
    done <"$record" 2>/dev/null || continue
    local since_rank=0
    [[ "$since" =~ ^[0-9]+$ ]] && since_rank="$since"
    [[ "$since_rank" -gt "$since_best" ]] || continue
    since_best="$since_rank"
    GROVE_HOLDER_TREE="$tree"
    GROVE_HOLDER_WHAT="$what"
    GROVE_HOLDER_PID="$pid"
    GROVE_HOLDER_AGE=""
    [[ "$since" =~ ^[0-9]+$ ]] && GROVE_HOLDER_AGE=$(($(date +%s) - since))
  done
  return 0
}

######################################################################
# print the holders under a wait line, from the last snapshot
######################################################################
print_grove_holders() {
  local i glyph
  for ((i = 0; i < GROVE_BOUND; i++)); do
    glyph="├─"
    [[ $i -eq $((GROVE_BOUND - 1)) ]] && glyph="└─"
    echo "   │  │  $glyph slot.$i: ${GROVE_HOLDER_ROWS[$i]}"
  done
}

######################################################################
# print a hint for each live holder past the stale age, once per pid
######################################################################
print_grove_stale_hints() {
  local i
  for ((i = 0; i < GROVE_BOUND; i++)); do
    set_grove_holder_vars "$i"
    [[ -n "$GROVE_HOLDER_AGE" ]] || continue
    [[ "$GROVE_HOLDER_AGE" -ge "$GROVE_STALE_SECONDS" ]] || continue
    [[ "$GROVE_STALE_HINTED" != *" $GROVE_HOLDER_PID "* ]] || continue
    GROVE_STALE_HINTED="$GROVE_STALE_HINTED$GROVE_HOLDER_PID "
    echo "   │  ├─ ⚠️ slot.$i held $(get_grove_duration "$GROVE_HOLDER_AGE") — $GROVE_HOLDER_TREE · pid $GROVE_HOLDER_PID · may be hung"
    echo "   │  │  ├─ check first: pgrep -lP $GROVE_HOLDER_PID (a long suite may still be at work)"
    echo "   │  │  ├─ to free it: $(get_grove_kill_hint "$GROVE_HOLDER_PID")"
    echo "   │  │  └─ a clone may not run these; ask your human"
  done
}

######################################################################
# get the command that frees a holder's slot; names its owner when the
# holder is another user's, since a plain kill would be refused
######################################################################
get_grove_kill_hint() {
  local pid="$1" owner
  owner=$(ps -o user= -p "$pid" 2>/dev/null | tr -d ' ')
  if [[ -n "$owner" ]] && [[ "$owner" != "$(id -un)" ]]; then
    echo "kill $pid (as $owner, its owner)"
    return 0
  fi
  echo "kill $pid"
}

######################################################################
# print the fast lane when a run with no path scope waits: a path scope
# without --thorough would bypass the bound
######################################################################
print_grove_wait_tip() {
  [[ ${#PATH_PATTERNS[@]} -eq 0 ]] || return 0
  [[ "$THOROUGH" != "true" ]] || return 0
  echo "   │  ├─ tip: a path --scope skips the wait (a name:// scope alone loads every file)"
}

######################################################################
# is pid $1 an ancestor of this run? walks the ppid chain via ps
######################################################################
is_grove_ancestor() {
  local target="$1" pid="$$"
  [[ "$target" =~ ^[0-9]+$ ]] || return 1
  while [[ "$pid" =~ ^[0-9]+$ ]] && [[ "$pid" -gt 1 ]]; do
    pid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
    [[ "$pid" == "$target" ]] && return 0
  done
  return 1
}

######################################################################
# refuse a wait on a slot this run's own ancestor holds: it never frees
# .why = a nested run whose env lost the nest marker (env -i, a scrubbed
#        spawn) would otherwise wait until the harness kills it
######################################################################
set_grove_wait_refused_on_ancestor() {
  local i
  for ((i = 0; i < GROVE_BOUND; i++)); do
    set_grove_holder_vars "$i"
    is_grove_ancestor "$GROVE_HOLDER_PID" || continue
    {
      echo "   │  └─ ✋ ConstraintError: this run waits on its own ancestor"
      echo "   │     ├─ slot.$i is held by pid $GROVE_HOLDER_PID, which spawned this run"
      echo "   │     └─ fix: keep GIT_REPO_TEST_GROVE_HELD in the nested run's env, or run it outside the parent"
    } | emit_to_both
    exit 2
  done
  return 0
}

######################################################################
# snapshot each slot's holder row (tree · type · pid · age) into
# GROVE_HOLDER_ROWS; returns 1 if any slot lacks a live holder record
# .why = a holder writes its record just after its claim; a waiter that
#        lists in that gap would name each holder `?` until the next beat.
#        the list prints this snapshot, never a second read: a holder that
#        exits between check and print would otherwise read as `?` too
######################################################################
set_grove_holders_snapshot() {
  local i landed=0
  GROVE_HOLDER_ROWS=()
  for ((i = 0; i < GROVE_BOUND; i++)); do
    set_grove_holder_vars "$i"
    GROVE_HOLDER_ROWS+=("$GROVE_HOLDER_TREE · $GROVE_HOLDER_WHAT · pid $GROVE_HOLDER_PID · $(get_grove_duration "$GROVE_HOLDER_AGE")")
    [[ "$GROVE_HOLDER_PID" != "?" ]] || landed=1
  done
  return $landed
}

######################################################################
# is a heartbeat due? (pure: elapsed seconds vs the next beat)
######################################################################
is_grove_beat_due() {
  [[ "$1" -ge "$2" ]]
}

######################################################################
# print the grove branch; claim a slot, wait for one, or bypass
######################################################################
set_grove_slot() {
  # bypass: one line, no lock
  if [[ -n "$GROVE_BYPASS_REASON" ]]; then
    echo "   ├─ grove: bypass ($GROVE_BYPASS_REASON)"
    return 0
  fi

  # no flock on this host: run unbounded, and say so loud
  if ! command -v flock >/dev/null 2>&1; then
    echo "   ├─ grove: ⚠️ unbounded (flock not found; install it to bound suites: util-linux on linux, brew install flock on macos)"
    return 0
  fi

  set_grove_dir
  echo "   ├─ grove"
  echo "   │  ├─ bound: $GROVE_BOUND $(get_grove_slots_noun "$GROVE_BOUND") ($GROVE_BOUND_SOURCE)"

  # claim; while every slot is held, name the holders, poll, and beat
  local waited="false" wait_start="" beat_next=0 elapsed=0 grace=0 list_due="true"
  until set_grove_claim_once; do
    # a holder's record lands just after its claim (at the first wait, or at a
    # handover between beats): before each list, retry the claim each tenth of
    # a second until every record lands (or the grace ends), so a slot that
    # frees meanwhile is taken, never listed as `?`
    # .note = a holder with no record (an older skill version) costs the grace once per list
    if [[ "$list_due" == "true" ]] && [[ $grace -lt $GROVE_RECORD_GRACE_TRIES ]] && ! set_grove_holders_snapshot; then
      grace=$((grace + 1))
      sleep 0.1
      continue
    fi

    # grace spent: list what the holders show now (a recordless holder reads `?`)
    if [[ "$list_due" == "true" ]] && [[ $grace -ge $GROVE_RECORD_GRACE_TRIES ]]; then
      set_grove_holders_snapshot || true
    fi

    # first list: the wait line, holders, hints, and the fast lane
    if [[ "$list_due" == "true" ]] && [[ "$waited" == "false" ]]; then
      list_due="false"
      grace=0
      waited="true"
      wait_start=$(date +%s)
      beat_next=$GROVE_BEAT_SECONDS
      set_grove_wait_refused_on_ancestor
      echo "   │  ├─ ⏳ $GROVE_BOUND of $GROVE_BOUND $(get_grove_slots_noun "$GROVE_BOUND") held, wait for one"
      print_grove_holders
      print_grove_stale_hints
      print_grove_wait_tip
    fi

    # beat list: re-name the holders, so a long wait never goes silent
    # .note = the beat names its own mark (30s, 1m00s, ...), which the wait has
    #         reached; a measured age would drift with the poll
    if [[ "$list_due" == "true" ]]; then
      list_due="false"
      grace=0
      echo "   │  ├─ ⏳ still held ($(get_grove_duration "$beat_next"))"
      print_grove_holders
      print_grove_stale_hints
      beat_next=$((beat_next + GROVE_BEAT_SECONDS))
    fi

    sleep "$GROVE_POLL_SECONDS"
    elapsed=$(($(date +%s) - wait_start))
    is_grove_beat_due "$elapsed" "$beat_next" && list_due="true"
  done
  [[ "$waited" == "true" ]] && elapsed=$(($(date +%s) - wait_start))

  # record the claim and mark descendants as nested in this live slot
  set_grove_holder_record
  export GIT_REPO_TEST_GROVE_HELD="slot.$GROVE_SLOT:$$"
  if [[ "$waited" == "false" ]]; then
    echo "   │  └─ 🎫 slot.$GROVE_SLOT claimed"
    return 0
  fi
  echo "   │  └─ 🎫 slot.$GROVE_SLOT claimed after $(get_grove_duration "$elapsed")"
}
