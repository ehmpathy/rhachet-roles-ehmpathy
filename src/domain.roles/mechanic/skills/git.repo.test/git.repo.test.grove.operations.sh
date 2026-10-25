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
#   set_grove_plan      # before the tree header; may exit 2 on bad input
#   set_grove_slot      # inside the tree; prints the grove branch, claims
#
# guarantee:
#   - pool dir = $GIT_REPO_TEST_SLOTS_DIR, else /run/lock/rhachet/git.repo.test
#   - bound    = $GIT_REPO_TEST_SLOTS, else max(1, cores / 6)
#   - the slot lock lives on fd 9 of this process alone. the suite and the
#     timer launch with 9>&-; the --listTests subshells run `exec 9>&-`
#     first. so the slot frees the instant this pid dies. short tools (git,
#     date) inherit fd 9 for their milliseconds of life
#   - a holder record (slot.N.holder) is display text; the lock is truth
#   - the waiter never kills a holder; it names a stale one and the fix
#   - bypass: non-jest types, scoped runs without --thorough, and runs
#     nested inside a run that already holds a slot
######################################################################

GROVE_DIR_DEFAULT="/run/lock/rhachet/git.repo.test"
GROVE_CORES_PER_SLOT=6
GROVE_POLL_SECONDS=1
GROVE_BEAT_SECONDS=30
GROVE_STALE_SECONDS=1800

GROVE_BYPASS_REASON=""
GROVE_BOUND=""
GROVE_BOUND_SOURCE=""
GROVE_DIR=""
GROVE_SLOT=""
GROVE_STALE_HINTED=" "

######################################################################
# get the reason this run bypasses the bound, or empty if bounded
######################################################################
get_grove_bypass_reason() {
  # quick checks are not jest suites; a lint must never queue behind a suite
  if [[ "$WHAT" == "types" ]] || [[ "$WHAT" == "format" ]] || [[ "$WHAT" == "lint" ]]; then
    echo "not a jest suite"
    return 0
  fi

  # a run spawned inside a held slot is already counted by that slot
  if [[ -n "${GIT_REPO_TEST_GROVE_HELD:-}" ]]; then
    echo "nested in a held slot"
    return 0
  fi

  # a scoped run is small by construction; --thorough makes it full again
  if [[ ${#SCOPES[@]} -gt 0 ]] && [[ "$THOROUGH" != "true" ]]; then
    echo "scoped run"
    return 0
  fi

  echo ""
}

######################################################################
# get the core count of this box (linux, then posix, then macos)
######################################################################
get_grove_cores() {
  nproc 2>/dev/null || getconf _NPROCESSORS_ONLN 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1
}

######################################################################
# get a duration as 47s or 4m03s
######################################################################
get_grove_duration() {
  local seconds="$1"
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
  if [[ "$GROVE_BOUND" -lt 1 ]]; then
    GROVE_BOUND=1
  fi
  GROVE_BOUND_SOURCE="$cores cores ÷ $GROVE_CORES_PER_SLOT"
}

######################################################################
# set the pool dir; create it shared (1777) when absent, as after reboot
# exits 1 when the dir cannot be created or written
######################################################################
set_grove_dir() {
  GROVE_DIR="${GIT_REPO_TEST_SLOTS_DIR:-$GROVE_DIR_DEFAULT}"

  # create the pool, open to every user of the box
  if [[ ! -d "$GROVE_DIR" ]]; then
    (umask 000 && mkdir -p "$GROVE_DIR") 2>/dev/null || true
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
# try once to claim any free slot; on success the lock sits on fd 9
######################################################################
set_grove_claim_once() {
  local i file
  for ((i = 0; i < GROVE_BOUND; i++)); do
    file="$GROVE_DIR/slot.$i.lock"

    # create the slot file open to every user
    if [[ ! -e "$file" ]]; then
      (umask 000 && : >>"$file") 2>/dev/null || true
    fi

    # fail loud on a slot no one can lock: a silent skip could wait forever
    if [[ ! -w "$file" ]]; then
      {
        echo "   │  └─ 💥 MalfunctionError: grove slot file is not writable"
        echo "   │     ├─ file: $file"
        echo "   │     └─ fix: chmod 666 it, or remove it so the next run recreates it"
      } | emit_to_both
      exit 1
    fi

    # flock -n is atomic in the kernel: of two claimants, exactly one wins
    exec 9>>"$file"
    if flock -n 9; then
      GROVE_SLOT="$i"
      return 0
    fi
    exec 9>&-
  done
  return 1
}

######################################################################
# set the holder record for the claimed slot (display only)
# .note = a failed write is tolerated: waiters then show `?` for this
#         holder, and the lock, which is the truth, is already held
######################################################################
set_grove_holder_record() {
  local record="$GROVE_DIR/slot.$GROVE_SLOT.holder"
  (
    umask 000
    printf 'tree=%s\nwhat=%s\npid=%s\nsince=%s\n' \
      "$(basename "$REPO_ROOT")" "$WHAT" "$$" "$(date +%s)" >"$record"
  ) 2>/dev/null || true
}

######################################################################
# set GROVE_HOLDER_{TREE,WHAT,PID,AGE} from slot N's holder record
######################################################################
set_grove_holder_vars() {
  local record="$GROVE_DIR/slot.$1.holder"
  local since="" key value
  GROVE_HOLDER_TREE="?"
  GROVE_HOLDER_WHAT="?"
  GROVE_HOLDER_PID="?"
  GROVE_HOLDER_AGE=0
  if [[ -f "$record" ]]; then
    while IFS='=' read -r key value; do
      case "$key" in
        tree) GROVE_HOLDER_TREE="$value" ;;
        what) GROVE_HOLDER_WHAT="$value" ;;
        pid) GROVE_HOLDER_PID="$value" ;;
        since) since="$value" ;;
      esac
    done <"$record"
  fi
  if [[ "$since" =~ ^[0-9]+$ ]]; then
    GROVE_HOLDER_AGE=$(($(date +%s) - since))
  fi
}

######################################################################
# print the holders under the wait line: tree · type · pid · age
######################################################################
print_grove_holders() {
  local i glyph
  for ((i = 0; i < GROVE_BOUND; i++)); do
    glyph="├─"
    [[ $i -eq $((GROVE_BOUND - 1)) ]] && glyph="└─"
    set_grove_holder_vars "$i"
    echo "   │  │  $glyph slot.$i: $GROVE_HOLDER_TREE · $GROVE_HOLDER_WHAT · pid $GROVE_HOLDER_PID · $(get_grove_duration "$GROVE_HOLDER_AGE")"
  done
}

######################################################################
# print a hint for each holder past the stale age, once per pid
######################################################################
print_grove_stale_hints() {
  local i
  for ((i = 0; i < GROVE_BOUND; i++)); do
    set_grove_holder_vars "$i"
    if [[ "$GROVE_HOLDER_AGE" -lt "$GROVE_STALE_SECONDS" ]]; then
      continue
    fi
    if [[ "$GROVE_STALE_HINTED" == *" $GROVE_HOLDER_PID "* ]]; then
      continue
    fi
    GROVE_STALE_HINTED="$GROVE_STALE_HINTED$GROVE_HOLDER_PID "
    echo "   │  ├─ ⚠️ slot.$i held $(get_grove_duration "$GROVE_HOLDER_AGE") — $GROVE_HOLDER_TREE · pid $GROVE_HOLDER_PID · may be hung"
    echo "   │  │  └─ to free it: kill $GROVE_HOLDER_PID"
  done
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
    echo "   ├─ grove: ⚠️ unbounded (flock not found; install util-linux to bound suites)"
    return 0
  fi

  set_grove_dir
  echo "   ├─ grove"
  echo "   │  ├─ bound: $GROVE_BOUND $(get_grove_slots_noun "$GROVE_BOUND") ($GROVE_BOUND_SOURCE)"

  # claim at once when a slot is free
  if set_grove_claim_once; then
    set_grove_holder_record
    export GIT_REPO_TEST_GROVE_HELD="slot.$GROVE_SLOT"
    echo "   │  └─ 🎫 slot.$GROVE_SLOT claimed"
    return 0
  fi

  # wait: name the holders once, then poll; a heartbeat proves liveness
  echo "   │  ├─ ⏳ $GROVE_BOUND of $GROVE_BOUND $(get_grove_slots_noun "$GROVE_BOUND") held, wait for one"
  print_grove_holders
  print_grove_stale_hints
  local wait_start beat_next elapsed
  wait_start=$(date +%s)
  beat_next=$GROVE_BEAT_SECONDS
  while true; do
    sleep "$GROVE_POLL_SECONDS"
    if set_grove_claim_once; then
      set_grove_holder_record
      export GIT_REPO_TEST_GROVE_HELD="slot.$GROVE_SLOT"
      elapsed=$(($(date +%s) - wait_start))
      echo "   │  └─ 🎫 slot.$GROVE_SLOT claimed after $(get_grove_duration "$elapsed")"
      return 0
    fi
    elapsed=$(($(date +%s) - wait_start))
    if [[ "$elapsed" -ge "$beat_next" ]]; then
      echo "   │  ├─ ⏳ still held ($(get_grove_duration "$elapsed"))"
      print_grove_stale_hints
      beat_next=$((beat_next + GROVE_BEAT_SECONDS))
    fi
  done
}
