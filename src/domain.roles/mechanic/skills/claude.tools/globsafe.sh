#!/usr/bin/env bash
######################################################################
# .what = safe file discovery within git repo
#
# .why  = enables file pattern match without claude code's
#         suspicious syntax heuristic halt on pipe characters
#         in ls/find commands.
#
#         wraps file discovery behind named args so glob
#         patterns and pipes are invisible to claude code's
#         bash parser.
#
# usage:
#   globsafe.sh --pattern 'src/**/*.ts'                      # find files
#   globsafe.sh --pattern '*.md' --path docs/                # scoped search
#   globsafe.sh --pattern '*.md' --path docs --path src      # several roots
#   globsafe.sh --pattern '*.md' --pattern '*.ts'            # several patterns
#   globsafe.sh --pattern '**/*.md' --hidden                 # include dot paths
#   globsafe.sh --pattern 'src/**/*.ts' --long               # detailed info
#   globsafe.sh --pattern 'src/**/*.ts' --head 20            # limit results
#   globsafe.sh --pattern 'src/**/*.ts' --sort name          # sort by name
#   globsafe.sh --pattern 'src/**/*.ts' --sort time          # sort by mtime
#   globsafe.sh --pattern 'src/**/*.ts' --sort size          # sort by size
#   globsafe.sh --pattern 'src/**/*.ts' --output pipeable    # pipe-friendly output
#   globsafe.sh --pattern '*.[ref].md' --literal             # literal brackets
#   globsafe.sh --pattern '*.\[ref\].md'                     # escaped brackets
#
# guarantee:
#   - search path must be within repo
#   - expands with bash glob expansion — one engine, no fallback
#   - every --pattern and every --path is searched; the union is returned.
#     a bare positional root stands alone
#   - vibes output names the hidden files a wildcard skipped
#   - fail-fast on errors
######################################################################
set -euo pipefail

# get skill directory to load output.sh
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"

# enable glob expansion
shopt -s globstar nullglob 2>/dev/null || true

######################################################################
# parse arguments
######################################################################
PATTERNS=()
# every search root, in the order typed. a positional root is flagged: it may
# stand alone, never beside another root
SEARCH_PATHS=()
ROOT_POSITIONAL=false
HIDDEN=false
LONG=false
LITERAL=false
HEAD_LIMIT=""
SORT_BY="name"
OUTPUT_MODE="vibes"
# the first unknown flag, refused after the parse loop settles OUTPUT_MODE
UNKNOWN_FLAG=""

######################################################################
# emit
######################################################################

# .what = render a refusal on the streams its output mode permits
# .why  = the stream choice lives in output.sh; this binds it to OUTPUT_MODE
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
  emit_refusal \
    "$(print_refusal_frame --skill globsafe --diagnosis "$diagnosis" \
      --affordance "$affordance" --command "$command")" \
    "${diagnosis/#error:/globsafe:}
fix: $affordance — $command"
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --pattern)
      PATTERNS+=("$2")
      shift 2
      ;;
    --path)
      SEARCH_PATHS+=("$2")
      shift 2
      ;;
    --hidden)
      HIDDEN=true
      shift
      ;;
    --long|-l)
      LONG=true
      shift
      ;;
    --head)
      HEAD_LIMIT="$2"
      shift 2
      ;;
    --sort)
      SORT_BY="$2"
      shift 2
      ;;
    --output)
      OUTPUT_MODE="$2"
      shift 2
      ;;
    --literal)
      LITERAL=true
      shift
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      shift
      ;;
    --help|-h)
      echo "usage: globsafe.sh --pattern 'glob' [options]"
      echo ""
      echo "options:"
      echo "  --pattern GLOB     file pattern (required, e.g., 'src/**/*.ts');"
      echo "                     repeat to match several"
      echo "  --path DIR         base directory (default: .); repeat to search"
      echo "                     several"
      echo "  --hidden           let wildcards match dot paths (.git excluded)"
      echo "  --long             show detailed file info (size, mtime)"
      echo "  --head N           limit output to N files (positive integer)"
      echo "  --sort ORDER       name|time|size (default: name)"
      echo "  --output MODE      vibes|pipeable (default: vibes)"
      echo "  --literal          treat pattern as literal (no glob expansion)"
      echo "                     use when pattern contains [ or ] characters"
      echo ""
      # refusals are documented here, so a caller learns them before an exit 2
      echo "notes:"
      echo "  --head takes a positive integer of at most 18 digits; any other"
      echo "    value is refused (exit 2), never reinterpreted. a wider value"
      echo "    would wrap negative in bash and yield a false zero"
      echo "  every --pattern and --path is searched, and the union returned."
      echo "    a bare positional root stands alone: beside another root it is"
      echo "    refused (exit 2), since an unquoted glob the shell expanded"
      echo "    lands there too"
      echo "  a wildcard skips dot paths. when a hidden file would match, the"
      echo "    output says so and names --hidden"
      echo "  --output 'direct' is renamed 'pipeable'; the old value is"
      echo "    refused (exit 2) with the new name"
      echo ""
      echo "examples:"
      echo "  globsafe.sh --pattern 'src/**/*.ts'                  # glob pattern"
      echo "  globsafe.sh --pattern '*.[ref].md' --literal         # literal brackets"
      echo "  globsafe.sh --pattern '*.\\[ref\\].md'                 # escaped brackets"
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
      if [[ ${#PATTERNS[@]} -eq 0 ]]; then
        PATTERNS+=("$1")
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
  emit_refusal_with_hint "error: unknown option: $UNKNOWN_FLAG" \
    "check the flag name, or see the full option list" \
    "globsafe.sh --help"
  exit 2
fi

# pattern is required
if [[ ${#PATTERNS[@]} -eq 0 || -z "${PATTERNS[0]}" ]]; then
  emit_refusal_with_hint "error: --pattern is required" \
    "name the glob to match, as --pattern or as the first positional" \
    "globsafe.sh --pattern 'src/**/*.ts'"
  exit 2
fi

# the retired value `direct` gets its own arm: the generic refusal below would
# read as a typo, where the truth is a rename with a known replacement
if [[ "$OUTPUT_MODE" == "direct" ]]; then
  emit_refusal_with_hint "error: --output direct was renamed to pipeable
  got: direct" \
    "pass --output pipeable — same behavior, current name" \
    "globsafe.sh --pattern 'src/**/*.ts' --output pipeable"
  exit 2
fi

# validate output mode
if [[ "$OUTPUT_MODE" != "vibes" && "$OUTPUT_MODE" != "pipeable" ]]; then
  emit_refusal_with_hint "error: --output must be one of: vibes, pipeable
  got: $OUTPUT_MODE" \
    "name one of the two modes, or omit --output for vibes" \
    "globsafe.sh --pattern 'src/**/*.ts' --output pipeable"
  exit 2
fi

# validate sort option
if [[ "$SORT_BY" != "name" && "$SORT_BY" != "time" && "$SORT_BY" != "size" ]]; then
  emit_refusal_with_hint "error: --sort must be one of: name, time, size
  got: $SORT_BY" \
    "name one of the three orders, or omit --sort for name" \
    "globsafe.sh --pattern 'src/**/*.ts' --sort time"
  exit 2
fi

# validate --head is a positive integer of at most 18 digits
# .why = a caller typo exits 2, not a raw `set -u` error at exit 1.
#        19+ digits wrap negative in bash arithmetic (max 9223372036854775807).
#        `0` is refused: zero rows would read as a search that found zero.
#        grepsafe carries the same gate.
if [[ -n "$HEAD_LIMIT" ]] && ! [[ "$HEAD_LIMIT" =~ ^0*[1-9][0-9]{0,17}$ ]]; then
  emit_refusal_with_hint "error: --head must be a positive integer of at most 18 digits
  got: $HEAD_LIMIT" \
    "pass a whole number above zero, or omit --head for no limit" \
    "globsafe.sh --pattern 'src/**/*.ts' --head 20"
  exit 2
fi
# recast to decimal once, here: bash arithmetic reads `08` as octal and fails
[[ -n "$HEAD_LIMIT" ]] && HEAD_LIMIT=$((10#$HEAD_LIMIT))

# a positional root stands alone. beside another root it is most likely an
# unquoted glob the shell expanded, and a search of it would widen the result
# in silence. the refusal names the first two roots
if [[ "$ROOT_POSITIONAL" == true && ${#SEARCH_PATHS[@]} -gt 1 ]]; then
  emit_refusal_with_hint "error: the search root was named twice
  first: ${SEARCH_PATHS[0]}
  then:  ${SEARCH_PATHS[1]}" \
    "name each root with --path; a bare positional root stands alone" \
    "globsafe.sh --pattern '*.md' --path docs --path src"
  exit 2
fi
[[ ${#SEARCH_PATHS[@]} -eq 0 ]] && SEARCH_PATHS=(.)

# the patterns as the header shows them
PATTERN_SHOWN=""
for P in "${PATTERNS[@]}"; do
  PATTERN_SHOWN="${PATTERN_SHOWN:+$PATTERN_SHOWN, }$P"
done

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_refusal_with_hint "error: not in a git repository
  cwd: $(pwd)" \
    "cd into a git repo — globsafe bounds every search to one" \
    "cd ~/git/myrepo && globsafe.sh --pattern 'src/**/*.ts'"
  exit 2
fi

# get repo root
REPO_ROOT=$(realpath "$(git rev-parse --show-toplevel)")

# expand and validate every search root
SEARCH_PATHS_ABS=()
for SEARCH_PATH in "${SEARCH_PATHS[@]}"; do
  SEARCH_PATH_ABS=$(realpath "$SEARCH_PATH" 2>/dev/null || echo "")
  if [[ -z "$SEARCH_PATH_ABS" || ! -e "$SEARCH_PATH_ABS" ]]; then
    emit_refusal_with_hint "error: search path does not exist: $SEARCH_PATH" \
      "name a directory that exists, or omit --path to search from ." \
      "globsafe.sh --pattern '*.ts' --path src"
    exit 2
  fi

  if ! is_path_within_repo_root --path "$SEARCH_PATH_ABS" --root "$REPO_ROOT"; then
    emit_refusal_with_hint "error: search path must be within the git repository
  repo root:   $REPO_ROOT
  search path: $SEARCH_PATH_ABS" \
      "name a path under the repo root above" \
      "globsafe.sh --pattern '*.ts' --path src"
    exit 2
  fi
  SEARCH_PATHS_ABS+=("$SEARCH_PATH_ABS")
done

######################################################################
# find files
######################################################################

# .what = echo every file one pattern expands to, one per line, from the cwd
# .note = literal mode checks the path as typed, with no expansion
expand_pattern_here() {
  local pattern="$1" f
  if [[ "$LITERAL" == true ]]; then
    [[ -e "$pattern" ]] && printf '%s\n' "$pattern"
    return 0
  fi
  eval "for f in $pattern; do [[ -e \"\$f\" ]] && printf '%s\n' \"\$f\"; done" 2>/dev/null || true
}

# .what = is a path inside .git? dotglob reaches it, and naught there is a
#         file a caller means
is_git_internal() {
  [[ "$1" == .git || "$1" == .git/* || "$1" == */.git || "$1" == */.git/* ]]
}

# .what = echo the union of every pattern under every root, deduped
# .note = one root: paths relative to it, as the caller cd'd there. several
#         roots: each path carries its root as typed, so two roots never
#         collide on one relative name. dotglob on => .git is dropped
expand_all() {
  local i root prefix pattern line
  for i in "${!SEARCH_PATHS[@]}"; do
    root="${SEARCH_PATHS[$i]%/}"
    prefix=""
    [[ ${#SEARCH_PATHS[@]} -gt 1 && "$root" != "." ]] && prefix="$root/"
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      shopt -q dotglob && is_git_internal "$line" && continue
      printf '%s\n' "$prefix$line"
    done < <(
      cd "${SEARCH_PATHS_ABS[$i]}" || exit 2
      for pattern in "${PATTERNS[@]}"; do expand_pattern_here "$pattern"; done
    )
  done | awk '!seen[$0]++'
}

# sorts and stat run relative to the one root; several roots carry their
# root in each path, so they run from the caller's cwd
[[ ${#SEARCH_PATHS[@]} -eq 1 ]] && cd "${SEARCH_PATHS_ABS[0]}"

# collect matched files. --hidden lets a wildcard match a dot path
[[ "$HIDDEN" == true ]] && shopt -s dotglob
FILES=()
while IFS= read -r line; do
  FILES+=("$line")
done < <(expand_all)

# the hidden files a wildcard skipped: re-expand under dotglob, keep what the
# walk above did not return. literal mode expands naught, so it skips none
HIDDEN_SKIPPED=()
if [[ "$HIDDEN" != true && "$LITERAL" != true && "$OUTPUT_MODE" == "vibes" ]]; then
  declare -A FILES_SEEN=()
  for f in "${FILES[@]}"; do FILES_SEEN["$f"]=1; done
  shopt -s dotglob
  while IFS= read -r line; do
    [[ -n "${FILES_SEEN[$line]:-}" ]] && continue
    HIDDEN_SKIPPED+=("$line")
  done < <(expand_all)
  shopt -u dotglob
fi

# sort files (disable glob to preserve brackets in filenames)
set -f
case "$SORT_BY" in
  name)
    IFS=$'\n' FILES=($(printf '%s\n' "${FILES[@]}" | sort)); unset IFS
    ;;
  time)
    IFS=$'\n' FILES=($(for f in "${FILES[@]}"; do echo "$(stat -c '%Y' "$f" 2>/dev/null || stat -f '%m' "$f" 2>/dev/null || echo 0) $f"; done | sort -rn | cut -d' ' -f2-)); unset IFS
    ;;
  size)
    IFS=$'\n' FILES=($(for f in "${FILES[@]}"; do echo "$(stat -c '%s' "$f" 2>/dev/null || stat -f '%z' "$f" 2>/dev/null || echo 0) $f"; done | sort -rn | cut -d' ' -f2-)); unset IFS
    ;;
esac
set +f

FILE_COUNT=${#FILES[@]}

# apply head limit
TRUNCATED=false
if [[ -n "$HEAD_LIMIT" && $FILE_COUNT -gt $HEAD_LIMIT ]]; then
  FILES=("${FILES[@]:0:$HEAD_LIMIT}")
  TRUNCATED=true
fi

######################################################################
# output
######################################################################

# .what = the header every vibes outcome opens with
print_globsafe_header() {
  print_turtle_header "$1"
  print_tree_start "globsafe"
  local pattern_label=pattern path_label=path paths_shown="" p
  [[ ${#PATTERNS[@]} -gt 1 ]] && pattern_label=patterns
  [[ ${#SEARCH_PATHS[@]} -gt 1 ]] && path_label=paths
  for p in "${SEARCH_PATHS[@]}"; do
    paths_shown="${paths_shown:+$paths_shown, }$p"
  done
  print_tree_branch "$pattern_label" "$PATTERN_SHOWN"
  print_tree_branch "$path_label" "$paths_shown"
  [[ "$HIDDEN" == true ]] && print_tree_branch "scope" "dot paths included (--hidden)"
  return 0
}

# .what = the 🥥 that names the --hidden rerun, for a skipped hidden match
# .why  = the caller reaches the skipped files in one command
print_hidden_skips_hint() {
  local cmd="globsafe.sh" p
  for p in "${PATTERNS[@]}"; do cmd+=" --pattern '$p'"; done
  for p in "${SEARCH_PATHS[@]}"; do
    [[ "$p" != "." ]] && cmd+=" --path $p"
  done
  cmd+=" --hidden"
  echo ""
  echo "🥥 did you know?"
  echo "   ├─ a wildcard skips dot paths; --hidden lets it match them"
  echo "   └─ $cmd"
}

HIDDEN_COUNT=${#HIDDEN_SKIPPED[@]}

if [[ "$OUTPUT_MODE" == "pipeable" ]]; then
  # pipeable mode: just file paths, no vibes
  for FILE in "${FILES[@]}"; do
    echo "$FILE"
  done
else
  # vibes mode: turtle treestruct output
  if [[ $FILE_COUNT -eq 0 ]]; then
    print_globsafe_header "crickets..."
    if [[ "$HIDDEN_COUNT" -gt 0 ]]; then
      print_tree_leaf "files: 0 — none in the walked trees, but $HIDDEN_COUNT hidden path(s) match"
      print_hidden_skips_hint
    else
      print_tree_leaf "files: 0"
    fi

    # hint if pattern contains [ and --literal was not used
    PATTERN="${PATTERNS[0]}"
    if [[ "$LITERAL" != true && "$PATTERN" == *"["* ]]; then
      # escape brackets for display
      PATTERN_ESCAPED="${PATTERN//\[/\\[}"
      PATTERN_ESCAPED="${PATTERN_ESCAPED//\]/\\]}"
      echo ""
      echo "🥥 did you know?"
      echo "   ├─ pattern contains \`[\` which is a glob character"
      echo "   ├─ to treat \`[\` as literal, use either:"
      echo "   │  ├─ --literal flag: rhx globsafe --pattern '$PATTERN' --literal"
      echo "   │  └─ escape syntax: rhx globsafe --pattern '$PATTERN_ESCAPED'"
      echo "   └─ see: rhx globsafe --help"
    fi
  else
    print_globsafe_header "sweet"
    if [[ "$TRUNCATED" == true ]]; then
      print_tree_branch "files" "$FILE_COUNT (first $HEAD_LIMIT)"
    else
      print_tree_branch "files" "$FILE_COUNT"
    fi
    # a partial answer says so beside its count
    if [[ "$HIDDEN_COUNT" -gt 0 ]]; then
      print_tree_branch "skipped" "$HIDDEN_COUNT hidden path(s) also match"
    fi
    print_tree_leaf "found"

    # print results in sub.bucket
    echo "      ├─"
    echo "      │"

    for i in "${!FILES[@]}"; do
      FILE="${FILES[$i]}"

      if [[ "$LONG" == true ]]; then
        # detailed info: size and mtime
        FILE_SIZE=$(stat -c '%s' "$FILE" 2>/dev/null || stat -f '%z' "$FILE" 2>/dev/null || echo "?")
        FILE_MTIME=$(stat -c '%y' "$FILE" 2>/dev/null | cut -d'.' -f1 || stat -f '%Sm' "$FILE" 2>/dev/null || echo "?")

        # human-readable size
        if [[ "$FILE_SIZE" =~ ^[0-9]+$ ]]; then
          if [[ $FILE_SIZE -ge 1048576 ]]; then
            SIZE_HR="$((FILE_SIZE / 1048576))M"
          elif [[ $FILE_SIZE -ge 1024 ]]; then
            SIZE_HR="$((FILE_SIZE / 1024))K"
          else
            SIZE_HR="${FILE_SIZE}B"
          fi
        else
          SIZE_HR="?"
        fi

        echo "      │  ${SIZE_HR}  ${FILE_MTIME}  ${FILE}"
      else
        echo "      │  $FILE"
      fi
    done

    echo "      │"
    echo "      └─"

    # name the rerun that reaches each skipped hidden match
    if [[ "$HIDDEN_COUNT" -gt 0 ]]; then
      print_hidden_skips_hint
    fi
  fi
fi
