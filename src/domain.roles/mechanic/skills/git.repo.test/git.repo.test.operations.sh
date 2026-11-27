#!/usr/bin/env bash
######################################################################
# .what = bound operations for git.repo.test: run a suite under a time
#         bound, on any host, and take the whole suite down at the bound
#
# .why  = a suite past its bound holds a seat and a core. the bound must
#         hold on linux (gnu timeout), macos + coreutils (gtimeout), and
#         stock macos (no fuse tool), and must reach every child process,
#         or the cut frees no core
#
# usage:
#   source git.repo.test.operations.sh
#   is_bound_valid "$TIMEOUT" || ...
#   trap 'stop_bounded_run; exit 130' INT        # a caller's abort reaches the suite
#   run_bounded 420 npm run test:unit || rc=$?
#   case "$BOUND_OUTCOME" in ended|fired|broken) ... ;; esac
#
# .note = run_bounded reports through globals (BOUND_OUTCOME, BOUND_PGID), so call
#         it in the current shell, never inside `$(...)` or a pipeline
# .note = callers run it as `run_bounded … || rc=$?`, where bash turns `set -e` off
#         for the whole call, so every guard in this file is explicit
######################################################################

# .what = the max bound, in seconds, for the whole of any call
# .why  = a suite past 7 minutes holds a crew seat and a box core; no call may
#         run longer, so --timeout may narrow the bound but never widen it
GIT_REPO_TEST_BOUND_MAX=420

# .what = the bound, in seconds, for a call with no --timeout: the max
GIT_REPO_TEST_BOUND_DEFAULT="$GIT_REPO_TEST_BOUND_MAX"

# .what = grace, in seconds, between TERM and KILL once the bound fires
GIT_REPO_TEST_BOUND_GRACE=10

# .what = slack, in seconds, a caller's own clock needs past the bound, per run
# .why  = the cut's grace (GIT_REPO_TEST_BOUND_GRACE) plus the work outside the
#         bound: keyrack unlock and scope preview before it, log writes after it
GIT_REPO_TEST_BOUND_CLOCK_SLACK=30

# .what = set by run_bounded: how the run ended
#   ended  = the suite ended by itself; its own exit code stands
#   fired  = the bound cut the suite short (exit 124)
#   broken = the fuse could not hold or run the suite (exit 1)
BOUND_OUTCOME=ended

# .what = the process group of the run in flight, for stop_bounded_run; empty when none
BOUND_PGID=""

# .what = the private marker dir of the run in flight; empty when none
BOUND_MARKS=""

# .what = the watchdog of the run in flight (stock macos path only); empty when none
BOUND_WATCHDOG=""

# .what = grace, in seconds, between TERM and KILL when a caller aborts the run
# .why  = an abort must free the seat at once; the cut's longer grace serves a
#         suite that has time to clean up, an abort does not wait for that
GIT_REPO_TEST_ABORT_GRACE=1

######################################################################
# .what = whether a --timeout value is a bound this skill can read
# .why  = the skill appends `s`, so `5m` would become `5ms`; only whole
#         positive seconds pass
######################################################################
is_bound_valid() {
  [[ "${1:-}" =~ ^[1-9][0-9]*$ ]]
}

######################################################################
# .what = whether a valid --timeout value sits above the max
# .why  = the max holds for every call; a wider bound is refused at parse
######################################################################
is_bound_above_max() {
  [[ "${1}" -gt "$GIT_REPO_TEST_BOUND_MAX" ]]
}

######################################################################
# .what = the bound as one label: `420s (default)` or `120s (--timeout)`
# .why  = the bound and its source are one object (domain.terms/bound.md);
#         one transformer keeps its three renders alike
######################################################################
get_bound_label() {
  echo "${1}s (${2})"
}

######################################################################
# .what = the seconds a caller's own clock must outlast, for a call of N runs
# .why  = the bound holds for the whole call, so the suites share it; each run
#         adds only its slack, the work outside the bound
# usage: get_bound_shell_clock <seconds> <runs>
######################################################################
get_bound_shell_clock() {
  echo "$(( ${1} + ${2} * GIT_REPO_TEST_BOUND_CLOCK_SLACK ))"
}

######################################################################
# .what = the seconds a call has left of its bound, since it began
# .why  = the bound holds for the whole call; each type in turn gets only
#         what the types before it left
# usage: get_bound_left <seconds> <started_at_epoch>
######################################################################
get_bound_left() {
  echo "$(( ${1} - ($(date +%s) - ${2}) ))"
}

######################################################################
# .what = whether a gnu timeout exit code means the fuse cut the run
# .why  = 124 = TERM at the bound; 137 = KILL after the grace (128 + 9)
######################################################################
is_bound_fuse_cut_code() {
  [[ "${1:-}" == "124" || "${1:-}" == "137" ]]
}

######################################################################
# .what = whether a fuse tool is on PATH and takes the flags run_bounded passes
# .why  = a non-gnu `timeout` (busybox, as on alpine) rejects --kill-after; a
#         run must fall through to the next fuse, never fail on that alone
# .note = the probe runs a no-op `bash -c` under the exact flag shape the run
#         uses, in milliseconds
######################################################################
is_bound_fuse_able() {
  command -v "$1" >/dev/null 2>&1 || return 1
  "$1" --kill-after=1s 1s bash -c : >/dev/null 2>&1
}

######################################################################
# .what = write a fault block (read from stdin) where the run's stderr goes
# .why  = with --stderr, the caller reads the suite's stderr log to explain a
#         failure; a bound fault must land there too, after the run's own output
# .note = bash builtins only: a host minimal enough to lack a fuse may lack cat
# usage: { echo "💥 ..."; } | emit_bound_fault <stderr-path-or-empty>
######################################################################
emit_bound_fault() {
  local line
  if [[ -n "$1" ]]; then
    while IFS= read -r line; do echo "$line"; done >>"$1"
    return 0
  fi
  while IFS= read -r line; do echo "$line"; done >&2
}

######################################################################
# .what = the fuse tool this host offers: timeout | gtimeout | watchdog
# .why  = stock macos has no `timeout`, and coreutils names it `gtimeout`;
#         a run must never fail only because the fuse tool is absent or not gnu
######################################################################
get_bound_fuse() {
  if is_bound_fuse_able timeout; then
    echo "timeout"
    return
  fi
  if is_bound_fuse_able gtimeout; then
    echo "gtimeout"
    return
  fi
  echo "watchdog"
}

######################################################################
# .what = stop the run in flight, its whole process group, and drop its markers
# .why  = the fuse puts the suite in its own process group, so a caller's
#         ctrl-c or a harness kill never reaches it; the caller's INT/TERM/HUP
#         trap calls this so an abort frees the seat and the core at once
######################################################################
stop_bounded_run() {
  # the watchdog first, so it can never signal a group after this one is gone
  [[ -n "$BOUND_WATCHDOG" ]] && { kill "$BOUND_WATCHDOG" 2>/dev/null || true; }
  if [[ -n "$BOUND_PGID" ]]; then
    kill -TERM -- "-$BOUND_PGID" 2>/dev/null || true
    sleep "$GIT_REPO_TEST_ABORT_GRACE"
    kill -KILL -- "-$BOUND_PGID" 2>/dev/null || true
  fi
  [[ -n "$BOUND_MARKS" ]] && rm -rf "$BOUND_MARKS"
  BOUND_WATCHDOG=""
  BOUND_PGID=""
  BOUND_MARKS=""
}

######################################################################
# .what = exec a command with its stdout and stderr sent to the given paths
# .why  = the suite's output goes to files, while the caller's own stdout stays
#         where it was; a redirect on the run_bounded call itself would move the
#         caller's fd 1 for the whole call, abort trap included
# .note = an empty path inherits that stream. call it in a subshell: it execs
# usage: exec_with_stdio <stdout-path> <stderr-path> <cmd> [arg...]
######################################################################
exec_with_stdio() {
  local out="$1"
  local err="$2"
  shift 2
  [[ -n "$out" ]] && exec >"$out"
  [[ -n "$err" ]] && exec 2>"$err"
  exec "$@"
}

######################################################################
# .what = run a command under a bound; its whole process group dies at the bound
# .why  = one call that bounds a suite on any host, and tells a cut apart from
#         a suite that failed by itself, so the caller can name the owner
# .note = sets BOUND_OUTCOME; returns the command's own exit code (124 when the
#         bound fired, 1 when the fuse broke). stdin is /dev/null: a suite never
#         reads the terminal, so a tty can never stall it
# .note = --stdout / --stderr send the suite's streams to files; with neither,
#         the suite inherits the caller's. the caller's own fds never move
# usage: run_bounded [--stdout <path>] [--stderr <path>] <seconds> <cmd> [arg...]
#        (the bound leads the command, as gnu timeout and nice take theirs)
######################################################################
run_bounded() {
  local out="" err=""
  while [[ "${1:-}" == "--stdout" || "${1:-}" == "--stderr" ]]; do
    [[ "$1" == "--stdout" ]] && out="$2"
    [[ "$1" == "--stderr" ]] && err="$2"
    shift 2
  done
  local seconds="$1"
  shift
  local fuse rc=0
  fuse=$(get_bound_fuse)
  BOUND_OUTCOME=ended

  # the markers need a private dir; with none, no run can be read, so none starts
  BOUND_MARKS="$(mktemp -d)" || BOUND_MARKS=""
  if [[ -z "$BOUND_MARKS" ]]; then
    {
      echo "💥 MalfunctionError: the bound could not make its marker dir"
      echo "   └─ why: \`mktemp -d\` failed, so no run could be read; none started"
      echo ""
      echo "🥥 did you know?"
      echo "   └─ check the temp dir with: mktemp -d"
    } | emit_bound_fault "$err"
    BOUND_OUTCOME=broken
    return 1
  fi

  # watchdog: the host has no fuse tool
  if [[ "$fuse" == "watchdog" ]]; then
    run_bounded_via_watchdog "$out" "$err" "$seconds" "$@" || rc=$?
    rm -rf "$BOUND_MARKS"
    BOUND_MARKS=""
    return $rc
  fi

  # gnu timeout puts itself and the suite in their own process group, and signals
  # that group at the bound, so every child of the run dies with it
  # .note = the wrapper notes `started` before the suite and `ended` (with the
  #         suite's own code) after it, in a private `mktemp -d` dir. a run with no
  #         `started` never reached the suite; one with no `ended` was cut short
  # .note = launched in the background and awaited, so a caller's trap can fire
  #         mid-run (bash defers traps until a foreground command returns)
  # .note = the subshell execs into the fuse, so $! is the fuse's own pid
  # shellcheck disable=SC2016
  (
    exec_with_stdio "$out" "$err" \
      "$fuse" --kill-after="${GIT_REPO_TEST_BOUND_GRACE}s" "${seconds}s" \
      bash -c ': > "$1/started" || exit 125; "${@:2}"; rc=$?; echo $rc > "$1/ended"; exit $rc' \
      _ "$BOUND_MARKS" "$@"
  ) </dev/null &
  BOUND_PGID=$!
  wait "$BOUND_PGID" || rc=$?
  BOUND_PGID=""

  # read the outcome from the markers; its code is the one to report
  local code=0
  get_bound_outcome_after_fuse "$rc" "$fuse" "$err" || code=$?
  rm -rf "$BOUND_MARKS"
  BOUND_MARKS=""
  return $code
}

######################################################################
# .what = read how a gnu-fuse run ended, from its markers and the fuse's code
# .why  = the fuse's own code cannot tell a suite that exited 124 from a cut,
#         nor a fuse that never ran the suite from a suite that failed; the
#         markers can
# .note = sets BOUND_OUTCOME; returns the code the caller should report
######################################################################
get_bound_outcome_after_fuse() {
  local rc="$1"
  local fuse="$2"
  local err="$3"

  # the suite ended by itself: its own exit code stands
  if [[ -f "$BOUND_MARKS/ended" ]]; then
    BOUND_OUTCOME=ended
    return "$(cat "$BOUND_MARKS/ended")"
  fi

  # the suite started and the fuse cut it short
  if [[ -f "$BOUND_MARKS/started" ]] && is_bound_fuse_cut_code "$rc"; then
    BOUND_OUTCOME=fired
    return 124
  fi

  # the suite never started: the fuse failed (125/126/127, or a fuse that
  # rejects our flags) — never the suite's verdict
  if [[ ! -f "$BOUND_MARKS/started" ]]; then
    {
      echo "💥 MalfunctionError: the bound could not run the suite"
      echo "   └─ why: \`$fuse\` exited $rc before the suite ran, so no suite verdict exists"
      echo ""
      echo "🥥 did you know?"
      echo "   └─ check the fuse with: $fuse --kill-after=1s 1s bash -c :"
    } | emit_bound_fault "$err"
    BOUND_OUTCOME=broken
    return 1
  fi

  # the suite started, then ended with no note and no cut: a signal from outside
  # the fuse (e.g. ctrl-c); that code passes through as the run's own end
  BOUND_OUTCOME=ended
  return "$rc"
}

######################################################################
# .what = the bound via a bash watchdog, for a host with no fuse tool
# .why  = job control gives the run its own process group, so the watchdog
#         can signal the whole tree with no setsid (absent on macos)
######################################################################
run_bounded_via_watchdog() {
  local out="$1"
  local err="$2"
  local seconds="$3"
  shift 3
  local pid pgid watchdog rc=0

  # start the run as its own process group
  # .note = job control is on for this one launch only: a background launch cannot
  #         fail, so naught can run between the two toggles. the subshell execs
  #         into the command, so $! is the run's own pid
  set -m
  ( exec_with_stdio "$out" "$err" "$@" ) </dev/null &
  pid=$!
  set +m
  BOUND_PGID="$pid"

  # the group must be the run's own, or a signal to it would miss the run
  # .note = an empty pgid means the run already ended; naught to hold. `ps` exits 1
  #         for a pid that is gone; `|| true` states that this is the expected
  #         case, not a fault, should this op ever be called outside a `||` list
  pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ' || true)
  if [[ -n "$pgid" && "$pgid" != "$pid" ]]; then
    kill -KILL "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    BOUND_PGID=""
    {
      echo "💥 MalfunctionError: the bound could not take hold of the run"
      echo "   ├─ why: the run got process group $pgid, not its own ($pid); a cut would miss its children"
      echo "   └─ note: the run's leader ($pid) is stopped; any child it had already started may still run, in group $pgid"
      echo ""
      echo "🥥 did you know?"
      echo "   ├─ install gnu coreutils, and the bound uses gtimeout instead of this watchdog"
      echo "   └─ find leftovers with: ps -o pid,pgid,args -g $pgid"
    } | emit_bound_fault "$err"
    BOUND_OUTCOME=broken
    return 1
  fi

  # watchdog: sleep the bound, mark the fire, TERM the group, KILL it after the grace
  # .note = it holds no stdio and takes its sleep down when stopped, so no orphan
  #         sleep holds a caller's pipe open
  (
    nap=""
    trap '[[ -n "$nap" ]] && kill "$nap" 2>/dev/null; exit 0' TERM
    sleep "$seconds" &
    nap=$!
    wait "$nap" || exit 0
    touch "$BOUND_MARKS/fired"
    kill -TERM -- "-$pid" 2>/dev/null
    sleep "$GIT_REPO_TEST_BOUND_GRACE" &
    nap=$!
    wait "$nap" || exit 0
    kill -KILL -- "-$pid" 2>/dev/null
  ) </dev/null >/dev/null 2>&1 &
  watchdog=$!
  BOUND_WATCHDOG="$watchdog"

  # await the run, then stand the watchdog down
  wait "$pid" || rc=$?
  kill "$watchdog" 2>/dev/null || true
  wait "$watchdog" 2>/dev/null || true
  BOUND_WATCHDOG=""
  BOUND_PGID=""

  # on a fire, no member of the group may outlive the leader
  # .note = the group may already be gone; a kill that finds no target is the expected case
  if [[ -f "$BOUND_MARKS/fired" ]]; then
    kill -KILL -- "-$pid" 2>/dev/null || true
    BOUND_OUTCOME=fired
    rc=124
  fi
  return $rc
}
