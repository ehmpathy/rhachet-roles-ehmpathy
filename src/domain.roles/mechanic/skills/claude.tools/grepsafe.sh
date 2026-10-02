#!/usr/bin/env bash
######################################################################
# .what = safe content search within git repo
#
# .why  = enables regex search without triggering claude code's
#         suspicious syntax heuristic on pipe characters and
#         regex alternation patterns like (paddleOut|wipeout).
#
#         rg sits behind named args, so the regex pattern is a
#         quoted string arg to rhachet — invisible to claude
#         code's bash parser.
#
# usage:
#   grepsafe.sh --pattern 'paddleOut|wipeout'                          # search cwd
#   grepsafe.sh --pattern 'paddleOut|wipeout' --path src/              # search dir
#   grepsafe.sh --pattern 'paddleOut|wipeout' --path src --path test   # search both
#   cmd | grepsafe.sh --pattern 'paddleOut|wipeout'                    # search piped text
#   grepsafe.sh --pattern 'paddleOut|wipeout' --glob '*.ts'            # filter files
#   grepsafe.sh --pattern 'paddleOut|wipeout' --glob 'src/**/*.ts'     # name a subtree
#   grepsafe.sh --pattern 'paddleOut|wipeout' --context 3              # context lines
#   grepsafe.sh --pattern 'paddleOut|wipeout' --files-only             # file paths only
#   grepsafe.sh --pattern 'paddleOut|wipeout' --count                  # match counts
#   grepsafe.sh --pattern 'paddleOut|wipeout' -i                       # case insensitive
#   grepsafe.sh --pattern 'paddleOut|wipeout' --head 20                # first 20 rows
#   grepsafe.sh --pattern 'paddleOut|wipeout' --tail 20                # last 20 rows
#   grepsafe.sh --pattern 'paddleOut|wipeout' --type ts                # file type filter
#   grepsafe.sh --pattern 'paddleOut|wipeout' --multiline              # multiline match
#   grepsafe.sh --pattern 'paddleOut|wipeout' --output pipeable        # pipe-friendly output
#
# guarantee:
#   - every search root must be within repo — the --path root and the root a
#     --glob prefix names alike; a '..' or a '/' prefix is refused
#   - searches with rg (ripgrep) only — one engine, no fallback
#   - failfast when rg is absent; never a silent 0
#   - a NAMED path (--path, or a --glob whose literal prefix is a real dir)
#     lifts --hidden, the ignore rules, and symlink skips, scoped to that
#     root. a glob with no literal prefix ('**/*.md') names no path
#   - a tree merely met on the walk keeps its default skips; vibes output
#     names the hidden files it skipped that hold a match
#   - every --path is searched. a bare positional root stands alone
#   - piped text is searched as the subject; beside a named file set it is
#     refused, never silently dropped
#   - vibes output names the engine and the kind of every zero
#   - fail-fast on errors
#
# streams:
#   - vibes (default): every warn reaches both stdout and stderr, so a caller
#     that reads both sees each twice. a lost warn is the worse outcome
#   - pipeable: stdout holds results only; every warn goes to stderr
######################################################################
set -euo pipefail

# get skill directory to load output.sh
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"

######################################################################
# parse arguments
######################################################################
PATTERN=""
GLOB=""
FILE_TYPE=""
CONTEXT=""
FILES_ONLY=false
COUNT=false
CASE_INSENSITIVE=false
HEAD_LIMIT=""
TAIL_LIMIT=""
MULTILINE=false
OUTPUT_MODE="vibes"
FROM=""
# the first unknown flag, refused after the parse loop settles OUTPUT_MODE
UNKNOWN_FLAG=""
# every search root, in the order typed. a positional root is flagged: it may
# stand alone, never beside another root
SEARCH_PATHS=()
ROOT_POSITIONAL=false

######################################################################
# emit
######################################################################

# .what = render a refusal on the streams its output mode permits
# .why  = the stream choice lives in output.sh; this binds it to OUTPUT_MODE
# .note = pipeable refusals go to stderr only (see emit_refusal_to_streams);
#         three tests clamp it
emit_refusal() {
  local vibes="$1" # the human's frame — tree glyphs, turtle phrase
  local plain="$2" # the machine's text — no glyphs, stderr only
  emit_refusal_to_streams --mode "$OUTPUT_MODE" --vibes "$vibes" --plain "$plain"
}

# .what = render a refusal in the house frame, its remedy under the 🥥
# .why  = `rule.require.coconut-hints`: the eye finds the fix first.
#         pipeable keeps a glyph-free `fix:` prefix a caller can grep
emit_refusal_with_hint() {
  local diagnosis="$1"  # the fault — headline, then one detail per line
  local affordance="$2" # what the caller MAY do, in plain words
  local command="$3"    # the exact next command, copy-pasteable
  # pipeable headline: defaults to the human line with `error:` -> `grepsafe:`,
  # so every refusal on the piped stream carries one prefix
  local diagnosis_pipeable="${4:-${1/#error:/grepsafe:}}"
  emit_refusal \
    "$(print_refusal_frame --skill grepsafe --diagnosis "$diagnosis" \
      --affordance "$affordance" --command "$command")" \
    "$diagnosis_pipeable
fix: $affordance — $command"
}

# .what = a path-gate refusal — one body, two stream labels, one remedy
# .why  = the three path gates share one body, so the two arms cannot drift
# .note = the rg-absent failfast is not here: its two headlines differ in
#         substance, not just label
emit_path_refusal() {
  local body="$1"       # the fault, with no stream label
  local affordance="$2" # what the caller MAY do
  local command="$3"    # the exact next command
  emit_refusal_with_hint "error: $body" "$affordance" "$command" "grepsafe: $body"
}

# .what = render a body under the tree's sub-bucket, with an optional footer
# .why  = three call sites share one indent contract, so they cannot drift
print_tree_block() {
  local body="$1"
  local footer="$2"          # optional — omitted by the results block
  local is_last="${3:-true}" # does a peer follow the node this body hangs off?

  # a peer below the header (`├─`) needs a `│` continuation column.
  # both prefixes are six columns wide, so the body aligns either way
  local indent="      "
  [[ "$is_last" == "true" ]] || indent="   │  "

  echo "${indent}├─"
  echo "${indent}│"
  # an empty body renders no row: a blank row reads as a truncated reason
  if [[ -n "$body" ]]; then
    echo "$body" | while IFS= read -r line; do
      echo "${indent}│  $line"
    done
  fi
  if [[ -n "$footer" ]]; then
    echo "${indent}│"
    echo "${indent}│  $footer"
  fi
  echo "${indent}│"
  echo "${indent}└─"
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --pattern)
      PATTERN="$2"
      shift 2
      ;;
    --path)
      SEARCH_PATHS+=("$2")
      shift 2
      ;;
    --from)
      FROM="$2"
      shift 2
      ;;
    --glob)
      GLOB="$2"
      shift 2
      ;;
    --type)
      FILE_TYPE="$2"
      shift 2
      ;;
    --context|-C)
      CONTEXT="$2"
      shift 2
      ;;
    --files-only|-l)
      FILES_ONLY=true
      shift
      ;;
    --count|-c)
      COUNT=true
      shift
      ;;
    -i|--ignore-case)
      CASE_INSENSITIVE=true
      shift
      ;;
    --head)
      HEAD_LIMIT="$2"
      shift 2
      ;;
    --tail)
      TAIL_LIMIT="$2"
      shift 2
      ;;
    --multiline)
      MULTILINE=true
      shift
      ;;
    --output)
      OUTPUT_MODE="$2"
      shift 2
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      shift
      ;;
    --help|-h)
      echo "usage: grepsafe.sh --pattern 'regex' [options]"
      echo ""
      echo "options:"
      echo "  --pattern REGEX    search pattern (required)"
      echo "  --path DIR         search directory (default: .); repeat to search"
      echo "                     several"
      echo "  --from @stdin      search piped text, not files (implied when"
      echo "                     text is piped in)"
      echo "  --glob GLOB        file filter glob (e.g., '*.ts')"
      echo "  --type TYPE        file type filter (e.g., ts, py, sh)"
      echo "  --context N        context lines around matches"
      echo "  --files-only       show file paths only; wins over --count"
      echo "  --count            show match counts per file"
      echo "  -i                 case insensitive"
      echo "  --head N           limit output to N rows; the tally then reads"
      echo "                     '<files|rows|lines>: <total> (first N)', so a cut"
      echo "                     is never silent. the label names what it counts:"
      echo "                     files (--files-only|--count), rows (--context),"
      echo "                     lines otherwise"
      echo "  --tail N           keep the last N rows; the tally then reads"
      echo "                     '<label>: <total> (last N)'. not with --head"
      echo "  --multiline        let a match span lines"
      echo "  --output MODE      vibes|pipeable (default: vibes)"
      echo ""
      echo "notes:"
      echo "  to name a path opts into every skip that would hide it."
      echo "  --path, or a --glob whose leading segments are a real directory,"
      echo "  lifts --hidden and the ignore rules and follows a named symlink,"
      echo "  scoped to that root. a tree met deeper on the walk keeps its"
      echo "  default skips. a glob with no literal prefix ('**/*.md')"
      echo "  names no path."
      echo ""
      echo "  a glob reads as .gitignore reads it, relative to --path: one"
      echo "  with a slash is anchored ('docs/*.md' skips 'docs/sub/'), one"
      echo "  with none matches at any depth. each brace alternative names"
      echo "  its own root: '{src/**,.behavior/**}' walks both."
      echo ""
      echo "  a walk skips hidden paths. when a hidden file holds a match, the"
      echo "  output says so — beside a zero or beside results — and names the"
      echo "  --path that reaches it."
      echo ""
      echo "  piped text is the subject when it is present. piped text beside"
      echo "  --path, --glob, or --type names two subjects, so it is refused."
      echo ""
      echo "  rg (ripgrep) is required. with no rg, grepsafe refuses rather"
      echo "  than report a silent 0."
      echo ""
      echo "  every search root must sit within the repo. a '..' or a leading"
      echo "  '/' in --glob is refused, same as a --path outside the repo."
      echo ""
      # the only notice of this bound, in the mode most often automated
      echo "  --output pipeable renders an empty result as empty (exit 0), so"
      echo "  'no file matched the glob' and 'no line matched the pattern'"
      echo "  read alike. the vibes default names which zero it found."
      # globsafe documents the same three gates
      echo "  --output 'direct' is renamed 'pipeable'; the old value is"
      echo "  refused (exit 2) with the new name."
      echo "  --head and --tail take a positive integer of at most 18 digits;"
      echo "  any other value is refused (exit 2), never reinterpreted."
      echo "  every --path is searched. a bare positional root stands alone:"
      echo "  beside another root it is refused (exit 2), since an unquoted"
      echo "  glob the shell expanded lands there too."
      echo ""
      echo "example:"
      echo "  grepsafe.sh --pattern 'paddleOut|wipeout' --glob 'src/**/*.ts'"
      exit 0
      ;;
    --*)
      # record, don't refuse: a later `--output` may still change the stream.
      # parse continues; the first unknown flag is refused after the loop
      [[ -z "$UNKNOWN_FLAG" ]] && UNKNOWN_FLAG="$1"
      shift
      ;;
    *)
      # positional #1 is the pattern; every later one is a root, flagged so
      # the validate step can refuse it beside another root
      if [[ -z "$PATTERN" ]]; then
        PATTERN="$1"
        shift
        continue
      fi
      SEARCH_PATHS+=("$1")
      ROOT_POSITIONAL=true
      shift
      ;;
  esac
done

######################################################################
# validate
######################################################################

# an unknown flag, refused first now that OUTPUT_MODE is settled
if [[ -n "$UNKNOWN_FLAG" ]]; then
  emit_refusal_with_hint "error: unknown option: $UNKNOWN_FLAG
usage: grepsafe.sh --pattern 'regex' [--path dir] [--glob '*.ts']" \
    "see the full flag list" \
    "grepsafe.sh --help"
  exit 2
fi

# a positional root stands alone. beside another root it is most likely an
# unquoted glob the shell expanded ('--glob *.md' => 'a.md b.md'), and a search
# of it would widen the walk in silence. the refusal names the first two roots
if [[ "$ROOT_POSITIONAL" == true && ${#SEARCH_PATHS[@]} -gt 1 ]]; then
  emit_refusal_with_hint "error: the search root was named twice
  first: ${SEARCH_PATHS[0]}
  then:  ${SEARCH_PATHS[1]}" \
    "name each root with --path; a bare positional root stands alone" \
    "grepsafe.sh --pattern 'paddleOut' --path src --path test"
  exit 2
fi

# the retired value `direct` gets its own arm: the generic refusal below would
# read as a typo, where the truth is a rename with a known replacement
if [[ "$OUTPUT_MODE" == "direct" ]]; then
  emit_refusal_with_hint "error: --output direct was renamed to pipeable
  got: direct" \
    "pass --output pipeable — same behavior, current name" \
    "grepsafe.sh --pattern 'paddleOut' --output pipeable"
  exit 2
fi

# validate output mode. an unknown mode refuses on both streams (vibes arm)
if [[ "$OUTPUT_MODE" != "vibes" && "$OUTPUT_MODE" != "pipeable" ]]; then
  emit_refusal_with_hint "error: --output must be one of: vibes, pipeable
  got: $OUTPUT_MODE" \
    "name one of the two modes, or omit --output for vibes" \
    "grepsafe.sh --pattern 'paddleOut' --output pipeable"
  exit 2
fi

# validate --head is a positive integer of at most 18 digits
# .why = raw bash consumes HEAD_LIMIT, so rg never validates it. a bad value
#        must exit 2, not fail inside `head` at exit 1.
#        a negative is worse: GNU `head -n -5` means "all but the last 5",
#        a silent wrong answer. 19+ digits wrap negative in bash arithmetic
#        (max 9223372036854775807), which reads as a false zero.
#        `0` is refused: zero rows would read as a search that found zero.
if [[ -n "$HEAD_LIMIT" ]] && ! [[ "$HEAD_LIMIT" =~ ^0*[1-9][0-9]{0,17}$ ]]; then
  emit_refusal_with_hint "error: --head must be a positive integer of at most 18 digits
  got: $HEAD_LIMIT" \
    "pass a whole number above zero, or omit --head for no limit" \
    "grepsafe.sh --pattern 'paddleOut' --head 20"
  exit 2
fi

# --tail takes the same gate, for the same reasons
if [[ -n "$TAIL_LIMIT" ]] && ! [[ "$TAIL_LIMIT" =~ ^0*[1-9][0-9]{0,17}$ ]]; then
  emit_refusal_with_hint "error: --tail must be a positive integer of at most 18 digits
  got: $TAIL_LIMIT" \
    "pass a whole number above zero, or omit --tail for no limit" \
    "grepsafe.sh --pattern 'paddleOut' --tail 20"
  exit 2
fi

# one cut at a time: the pair has no single order a caller would expect
if [[ -n "$HEAD_LIMIT" && -n "$TAIL_LIMIT" ]]; then
  emit_refusal_with_hint "error: --head and --tail cannot be combined
  got: --head $HEAD_LIMIT --tail $TAIL_LIMIT" \
    "keep the first rows with --head, or the last rows with --tail" \
    "grepsafe.sh --pattern 'paddleOut' --tail 20"
  exit 2
fi

# recast to decimal once, here: `--head 08` is valid, but bash arithmetic
# reads a zero prefix as octal and fails mid-render
[[ -n "$HEAD_LIMIT" ]] && HEAD_LIMIT=$((10#$HEAD_LIMIT))
[[ -n "$TAIL_LIMIT" ]] && TAIL_LIMIT=$((10#$TAIL_LIMIT))

# --from names the subject; only piped text has a name here
if [[ -n "$FROM" && "$FROM" != "@stdin" ]]; then
  emit_refusal_with_hint "error: --from takes @stdin only
  got: $FROM" \
    "pipe text in with --from @stdin, or name files with --path" \
    "cmd | grepsafe.sh --pattern 'paddleOut' --from @stdin"
  exit 2
fi

# pattern is required
if [[ -z "$PATTERN" ]]; then
  emit_refusal_with_hint "error: --pattern is required
usage: grepsafe.sh --pattern 'regex' [--path dir] [--glob '*.ts']" \
    "pass the regex to search for" \
    "grepsafe.sh --pattern 'paddleOut|wipeout'"
  exit 2
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_refusal_with_hint "error: not in a git repository
  grepsafe bounds every search to a repo root, so it needs one to bound against" \
    "cd into a git repository, or make this directory one" \
    "git init"
  exit 2
fi

# get repo root
REPO_ROOT=$(realpath "$(git rev-parse --show-toplevel)")

######################################################################
# the diagnostic sinks, and the ONE trap that clears them
######################################################################

# every stderr this skill reads is captured to a sink; no `2>/dev/null` on a
# path that can carry a reason. declared above the first root expansion,
# which reads two of them
DIAG_FILE=$(mktemp)          # the main run's stderr
FILES_DIAG_FILE=$(mktemp)    # the zero-kind probe's stderr
PROBE_DIAG_FILE=$(mktemp)    # the fatal-vs-partial probe's stderr
EXPAND_DIAG_FILE=$(mktemp)   # realpath's stderr, at each root expansion
RG_PROBE_DIAG_FILE=$(mktemp) # rg --version's stderr, at the engine probe
PRUNED_DIAG_FILE=$(mktemp)   # the dot-dir probe's stderr, on a clean zero
PROBE_DIR=$(mktemp -d)       # an empty readable dir, for the input probe
STDIN_FILE=$(mktemp)         # the piped text, when stdin is the subject

# clean up the temps on exit, ctrl-c, and kill; EXIT alone misses signals.
# .note = one trap statement: bash traps replace, never add. put new cleanup here
# .note = SIGKILL cannot be trapped, so `kill -9` leaks the temps
trap 'rm -f "$DIAG_FILE" "$FILES_DIAG_FILE" "$PROBE_DIAG_FILE" "$EXPAND_DIAG_FILE" "$RG_PROBE_DIAG_FILE" "$PRUNED_DIAG_FILE" "$STDIN_FILE"; rm -rf "$PROBE_DIR"' EXIT INT TERM

######################################################################
# the subject — piped text, or files
######################################################################

# piped text is the subject when present. a tty or /dev/null holds no piped
# text, so it is never read. an empty pipe (a harness that closes stdin)
# means no piped text, so the file search stands
# .note = a shell pipe or a redirect (fifo, file) is read to EOF. a socket is
#         what a node parent hands its child, and an async parent may never
#         close it, so an implicit read waits for a first byte, then reads to
#         EOF. a named --from @stdin always reads to EOF
STDIN_MODE=false
STDIN_READABLE=false
[[ -p /dev/stdin || -f /dev/stdin || -S /dev/stdin ]] && STDIN_READABLE=true
if [[ "$STDIN_READABLE" == true && ( -p /dev/stdin || -f /dev/stdin || "$FROM" == "@stdin" ) ]]; then
  cat > "$STDIN_FILE"
fi
if [[ "$STDIN_READABLE" == true && -S /dev/stdin && "$FROM" != "@stdin" ]]; then
  if IFS= read -r -N 1 -t 1 STDIN_FIRST_CHAR; then
    { printf '%s' "$STDIN_FIRST_CHAR"; cat; } > "$STDIN_FILE"
  fi
fi
[[ -s "$STDIN_FILE" || "$FROM" == "@stdin" ]] && STDIN_MODE=true

# --from @stdin with no pipe would search naught and report a clean zero
if [[ "$FROM" == "@stdin" && "$STDIN_READABLE" != true ]]; then
  emit_refusal_with_hint "error: --from @stdin was named, but no text was piped in" \
    "pipe the text to search into grepsafe" \
    "cmd | grepsafe.sh --pattern 'paddleOut' --from @stdin"
  exit 2
fi

# piped text beside a named file set is two subjects. either pick would
# answer a question the caller did not ask, so neither is picked
if [[ "$STDIN_MODE" == true && ( ${#SEARCH_PATHS[@]} -gt 0 || -n "$GLOB" || -n "$FILE_TYPE" ) ]]; then
  emit_refusal_with_hint "error: piped text and a file set were both named
  grepsafe searches one subject: the piped text, or the files" \
    "drop --path, --glob, and --type to search the pipe — or stop the pipe to search the files" \
    "cmd | grepsafe.sh --pattern 'paddleOut'"
  exit 2
fi

# .what = expand a path to an absolute root, and keep realpath's own reason
# .why  = realpath fails four ways (ENOENT, EACCES, ELOOP, ENOTDIR). only one
#         means "absent", and the reason cannot be recovered later
# .sets = EXPAND_ABS (absolute path, or empty), EXPAND_WHY (stderr, or empty)
expand_root_or_reason() {
  EXPAND_ABS=$(realpath "$1" 2>"$EXPAND_DIAG_FILE") || EXPAND_ABS=""
  EXPAND_WHY=$(cat "$EXPAND_DIAG_FILE")
}

# .what = the repo boundary: one gate for every search root
# .why  = both the --path root and a --glob prefix root walk the filesystem,
#         so neither may reach the walk unchecked
validate_root_within_repo_or_fail() {
  local root_abs="$1"
  local named_by="$2"
  is_path_within_repo_root --path "$root_abs" --root "$REPO_ROOT" && return 0

  emit_path_refusal \
    "search path must be within the git repository
  repo root:   $REPO_ROOT
  search path: $root_abs
  named by:    $named_by" \
    "name a path under the repo root: no '..' segments, and an absolute path must itself sit under that root" \
    "grepsafe.sh --pattern '$PATTERN' --path $REPO_ROOT"
  exit 2
}

######################################################################
# derive the search root — ONE producer of the whole triple
######################################################################

# the rule: to NAME a path — via --glob's leading dir, or via --path —
# is to opt into --hidden, the ignore rules, and symlink following,
# scoped to what was named. a tree merely MET on the walk stays skipped.

# .what = strip the repo root from every absolute path in a block of text
# .why  = a caller reads paths relative to the repo
# .note = bash substitution, never sed: the quoted pattern matches literally,
#         so a repo path with '|', '.', '*', or '[' cannot misfire
as_repo_relative() {
  local text="$1"
  echo "${text//"$REPO_ROOT/"/}"
}

# .what = split a glob into its literal directory prefix and its filter tail
# .why  = a glob's leading literal segments NAME a path; the rest filters
#         within it. the caller makes the prefix the search root and hands
#         only the tail to rg.
# .note = sets GLOB_PREFIX and GLOB_TAIL
split_glob_prefix_and_tail() {
  local glob="$1"
  local prefix=""
  local seg
  local segs

  # the literal prefix = leading segments with no glob metacharacter
  IFS='/' read -ra segs <<< "$glob"
  for seg in "${segs[@]}"; do
    case "$seg" in
      *'*'* | *'?'* | *'['* | *'{'*) break ;;
    esac
    prefix="${prefix:+$prefix/}$seg"
  done

  # the tail = the glob with its literal prefix stripped. a wholly-literal
  # glob (a plain file path) leaves no tail, so split it at the basename.
  local tail="${glob#"$prefix"/}"
  if [[ -n "$prefix" && "$tail" == "$glob" ]]; then
    prefix=$(dirname "$glob")
    tail=$(basename "$glob")
  fi

  GLOB_PREFIX="$prefix"
  GLOB_TAIL="$tail"
}

# .what = expand a glob's brace groups into its alternatives, one per line
# .why  = each alternative may name its own root: '{src/**,.behavior/**}'
#         names two. left whole, it has no literal prefix, names no root, and
#         the dot root is never walked — a false zero
# .note = a string walk, never `eval`: the glob is caller input. `\` escapes
#         the next char, `[...]` is opaque, an unbalanced `{` stays literal
expand_glob_braces() {
  local glob="$1"
  local len=${#glob} i=0 j depth=0 open=-1 close=-1 ch

  # find the first top-level brace group
  while [[ "$i" -lt "$len" ]]; do
    ch="${glob:i:1}"
    if [[ "$ch" == '\' ]]; then
      i=$((i + 2))
      continue
    fi
    if [[ "$ch" == '[' ]]; then
      j=$((i + 1))
      while [[ "$j" -lt "$len" && "${glob:j:1}" != ']' ]]; do j=$((j + 1)); done
      i=$((j + 1))
      continue
    fi
    [[ "$ch" == '{' && "$depth" -eq 0 ]] && open=$i
    [[ "$ch" == '{' ]] && depth=$((depth + 1))
    if [[ "$ch" == '}' && "$depth" -gt 0 ]]; then
      depth=$((depth - 1))
      [[ "$depth" -eq 0 ]] && {
        close=$i
        break
      }
    fi
    i=$((i + 1))
  done

  # no complete group: the glob is its own one alternative
  if [[ "$close" -lt 0 ]]; then
    echo "$glob"
    return 0
  fi

  # split the group body on its top-level commas
  local head="${glob:0:open}"
  local body="${glob:open+1:close-open-1}"
  local rest="${glob:close+1}"
  local part="" level=0 k=0
  local -a branches=()
  while [[ "$k" -lt "${#body}" ]]; do
    ch="${body:k:1}"
    if [[ "$ch" == '\' ]]; then
      part+="${body:k:2}"
      k=$((k + 2))
      continue
    fi
    [[ "$ch" == '{' ]] && level=$((level + 1))
    [[ "$ch" == '}' ]] && level=$((level - 1))
    if [[ "$ch" == ',' && "$level" -eq 0 ]]; then
      branches+=("$part")
      part=""
      k=$((k + 1))
      continue
    fi
    part+="$ch"
    k=$((k + 1))
  done
  branches+=("$part")

  # each branch may hold a later group, so recurse
  local branch
  for branch in "${branches[@]}"; do
    expand_glob_braces "$head$branch$rest"
  done
}

# .what = the search legs — one per root the glob names
# .why  = rg applies a lift to every root in a run, and each root owns its
#         lifts, so each root gets its own run. alternatives that share a root
#         and a named-ness share a leg: rg ORs their globs
# .note = index-aligned arrays. LEG_GLOBS[i] holds one glob per line; an empty
#         line means no filter, and wins
LEG_ROOTS=()
LEG_NAMED=()
LEG_GLOBS=()
LEG_CWDS=()

# .what = add one (root, named, glob) to the legs, merged by root + named
add_search_leg() {
  local root="$1" named="$2" glob="$3" i
  if [[ ${#LEG_ROOTS[@]} -gt 0 ]]; then
    for i in "${!LEG_ROOTS[@]}"; do
      if [[ "${LEG_ROOTS[$i]}" == "$root" && "${LEG_NAMED[$i]}" == "$named" ]]; then
        LEG_GLOBS[$i]+=$'\n'"$glob"
        return 0
      fi
    done
  fi
  LEG_ROOTS+=("$root")
  LEG_NAMED+=("$named")
  LEG_GLOBS+=("$glob")
  # rg runs in the leg's root. a file root or an unenterable dir runs in its
  # parent, so rg reports the denial itself
  local cwd="$root"
  [[ -d "$root" && -x "$root" ]] || cwd=$(dirname "$root")
  LEG_CWDS+=("$cwd")
}

# .what = derive the root --path names, and whether it was named
# .sets = PATH_ROOT, PATH_NAMED
derive_path_root() {
  local search_path="$1"

  # the headline splits on whether the path is visible at all: visible yet
  # unexpandable => "could not be opened"; not visible => "does not exist".
  # `-e` cannot tell EACCES from ENOENT, so realpath's reason rides in both
  expand_root_or_reason "$search_path"
  PATH_ROOT="$EXPAND_ABS"
  local expand_note=""
  [[ -n "$EXPAND_WHY" ]] && expand_note=$'\n'"  reason: $EXPAND_WHY"

  if [[ -z "$PATH_ROOT" && ( -e "$search_path" || -L "$search_path" ) ]]; then
    emit_path_refusal \
      "search path could not be opened: $search_path$expand_note" \
      "check that every parent is traversable, that no component is a file, and that no symlink loops" \
      "ls -ld $search_path"
    exit 2
  fi
  if [[ -z "$PATH_ROOT" || ! -e "$PATH_ROOT" ]]; then
    emit_path_refusal \
      "search path does not exist: $search_path$expand_note" \
      "check the path, then name a root that exists" \
      "grepsafe.sh --pattern '$PATTERN' --path ."
    exit 2
  fi

  validate_root_within_repo_or_fail "$PATH_ROOT" "--path"

  PATH_NAMED=false
  [[ "$search_path" != "." ]] && PATH_NAMED=true
  return 0
}

# .what = derive the leg one glob alternative searches
# .why  = root, glob, and named-ness move together, so one producer sets
#         them. a root whose lifts disagree with it reports a false `0`
# .note = rg runs in the leg's root, so every glob reads relative to it
derive_alternative_leg() {
  local search_path="$1"
  local alt="$2"

  # three facts must hold before a glob names a path. a failed one keeps the
  # --path root and the alternative as written

  # fact 1 — the glob holds a slash, so it MAY name a path
  # fact 2 — a literal prefix exists; '**/*.md' has a slash and no prefix
  GLOB_PREFIX=""
  [[ "$alt" == */* ]] && split_glob_prefix_and_tail "$alt"
  if [[ -z "$GLOB_PREFIX" ]]; then
    add_search_leg "$PATH_ROOT" "$PATH_NAMED" "$alt"
    return 0
  fi

  # an absolute prefix stands alone; only a relative one joins the search
  # path. a blind join would re-anchor '/etc/*.conf' to './etc' inside the repo
  local prefix_raw="$search_path/$GLOB_PREFIX"
  local prefix_typed=false
  [[ "$search_path" == "." ]] && prefix_typed=true
  [[ "$GLOB_PREFIX" == /* ]] && {
    prefix_raw="$GLOB_PREFIX"
    prefix_typed=true
  }

  # expand the named prefix to a concrete root. realpath follows a NAMED
  # symlink here — the D6 lift — without -L, so a symlink merely MET deeper
  # on the walk is still not followed (the breadth guard).
  expand_root_or_reason "$prefix_raw"
  local prefix_abs="$EXPAND_ABS"

  # a prefix that does not expand drops the lifts, so keep realpath's reason
  # for the `unread` block — but only for a path the caller typed.
  # .note = a plain absent last component ('src/nope/**') expands fine and
  #         reports "no file matched the glob". what lands here is an
  #         unreadable parent, a loop, a file named as a dir, or an absent
  #         intermediate parent
  # .note = with --path set, prefix_raw is a derived join. a miss there names
  #         a path the caller never wrote, and --path itself was validated
  #         and searched, so a reason would be a false alarm (case38)
  [[ -z "$prefix_abs" && "$prefix_typed" == true && -n "$EXPAND_WHY" ]] \
    && ROOT_EXPAND_WHY="${ROOT_EXPAND_WHY}${ROOT_EXPAND_WHY:+$'\n'}${EXPAND_WHY}"

  # fact 3 — the prefix expands to a root that really exists
  if [[ -z "$prefix_abs" || ! -e "$prefix_abs" ]]; then
    add_search_leg "$PATH_ROOT" "$PATH_NAMED" "$alt"
    return 0
  fi

  # the prefix becomes the leg's root and faces the repo boundary.
  # a literal '..' passes the split, so '../../etc/**' is caught here
  validate_root_within_repo_or_fail "$prefix_abs" "--glob"

  # the tail filters inside that root. the `/` anchors it: unanchored, `*.md`
  # matches at any depth, and 'docs/*.md' reaches 'docs/sub/b.md'. an empty
  # tail ('src/') filters naught
  local leg_glob=""
  [[ -n "$GLOB_TAIL" ]] && leg_glob="/$GLOB_TAIL"
  add_search_leg "$prefix_abs" true "$leg_glob"
}

# why a named root could not be opened, for the diagnostics block. empty when
# every root expands or a prefix is merely absent
ROOT_EXPAND_WHY=""

# .what = derive the legs one --path root contributes
derive_legs_for_path() {
  local search_path="$1"
  derive_path_root "$search_path"

  # no glob: one leg, no filter
  if [[ -z "$GLOB" ]]; then
    add_search_leg "$PATH_ROOT" "$PATH_NAMED" ""
    return 0
  fi

  # one leg per alternative root. `< <(...)`, not a pipe: a refusal must exit
  # this shell, not a subshell
  local alt
  while IFS= read -r alt; do
    derive_alternative_leg "$search_path" "$alt"
  done < <(expand_glob_braces "$GLOB")
}

# every root the caller named; '.' when none. piped text needs no root
[[ ${#SEARCH_PATHS[@]} -eq 0 ]] && SEARCH_PATHS=(.)
if [[ "$STDIN_MODE" != true ]]; then
  for SEARCH_PATH in "${SEARCH_PATHS[@]}"; do
    derive_legs_for_path "$SEARCH_PATH"
  done
fi

######################################################################
# select the engine — rg is the ONE engine
######################################################################

# find a functional ripgrep. a broken rg, or an alias bash cannot see,
# counts as absent — the --version probe proves the binary runs.
# the probe's stderr is kept: a broken rg says why, and "not found" would
# be false about a binary on PATH
RG_BIN=""
RG_ABSENT_WHY=""
if command -v rg > /dev/null 2>&1; then
  if rg --version > /dev/null 2>"$RG_PROBE_DIAG_FILE"; then
    RG_BIN=rg
  else
    RG_ABSENT_WHY=$(cat "$RG_PROBE_DIAG_FILE")
  fi
fi

# failfast when rg is absent: no fallback engine, so refuse, never a silent 0
if [[ -z "$RG_BIN" ]]; then
  # absent vs broken read apart: one installs, the other repairs.
  # both streams read the same conditional, so they cannot disagree
  RG_REFUSAL="error: ripgrep (rg) is required but was not found
  grepsafe searches with rg only; there is no fallback engine"
  RG_REMEDY="install ripgrep, then re-run"
  RG_REFUSAL_PLAIN="grepsafe: ripgrep (rg) is required but was not found"
  if [[ -n "$RG_ABSENT_WHY" ]]; then
    RG_REFUSAL="error: ripgrep (rg) is on PATH but could not run
  grepsafe searches with rg only; there is no fallback engine
  rg said: $RG_ABSENT_WHY"
    RG_REMEDY="repair or reinstall the rg on your PATH, then re-run"
    RG_REFUSAL_PLAIN="grepsafe: ripgrep (rg) is on PATH but could not run — rg said: $RG_ABSENT_WHY"
  fi
  emit_refusal_with_hint \
    "$RG_REFUSAL" \
    "$RG_REMEDY" \
    "https://github.com/BurntSushi/ripgrep#installation" \
    "$RG_REFUSAL_PLAIN"
  exit 2
fi

# .what = the scope flags for one leg — which files rg may consider
# .why  = one producer for the search and every probe, so none can drift
# .sets = LEG_SCOPE_FLAGS
# .note = a later --glob overrides an earlier one, so '!.git' comes last and
#         keeps .git out under --hidden --no-ignore
build_leg_scope_flags() {
  local i="$1" glob filter=true
  LEG_SCOPE_FLAGS=()
  while IFS= read -r glob; do
    [[ -z "$glob" ]] && filter=false
  done <<< "${LEG_GLOBS[$i]}"
  if [[ "$filter" == true ]]; then
    while IFS= read -r glob; do
      LEG_SCOPE_FLAGS+=(--glob "$glob")
    done <<< "${LEG_GLOBS[$i]}"
  fi
  [[ -n "$FILE_TYPE" ]] && LEG_SCOPE_FLAGS+=(--type "$FILE_TYPE")
  [[ "${LEG_NAMED[$i]}" == true ]] && LEG_SCOPE_FLAGS+=(--hidden --no-ignore --glob '!.git')
  return 0
}

# .what = is any leg unnamed, so its walk keeps the default skips?
has_unnamed_leg() {
  local named
  for named in "${LEG_NAMED[@]}"; do
    [[ "$named" != true ]] && return 0
  done
  return 1
}

######################################################################
# build command
######################################################################

CMD_BASE=("$RG_BIN")

# output mode — the default first, then each mode overrides it
OUTPUT_MODE_FLAG=--line-number
[[ "$COUNT" == true ]] && OUTPUT_MODE_FLAG=--count
[[ "$FILES_ONLY" == true ]] && OUTPUT_MODE_FLAG=--files-with-matches
CMD_BASE+=("$OUTPUT_MODE_FLAG")

# the tally label names what `wc -l` counts in each mode:
#   --files-with-matches, --count → files (`--count` rows are `path:N`)
#   --context N                   → rows (matches, context, `--` separators)
#   default                       → lines
# order matters: rg ignores -C under --files-with-matches and --count, so
# `files` must override `rows`
RESULT_LABEL=lines
[[ -n "$CONTEXT" ]] && RESULT_LABEL=rows
[[ "$COUNT" == true ]] && RESULT_LABEL=files
[[ "$FILES_ONLY" == true ]] && RESULT_LABEL=files

# the match options, shared by the search and the pruned-zero probe
MATCH_FLAGS=()
[[ "$CASE_INSENSITIVE" == true ]] && MATCH_FLAGS+=(-i)
[[ "$MULTILINE" == true ]] && MATCH_FLAGS+=(-U --multiline-dotall)
if [[ ${#MATCH_FLAGS[@]} -gt 0 ]]; then
  CMD_BASE+=("${MATCH_FLAGS[@]}")
fi

if [[ -n "$CONTEXT" ]]; then
  CMD_BASE+=(-C "$CONTEXT")
fi

# a cut needs an order, or "first N" is an arbitrary N: rg walks in parallel.
# `--sort path` costs the parallel walk, so only a cut pays it. rg sorts
# before output, so `--context` separators stay intact
if [[ -n "$HEAD_LIMIT" || -n "$TAIL_LIMIT" ]]; then
  CMD_BASE+=(--sort path)
fi

# .what = the whole rg command for one leg, root last
# .sets = LEG_CMD
# .note = `-e` carries the pattern, so a pattern that opens with `-` is
#         never read as a flag
build_leg_cmd() {
  local i="$1" root="$2"
  build_leg_scope_flags "$i"
  LEG_CMD=("${CMD_BASE[@]}")
  if [[ ${#LEG_SCOPE_FLAGS[@]} -gt 0 ]]; then
    LEG_CMD+=("${LEG_SCOPE_FLAGS[@]}")
  fi
  LEG_CMD+=(-e "$PATTERN" "$root")
}

######################################################################
# execute
######################################################################

# .what = the header every outcome opens with; only the turtle phrase varies
# .why  = one producer, so refusal, zero, and match agree on what ran.
#         every line echoes the effective state (root, glob, type, scope, engine)
print_grepsafe_header() {
  print_turtle_header "$1"
  print_tree_start "grepsafe"
  print_tree_branch "pattern" "$PATTERN"
  # piped text has no root, scope, or walk — name the subject and stop
  if [[ "$STDIN_MODE" == true ]]; then
    print_tree_branch "input" "stdin (piped text)"
    print_tree_branch "engine" "$RG_BIN"
    return 0
  fi
  # the derived root, not the raw --path: a glob prefix may have moved it.
  # not `as_repo_relative`, which leaves the repo root itself absolute
  local i root_shown roots_shown="" named_shown="" named_count=0
  for i in "${!LEG_ROOTS[@]}"; do
    root_shown="${LEG_ROOTS[$i]#"$REPO_ROOT"}"
    root_shown="${root_shown#/}"
    roots_shown="${roots_shown:+$roots_shown, }${root_shown:-.}"
    if [[ "${LEG_NAMED[$i]}" == true ]]; then
      named_count=$((named_count + 1))
      named_shown="${named_shown:+$named_shown, }${root_shown:-.}"
    fi
  done
  local path_label=path
  [[ ${#LEG_ROOTS[@]} -gt 1 ]] && path_label=paths
  print_tree_branch "$path_label" "$roots_shown"
  if [[ -n "$GLOB" ]]; then
    print_tree_branch "glob" "$GLOB"
  fi
  if [[ -n "$FILE_TYPE" ]]; then
    print_tree_branch "type" "$FILE_TYPE"
  fi
  # a named path lifts --hidden and the ignore rules; say so, so a caller who
  # expects .gitignore honored can see ignored trees are in scope
  if [[ "$named_count" -gt 0 && "$named_count" -eq ${#LEG_ROOTS[@]} ]]; then
    print_tree_branch "scope" "hidden + ignored included (a named path)"
  fi
  if [[ "$named_count" -gt 0 && "$named_count" -lt ${#LEG_ROOTS[@]} ]]; then
    print_tree_branch "scope" "hidden + ignored included under $named_shown only"
  fi
  print_tree_branch "engine" "$RG_BIN"
}

# .what = the diagnostics rg wrote into one stderr capture file
# .why  = some rg builds prefix each diagnostic with `rg: ` and some do not;
#         strip it, so one frame renders on every build
get_rg_diag() {
  sed 's/^rg: //' "$1"
}

# run the search, one rg per leg. stdout and stderr are captured apart, so a
# diagnostic never counts as a match.
#
# every rg run here shares one status contract:
#   0 = matched · 1 = ran cleanly, matched naught · >=2 = fatal
# `cmd && status=0 || status=$?` keeps that number; `|| true` or a pipeline
# would fold >=2 into 1 and report a fatal run as a zero.
# .note = inline at each site; a wrapper would need namerefs for two outputs
#
# each leg runs in its own root: rg anchors `--glob` to its cwd, so from
# elsewhere a glob misses (inner slash) or over-reaches (no slash). a failed
# leg re-runs on an empty readable dir, to tell a bad input (naught ran) from
# a bad path met mid-walk (a partial run)
OUTPUT=""
DIAGNOSTICS=""
INPUT_REFUSED=false

# piped text: one run, rg reads it as `-`. no walk exists, so a fatal status
# can only be a bad input
if [[ "$STDIN_MODE" == true ]]; then
  OUTPUT=$("${CMD_BASE[@]}" -e "$PATTERN" - <"$STDIN_FILE" 2>"$DIAG_FILE") && STDIN_STATUS=0 || STDIN_STATUS=$?
  DIAGNOSTICS=$(get_rg_diag "$DIAG_FILE")
  [[ "$STDIN_STATUS" -ge 2 ]] && INPUT_REFUSED=true
fi

for LEG in "${!LEG_ROOTS[@]}"; do
  build_leg_cmd "$LEG" "${LEG_ROOTS[$LEG]}"
  # a failed `cd` exits 2, never 1: a 1 would read as a clean zero
  LEG_OUTPUT=$(cd "${LEG_CWDS[$LEG]}" || exit 2; "${LEG_CMD[@]}" 2>"$DIAG_FILE") && LEG_STATUS=0 || LEG_STATUS=$?
  LEG_DIAG=$(get_rg_diag "$DIAG_FILE")

  # the union: a separator between legs keeps --context blocks apart
  if [[ -n "$LEG_OUTPUT" ]]; then
    [[ -n "$OUTPUT" && -n "$CONTEXT" ]] && OUTPUT+=$'\n--'
    OUTPUT="${OUTPUT}${OUTPUT:+$'\n'}${LEG_OUTPUT}"
  fi
  DIAGNOSTICS="${DIAGNOSTICS}${DIAGNOSTICS:+${LEG_DIAG:+$'\n'}}${LEG_DIAG}"

  # the fatal-vs-partial probe: the same leg, an empty readable dir as root.
  # .note = a declared toctou window: the filesystem may change between the
  #         search and this probe (both probes share it). a parse of rg's
  #         error prose would close it, but that prose is unversioned and
  #         locale-bound. the window is microseconds, and each outcome is true
  #         of the moment it measured
  if [[ "$LEG_STATUS" -ge 2 ]]; then
    build_leg_cmd "$LEG" "$PROBE_DIR"
    (cd "$PROBE_DIR" || exit 2; "${LEG_CMD[@]}") >/dev/null 2>"$PROBE_DIAG_FILE" && PROBE_STATUS=0 || PROBE_STATUS=$?
    if [[ "$PROBE_STATUS" -ge 2 ]]; then
      INPUT_REFUSED=true
      break
    fi
  fi
done

# overlapped legs ('{src/**,src/a/**}') report a file twice; keep the first.
# a `--` separator repeats by design, so it is never a duplicate
if [[ ${#LEG_ROOTS[@]} -gt 1 && -n "$OUTPUT" ]]; then
  OUTPUT=$(awk '$0 == "--" || !seen[$0]++' <<< "$OUTPUT")
fi
# sort rg's stderr: a parallel walk emits it in thread-finish order.
# `LC_ALL=C` pins byte order, so every host renders one order.
# sorted before the prepend below, which stays first
[[ -n "$DIAGNOSTICS" ]] && DIAGNOSTICS=$(printf '%s\n' "$DIAGNOSTICS" | LC_ALL=C sort)
# prepend the root-expansion reason: it explains the scope of every line below
[[ -n "$ROOT_EXPAND_WHY" ]] \
  && DIAGNOSTICS="${ROOT_EXPAND_WHY}${DIAGNOSTICS:+$'\n'}${DIAGNOSTICS}"
# relativize once; three readers share it
DIAGNOSTICS_REL=$(as_repo_relative "$DIAGNOSTICS")
# .what = the fix line both `unread` renders share
# .why  = the remedy follows what the walk reported: "grant read access" fits
#         a permission denial only. other causes point at the printed reason,
#         and a mixed block gets both halves. a wrong remedy is worse than none
get_unread_fix() {
  local has_denial=false has_other=false line
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if [[ "$line" == *"ermission denied"* ]]; then
      has_denial=true
    else
      has_other=true
    fi
  done <<< "$1"

  if [[ "$has_denial" == true && "$has_other" == true ]]; then
    echo "fix: grant read access where the reason above says permission denied, repair the other paths as their own reasons say — or narrow the walk with --path or --glob"
    return 0
  fi
  if [[ "$has_denial" == true ]]; then
    echo "fix: grant read access, or narrow the walk with --path or --glob so these paths fall outside it"
    return 0
  fi
  echo "fix: read the reason above, then repair that path — or narrow the walk with --path or --glob so it falls outside"
}
UNREAD_FIX=$(get_unread_fix "$DIAGNOSTICS")
# .what = is the node about to print the last one? "true" => └─, "false" => ├─
# .why  = the `unread` peer renders iff DIAGNOSTICS is non-empty. reads the
#         live value, since `diagnose_zero_kind` appends to it
is_tree_node_last() {
  [[ -z "$DIAGNOSTICS" ]] && echo true || echo false
}

# a bad input fails on an empty dir too: refuse, no count exists.
# a leg that ran clean there met a bad path mid-walk, and its partial answer
# stands below
if [[ "$INPUT_REFUSED" == true ]]; then
  {
    # the refusal shows its evidence: where the main run's stderr is empty,
    # the probe's (sorted, same parallel walk) explains it
    if [[ -z "$DIAGNOSTICS_REL" ]]; then
      DIAGNOSTICS_REL=$(as_repo_relative "$(get_rg_diag "$PROBE_DIAG_FILE" | LC_ALL=C sort)")
    fi
    REFUSAL_FIX="fix: correct the input named above — check --pattern, --glob, and --type"
    REFUSAL_VIBES=$({
      print_grepsafe_header "bummer dude..."
      print_tree_leaf "refused — the search never ran, so there is no count"
      print_tree_block "${DIAGNOSTICS_REL}" "${REFUSAL_FIX}"
    })
    emit_refusal "$REFUSAL_VIBES" \
      "grepsafe: the search never ran, so there is no count
${DIAGNOSTICS_REL}
${REFUSAL_FIX}"
    exit 2
  }
fi

# .what = count the lines of a text block, as a plain integer
# .why  = `tr` strips BSD wc's pad. empty input returns 0: `echo ""` would
#         count one phantom row
count_lines() {
  [[ -z "$1" ]] && { echo 0; return 0; }
  echo "$1" | wc -l | tr -d ' '
}

# apply head limit. keep the pre-cut count, so the tally can mark the cut:
# "first 2 of 200" must never read as "exactly 2".
# .note = a here-string, never `echo | head`: past 64 KiB, head closes the
#         pipe early, the producer exits 141, and `pipefail` + `set -e` kill
#         the render
TRUNCATED=false
MATCH_COUNT_FULL=""
CUT_LIMIT="${HEAD_LIMIT:-$TAIL_LIMIT}"
CUT_SIDE=first
[[ -n "$TAIL_LIMIT" ]] && CUT_SIDE=last
if [[ -n "$CUT_LIMIT" && -n "$OUTPUT" ]]; then
  MATCH_COUNT_FULL=$(count_lines "$OUTPUT")
  [[ "$CUT_SIDE" == first ]] && OUTPUT=$(head -n "$CUT_LIMIT" <<< "$OUTPUT")
  [[ "$CUT_SIDE" == last ]] && OUTPUT=$(tail -n "$CUT_LIMIT" <<< "$OUTPUT")
  [[ "$MATCH_COUNT_FULL" -gt "$CUT_LIMIT" ]] && TRUNCATED=true
fi

# make paths relative to repo root
if [[ -n "$OUTPUT" ]]; then
  OUTPUT=$(as_repo_relative "$OUTPUT")
fi

# .what = name WHICH honest zero this is, on an empty result
# .why  = `matches: 0` alone is the defect this skill exists to kill. five
#         zeros wear the same number, and a caller must tell them apart:
#           - no file matched the glob / the type / the glob and type
#           - no line matched the pattern
#           - no READABLE file matched — a skip, not an absence
#           - the path the caller NAMED could not be read
#           - the probe itself failed, so which zero is unknown
# .sets = ZERO_KIND, and on a failed probe DIAGNOSTICS + DIAGNOSTICS_REL
# .note = re-runs the engine: the kind cannot be read off an empty result
diagnose_zero_kind() {
  ZERO_KIND="no line matched the pattern"
  [[ -z "$GLOB" && -z "$FILE_TYPE" ]] && return 0

  # name the filter that selected the set, so the zero says which came back empty
  local zero_filter="the glob"
  [[ -z "$GLOB" ]] && zero_filter="the type"
  [[ -n "$GLOB" && -n "$FILE_TYPE" ]] && zero_filter="the glob and type"

  # probe each leg with the flags and cwd the search used. status decides, not
  # emptiness: an unreadable tree or a failed engine also lists no file, so
  # "no file matched" holds only on status 0 or 1. the worst leg wins.
  # .note = no `| head`: under `pipefail` it would replace rg's status
  local file_hits="" files_status=0 files_diag="" leg leg_hits leg_status leg_diag
  for leg in "${!LEG_ROOTS[@]}"; do
    build_leg_scope_flags "$leg"
    local files_probe=("$RG_BIN" --files)
    [[ ${#LEG_SCOPE_FLAGS[@]} -gt 0 ]] && files_probe+=("${LEG_SCOPE_FLAGS[@]}")
    files_probe+=("${LEG_ROOTS[$leg]}")
    leg_hits=$(cd "${LEG_CWDS[$leg]}" || exit 2; "${files_probe[@]}" 2>"$FILES_DIAG_FILE") && leg_status=0 || leg_status=$?
    file_hits="${file_hits}${leg_hits}"
    [[ "$leg_status" -gt "$files_status" ]] && files_status=$leg_status
    # sorted, like every rg stderr capture it joins
    leg_diag=$(get_rg_diag "$FILES_DIAG_FILE" | LC_ALL=C sort)
    files_diag="${files_diag}${files_diag:+${leg_diag:+$'\n'}}${leg_diag}"
  done

  [[ "$files_status" -le 1 && -z "$file_hits" ]] && ZERO_KIND="no file matched $zero_filter"

  if [[ "$files_status" -ge 2 ]]; then
    # the kind of last resort: the zero is real, and WHICH zero is unknown
    ZERO_KIND="could not tell which zero — the file probe failed"
    # update both: DIAGNOSTICS gates the shape, DIAGNOSTICS_REL renders
    DIAGNOSTICS="${DIAGNOSTICS}${DIAGNOSTICS:+$'\n'}${files_diag}"
    DIAGNOSTICS_REL=$(as_repo_relative "$DIAGNOSTICS")
  fi

  # an unreadable match is still a match: with a skip on stderr, an empty
  # list proves only that no readable file matched. claimed after the probe
  # kind: the skip is measured, and a measured fact outranks a probe that
  # could not answer. a denial fails the probe too, so the reverse order
  # made this kind unreachable. probe-failed holds only with no stderr at all
  [[ -z "$file_hits" && ( -n "$DIAGNOSTICS" || -n "$files_diag" ) ]] \
    && ZERO_KIND="no readable file matched $zero_filter"

  # the glob's named path could not be opened. claimed last, so it outranks
  # the probe kinds: it was measured at expansion, not inferred from a probe
  [[ -z "$file_hits" && -n "$ROOT_EXPAND_WHY" ]] \
    && ZERO_KIND="the path named by --glob could not be read"

  # explicit success: a false guard above would otherwise return nonzero
  return 0
}

# .what = the first hidden path on a file's path below a leg root, or empty
# .why  = a walk skips a dot dir and a dot file alike; the first dot segment
#         is the path a caller must name to reach the file
# .note = echoes the hidden path relative to the root, or naught. an unnamed
#         leg's root is '.', so that path is what --path takes
get_hidden_segment_path() {
  local file="$1" root="$2" seg rel shown=""
  rel="${file#"$root"/}"
  local segs
  IFS='/' read -ra segs <<< "$rel"
  for seg in "${segs[@]}"; do
    shown="${shown:+$shown/}$seg"
    if [[ "$seg" == .* ]]; then
      echo "$shown"
      return 0
    fi
  done
  return 0
}

# .what = find the hidden files the walk skipped that hold a match
# .why  = an unnamed walk skips hidden paths, so a match in '.behavior/' or in
#         a '.env.example' is absent from the answer with no word of it. on a
#         zero that is a false zero (#780); beside results, a partial answer
# .sets = HIDDEN_COUNT (files), HIDDEN_PATHS (the hidden paths to name, one
#         per line, byte order)
# .note = --hidden only, never --no-ignore: a hit counts only if a dot
#         segment sits below its leg root, so a file the walk saw never counts.
#         a hit under a named root was searched there, so it never counts
diagnose_hidden_skips() {
  HIDDEN_COUNT=0
  HIDDEN_PATHS=""
  local hits="" paths="" leg leg_hits leg_status file hidden named
  for leg in "${!LEG_ROOTS[@]}"; do
    [[ "${LEG_NAMED[$leg]}" == true ]] && continue
    build_leg_scope_flags "$leg"
    local probe=("$RG_BIN" --files-with-matches)
    if [[ ${#MATCH_FLAGS[@]} -gt 0 ]]; then
      probe+=("${MATCH_FLAGS[@]}")
    fi
    if [[ ${#LEG_SCOPE_FLAGS[@]} -gt 0 ]]; then
      probe+=("${LEG_SCOPE_FLAGS[@]}")
    fi
    probe+=(--hidden --glob '!.git' -e "$PATTERN" "${LEG_ROOTS[$leg]}")
    leg_hits=$(cd "${LEG_CWDS[$leg]}" || exit 2; "${probe[@]}" 2>"$PRUNED_DIAG_FILE") && leg_status=0 || leg_status=$?
    # a failed probe proves naught, so it claims naught
    [[ "$leg_status" -ge 2 ]] && continue

    while IFS= read -r file; do
      [[ -z "$file" ]] && continue
      hidden=$(get_hidden_segment_path "$file" "${LEG_ROOTS[$leg]}")
      [[ -z "$hidden" ]] && continue
      is_file_under_named_leg "$file" && continue
      hits="${hits}${hits:+$'\n'}${file}"
      paths="${paths}${paths:+$'\n'}${hidden}"
    done <<< "$leg_hits"
  done
  [[ -z "$hits" ]] && return 0

  HIDDEN_COUNT=$(count_lines "$(LC_ALL=C sort -u <<< "$hits")")
  HIDDEN_PATHS=$(LC_ALL=C sort -u <<< "$paths")
  return 0
}

# .what = was this file searched by a named leg?
is_file_under_named_leg() {
  local file="$1" leg
  for leg in "${!LEG_ROOTS[@]}"; do
    [[ "${LEG_NAMED[$leg]}" != true ]] && continue
    [[ "$file" == "${LEG_ROOTS[$leg]}" || "$file" == "${LEG_ROOTS[$leg]}"/* ]] && return 0
  done
  return 1
}

# .what = the 🥥 that names the --path to each skipped hidden path
# .why  = the caller must be able to reach the skipped match in one command.
#         at most five roots ride in it, so the command stays copy-pasteable
print_hidden_skips_hint() {
  local lead="$1" cmd="grepsafe.sh --pattern '$PATTERN'" total shown=0 path
  total=$(count_lines "$HIDDEN_PATHS")
  while IFS= read -r path; do
    [[ "$shown" -ge 5 ]] && break
    cmd+=" --path $path"
    shown=$((shown + 1))
  done <<< "$HIDDEN_PATHS"
  # a no-slash or '**/' glob reads the same under any root, so it rides along
  if [[ -n "$GLOB" && ( "$GLOB" != */* || "$GLOB" == '**/'* ) ]]; then
    cmd+=" --glob '$GLOB'"
  fi
  [[ -n "$FILE_TYPE" ]] && cmd+=" --type $FILE_TYPE"
  printf '\n🥥 did you know?\n'
  printf '   ├─ %s\n' "$lead"
  [[ "$total" -gt 5 ]] && printf '   ├─ %s hidden paths in all; the first 5 ride below\n' "$total"
  printf '   └─ %s\n' "$cmd"
}

# output
if [[ "$OUTPUT_MODE" == "pipeable" ]]; then
  # pipeable mode: just the results, no vibes
  if [[ -n "$OUTPUT" ]]; then
    echo "$OUTPUT"
  fi
else
  # vibes mode: turtle treestruct output
  if [[ -z "$OUTPUT" ]]; then
    # name which zero this is, so "none exists" never reads as "could not look"
    diagnose_zero_kind
    # re-derive: diagnose_zero_kind may append to DIAGNOSTICS
    UNREAD_FIX=$(get_unread_fix "$DIAGNOSTICS")

    # a clean zero may hide a match in a skipped hidden path. an unread tree
    # or a failed probe already names its own cause, so it skips this
    HIDDEN_COUNT=0
    if [[ -z "$DIAGNOSTICS" ]] && has_unnamed_leg; then
      diagnose_hidden_skips
    fi
    if [[ "$HIDDEN_COUNT" -gt 0 ]]; then
      ZERO_KIND="none in the walked trees, but $HIDDEN_COUNT hidden file(s) hold a match"
    fi

    print_grepsafe_header "crickets..."
    print_tree_node "matches: 0 — $ZERO_KIND" "$(is_tree_node_last)"
  else
    # count matches for header
    MATCH_COUNT=$(count_lines "$OUTPUT")

    # results from a walk that skipped hidden paths may be partial
    HIDDEN_COUNT=0
    has_unnamed_leg && diagnose_hidden_skips

    print_grepsafe_header "sweet"
    # the pre-cut total, with the cut named — never the shown count alone
    if [[ "$TRUNCATED" == true ]]; then
      print_tree_branch "$RESULT_LABEL" "$MATCH_COUNT_FULL ($CUT_SIDE $CUT_LIMIT)"
    else
      print_tree_branch "$RESULT_LABEL" "$MATCH_COUNT"
    fi
    # a partial answer says so beside its count, never only in a footnote
    if [[ "$HIDDEN_COUNT" -gt 0 ]]; then
      print_tree_branch "skipped" "$HIDDEN_COUNT hidden file(s) also hold a match"
    fi
    print_tree_node "results" "$(is_tree_node_last)"

    # print results in sub.bucket, no footer, same last-ness as its header
    print_tree_block "$OUTPUT" "" "$(is_tree_node_last)"
  fi

  # unread paths get their own branch, never counted as matches
  if [[ -n "$DIAGNOSTICS" ]]; then
    print_tree_leaf "unread — these paths could not be searched"
    print_tree_block "${DIAGNOSTICS_REL}" "${UNREAD_FIX}"
  fi

  # name the --path that reaches each skipped hidden match
  if [[ "$HIDDEN_COUNT" -gt 0 ]]; then
    print_hidden_skips_hint "a walk skips hidden paths; name them as --path to search them"
  fi
fi

# unread paths also reach stderr, so a pipeable caller sees an incomplete walk.
# stderr only: vibes stdout already printed them above
if [[ -n "$DIAGNOSTICS" ]]; then
  {
    echo "grepsafe: some paths could not be searched"
    echo "${DIAGNOSTICS_REL}"
    echo "${UNREAD_FIX}"
  } >&2
fi
