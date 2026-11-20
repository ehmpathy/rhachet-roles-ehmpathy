#!/usr/bin/env bash
######################################################################
# .what = the public-repo text promise: one value, one visibility rule,
#         one nudge, read by every writer of pr text
#
# .why  = pr text sent to a public repo cannot be taken back: an edit keeps
#         the original in the public history. so every writer (comment, title,
#         description, push) holds its first pass with a nudge, and writes on a
#         second pass that carries --promise text-to-public-repo-is-anonymized.
#         one declaration keeps the five writers from drift
#
# usage:
#   source "$SKILL_DIR/../git/git.promise.operations.sh"
#
# .note = it lives in skills/git/, the common ancestor of the git.commit and
#         git.pull trees. each family reads visibility through its own gh
#         communicator (its own credential), then hands the answer here
#
# guarantee:
#   - no gh call and no file write: values and text transforms only (the
#     keep path forks a hasher to name a file; the gate that calls it writes)
######################################################################

# .what = the one --promise value that owns a write of text into a public repo
PROMISE_TEXT_PUBLIC="text-to-public-repo-is-anonymized"

# .what = exit 0 when the value is the public-repo text promise
# .why  = the value is the promise's words; a typo or another skill's promise
#         (e.g. bhuild's task-to-public-repo-is-anonymized) must not pass as it
is_promise_text_public() {
  [[ "$1" == "$PROMISE_TEXT_PUBLIC" ]]
}

# .what = a gh visibility answer as public | private | internal | unreadable
# .why  = rest answers lowercase, `gh repo view --json` answers uppercase; an
#         empty or unknown answer cannot prove the repo private, so it reads
#         unreadable, which holds as public
as_repo_visibility() {
  # tr, not ${1,,}: the stock macos bash (3.2) lacks case transforms
  local raw
  raw="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
  case "$raw" in
    public | private | internal) echo "$raw" ;;
    *) echo "unreadable" ;;
  esac
}

# .what = exit 0 when a write into a repo of this visibility needs no promise
# .why  = only a repo whose audience is not the world passes ungated; public
#         and unreadable both hold (an unreadable read never writes unchecked)
is_repo_visibility_ungated() {
  [[ "$1" == "private" || "$1" == "internal" ]]
}

# .what = the repo line's label for a visibility
# .why  = an unreadable read is held as public; the label says so, so a caller
#         never believes a private repo turned public
as_repo_visibility_label() {
  case "$1" in
    public | private | internal) echo "$1" ;;
    *) echo "visibility unreadable, held as public" ;;
  esac
}

# .what = the caller's rerun line: the command plus the promise, piped again if piped
# .note = cmd = the caller's own argv, rendered; pipe = a prefix, empty unless the
#         text came via @stdin; note = a tail, empty or the "pipe the same text
#         in again" note
# usage: as_cmd_with_promise_text_public cmd="<line>" [pipe="<prefix>"] [note="<tail>"]
as_cmd_with_promise_text_public() {
  local cmd="" pipe="" note="" arg
  for arg in "$@"; do
    case "$arg" in
      cmd=*) cmd="${arg#cmd=}" ;;
      pipe=*) pipe="${arg#pipe=}" ;;
      note=*) note="${arg#note=}" ;;
    esac
  done
  printf '%s%s --promise %s%s' "$pipe" "$cmd" "$PROMISE_TEXT_PUBLIC" "$note"
}

# .what = the path a held @stdin text is kept at, for its rerun to pipe back in:
#         ./.temp/<name>.<sha8>.md, named by the text's own digest
# .why  = one slot per text: two held runs from one cwd never share a file, so
#         a rerun pipes the exact text it held, never a later run's unchecked text
# usage: as_text_keep_path name=<reply|title|body|commit> text="<text>"
as_text_keep_path() {
  local name="" text="" arg digest
  for arg in "$@"; do
    case "$arg" in
      name=*) name="${arg#name=}" ;;
      text=*) text="${arg#text=}" ;;
    esac
  done
  # linux ships sha256sum, macos ships shasum; either gives one digest
  if command -v sha256sum >/dev/null 2>&1; then
    digest="$(printf '%s' "$text" | sha256sum)"
  else
    digest="$(printf '%s' "$text" | shasum -a 256)"
  fi
  printf './.temp/%s.%s.md' "$name" "${digest:0:8}"
}

# .what = one arg as a shell word a human can read and paste: bare when plain,
#         else in single quotes (an inner ' closes, escapes, and reopens)
# .why  = printf %q pastes, yet reads as `feat\(reef\):\ map`; a hint is for a human.
#         the one copy for the pull and commit families; both source this file
as_shell_word() {
  local arg="$1" q="'"
  if [[ "$arg" =~ ^[A-Za-z0-9_./:@=+,%-]+$ ]]; then
    printf '%s' "$arg"
    return 0
  fi
  printf "'%s'" "${arg//$q/$q\\$q$q}"
}

# .what = a command line from its head and the caller's argv; rhachet's
#         passthrough args (--repo, --role, --skill and their values) dropped
# .why  = the caller pastes it back as is; rhx adds the passthrough args itself
# .note = args: the head (e.g. "rhx git.commit.push"), then the argv words
as_shell_cmd_without_passthrough() {
  local cmd="$1" skip="false" arg
  shift
  for arg in "$@"; do
    [[ "$skip" == "true" ]] && { skip="false"; continue; }
    [[ "$arg" == "--repo" || "$arg" == "--role" || "$arg" == "--skill" ]] && { skip="true"; continue; }
    cmd="$cmd $(as_shell_word "$arg")"
  done
  printf '%s' "$cmd"
}

# .what = the soft nudge a write into a public repo shows before its promise
# .why  = the check is concrete only when the caller is told what to look for,
#         in the text this skill sends, and the exact line that continues
# .note = subject = the phrase for the text this skill sends (e.g. "the comment
#         holds"); cause = why an unreadable read failed (may be empty)
# usage: as_promise_nudge repo= visibility= subject= rerun= [cause=]
as_promise_nudge() {
  local repo="" visibility="" subject="" rerun="" cause="" arg
  for arg in "$@"; do
    case "$arg" in
      repo=*) repo="${arg#repo=}" ;;
      visibility=*) visibility="${arg#visibility=}" ;;
      subject=*) subject="${arg#subject=}" ;;
      rerun=*) rerun="${arg#rerun=}" ;;
      cause=*) cause="${arg#cause=}" ;;
    esac
  done
  echo "🐢 hold up — this text goes to a public repo"
  echo "   ├─ repo: $repo ($(as_repo_visibility_label "$visibility"))"
  [[ "$visibility" != "public" && -n "$cause" ]] && echo "   │  └─ cause: $cause"
  echo "   ├─ check $subject none of"
  echo "   │  ├─ a private org, repo, route path, or pr / issue numbers"
  echo "   │  ├─ internal endpoint, service, table or product names"
  echo "   │  └─ customer, revenue or other business detail"
  echo "   └─ once checked, rerun with"
  echo "      └─ $rerun"
}
