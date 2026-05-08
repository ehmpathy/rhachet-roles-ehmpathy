#!/usr/bin/env bash
######################################################################
# .what = run repo tests with turtle vibes summary and log capture
#
# .why  = enables lint enforcement in hooks:
#         - exit code 2 forces brain to address defects
#         - summary output saves tokens (details in log file)
#         - consistent vibes across mechanic skills
#
# usage:
#   git.repo.test.sh --what types                     # run type check
#   git.repo.test.sh --what format                    # run format check
#   git.repo.test.sh --what lint                      # run lint check
#   git.repo.test.sh --what unit                      # preview matched files (plan mode default)
#   git.repo.test.sh --what unit --mode apply         # run unit tests
#   git.repo.test.sh --what integration --mode apply  # run integration tests
#   git.repo.test.sh --what acceptance --mode apply   # run acceptance tests
#   git.repo.test.sh --what all --mode apply          # run all test types
#   git.repo.test.sh --what unit --scope 'invoice'    # filter by file path
#   git.repo.test.sh --what unit --scope 'path://src/domain' # match file path only
#   git.repo.test.sh --what unit --scope 'name://should return' # match test name only
#   git.repo.test.sh --what unit --scope getAllLeads --scope case3  # stack scopes
#   git.repo.test.sh --what unit --mode apply --resnap     # update snapshots
#   git.repo.test.sh --what unit --mode apply --thorough   # run full suite
#
# mode:
#   plan   - preview matched files (default)
#   apply  - execute tests
#
# scope patterns:
#   'foo'           - match file path (default)
#   'path://foo'    - match file path (explicit)
#   'name://foo'    - match test/describe name (jest --testNamePattern)
#   (multiple --scope flags stack together)
#
# guarantee:
#   - logs raw output to .log/role=mechanic/skill=git.repo.test/what=${WHAT}/
#   - auto keyrack unlock for integration/acceptance
#   - exit 0 = passed, exit 1 = malfunction, exit 2 = constraint
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# source shared output operations
CLAUDE_TOOLS_DIR="$SCRIPT_DIR/../claude.tools"
source "$CLAUDE_TOOLS_DIR/output.sh"

######################################################################
# helper: emit to both stdout and stderr
# usage: emit_to_both <<'EOF'
#   content here
# EOF
# or: generate_content | emit_to_both
######################################################################
emit_to_both() {
  local content
  content=$(cat)
  echo "$content"      # stdout
  echo "$content" >&2  # stderr
}

######################################################################
# constants
######################################################################
LOG_BASE=".log/role=mechanic/skill=git.repo.test"
# LOG_DIR computed after WHAT is parsed: ${LOG_BASE}/what=${WHAT}

######################################################################
# progressive output: timer in background
# prints elapsed seconds that stack (like git.release watch)
######################################################################
TIMER_PID=""

# temp file paths (must be declared before trap for set -u compatibility)
TEMP_STDOUT=""
TEMP_STDERR=""

start_timer() {
  # emit "status" parent branch once, then nested inflight lines
  echo "   ├─ status"
  echo "   │  ├─ 💤 inflight (0s)"
  (
    local start_time next_emit
    start_time=$(date +%s)
    next_emit=5  # first emit at 5s
    while true; do
      sleep 1
      local now elapsed
      now=$(date +%s)
      elapsed=$((now - start_time))
      if [[ $elapsed -ge $next_emit ]]; then
        echo "   │  ├─ 💤 inflight (${elapsed}s)"
        # every 5s for first 15s, then every 15s thereafter
        if [[ $elapsed -lt 15 ]]; then
          next_emit=$((next_emit + 5))
        else
          next_emit=$((next_emit + 15))
        fi
      fi
    done
  ) &
  TIMER_PID=$!
}

stop_timer() {
  if [[ -n "$TIMER_PID" ]]; then
    kill "$TIMER_PID" 2>/dev/null || true
    wait "$TIMER_PID" 2>/dev/null || true
    TIMER_PID=""
  fi
}

# cleanup timer on exit
trap 'stop_timer; rm -f "$TEMP_STDOUT" "$TEMP_STDERR"' EXIT

######################################################################
# validate jest config exists for unit/integration/acceptance
# returns 0 if valid, exits 2 if config absent
######################################################################
validate_jest_config() {
  local test_type="$1"

  # skip for types, format, lint (no jest config needed)
  if [[ "$test_type" == "types" ]] || [[ "$test_type" == "format" ]] || [[ "$test_type" == "lint" ]]; then
    return 0
  fi

  # determine expected config files based on test type (.js preferred, .ts fallback)
  local config_file_js=""
  local config_file_ts=""
  case "$test_type" in
    unit)
      config_file_js="jest.unit.config.js"
      config_file_ts="jest.unit.config.ts"
      ;;
    integration)
      config_file_js="jest.integration.config.js"
      config_file_ts="jest.integration.config.ts"
      ;;
    acceptance)
      config_file_js="jest.acceptance.config.js"
      config_file_ts="jest.acceptance.config.ts"
      ;;
  esac

  # check if either config file exists
  if [[ -n "$config_file_js" ]] && [[ ! -f "$REPO_ROOT/$config_file_js" ]] && [[ ! -f "$REPO_ROOT/$config_file_ts" ]]; then
    local _output
    _output=$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.repo.test --what $test_type"
      print_tree_branch "status" "constraint"
      echo "   └─ error: $config_file_ts not found"
      echo ""
      echo "hint: create $config_file_ts for ${test_type} tests"
      echo "      ehmpathy convention uses jest.{unit,integration,acceptance}.config.ts"
    )
    echo "$_output"      # stdout
    echo "$_output" >&2  # stderr
    exit 2
  fi
}

######################################################################
# get jest path pattern flag based on version
# jest ≤29: --testPathPattern (singular)
# jest ≥30: --testPathPatterns (plural)
######################################################################
get_jest_path_pattern_flag() {
  # read jest version from package.json (check both deps and devDeps)
  local jest_version
  jest_version=$(jq -r '.devDependencies.jest // .dependencies.jest // ""' "$REPO_ROOT/package.json" 2>/dev/null || echo "")

  # if jest not found, fail fast
  if [[ -z "$jest_version" ]]; then
    echo "--testPathPatterns"  # default to newer flag, let jest fail with clear error
    return
  fi

  # extract major version (strip prefix chars like ^, ~, >=, etc.)
  # e.g., ^29.7.0 → 29, ~30.0.0 → 30, >=29.0.0 → 29
  local jest_major
  jest_major=$(echo "$jest_version" | grep -oE '[0-9]+' | head -1)

  # if we couldn't parse a number, default to newer flag
  if [[ -z "$jest_major" ]] || ! [[ "$jest_major" =~ ^[0-9]+$ ]]; then
    echo "--testPathPatterns"
    return
  fi

  # jest ≤29 uses singular, jest ≥30 uses plural
  if [[ "$jest_major" -lt 30 ]]; then
    echo "--testPathPattern"
  else
    echo "--testPathPatterns"
  fi
}

######################################################################
# scope check: count matched files for scope
# returns count via stdout
######################################################################
get_scope_file_count() {
  local test_type="$1"
  local scope="$2"

  # skip for types, format, lint (no jest)
  if [[ "$test_type" == "types" ]] || [[ "$test_type" == "format" ]] || [[ "$test_type" == "lint" ]]; then
    echo "-1"  # -1 means N/A (these don't use jest)
    return
  fi

  # determine jest config file based on test type (.js preferred, .ts fallback)
  local jest_config=""
  case "$test_type" in
    unit)
      if [[ -f "$REPO_ROOT/jest.unit.config.js" ]]; then
        jest_config="-c ./jest.unit.config.js"
      elif [[ -f "$REPO_ROOT/jest.unit.config.ts" ]]; then
        jest_config="-c ./jest.unit.config.ts"
      fi
      ;;
    integration)
      if [[ -f "$REPO_ROOT/jest.integration.config.js" ]]; then
        jest_config="-c ./jest.integration.config.js"
      elif [[ -f "$REPO_ROOT/jest.integration.config.ts" ]]; then
        jest_config="-c ./jest.integration.config.ts"
      fi
      ;;
    acceptance)
      if [[ -f "$REPO_ROOT/jest.acceptance.config.js" ]]; then
        jest_config="-c ./jest.acceptance.config.js"
      elif [[ -f "$REPO_ROOT/jest.acceptance.config.ts" ]]; then
        jest_config="-c ./jest.acceptance.config.ts"
      fi
      ;;
  esac

  # use jest --listTests to get matched files
  # --no-install prevents npx from stall on "install jest?" prompt
  # respect THOROUGH flag: add --changedSince=main when not thorough
  local changed_since=""
  if [[ "$THOROUGH" != "true" ]]; then
    changed_since="--changedSince=main"
  fi

  # get the correct flag based on jest version (singular for ≤29, plural for ≥30)
  local path_flag
  path_flag=$(get_jest_path_pattern_flag)

  # only include path flag when scope is not "." (the default)
  # reason: --testPathPatterns "." overrides --changedSince behavior in jest
  local test_path_arg=""
  if [[ "$scope" != "." ]]; then
    test_path_arg="$path_flag $scope"
  fi

  local matched_files
  local jest_bin="$REPO_ROOT/node_modules/.bin/jest"

  # failfast if jest not installed
  if [[ ! -x "$jest_bin" ]]; then
    echo "-1"  # -1 means couldn't check
    return
  fi

  # shellcheck disable=SC2086
  if ! matched_files=$(nice -n 5 "$jest_bin" $jest_config --listTests $test_path_arg $changed_since 2>/dev/null); then
    echo "-1"  # -1 means couldn't check
    return
  fi

  # count non-empty lines (jest outputs one file per line)
  local file_count
  file_count=$(echo "$matched_files" | grep -cE '.+\.(tsx?|jsx?)$' 2>/dev/null || true)
  [[ -z "$file_count" ]] && file_count=0

  echo "$file_count"
}

######################################################################
# get matched files list for scope
# returns file paths via stdout (one per line)
######################################################################
get_scope_files() {
  local test_type="$1"
  local scope="$2"

  # skip for types, format, lint (no jest)
  if [[ "$test_type" == "types" ]] || [[ "$test_type" == "format" ]] || [[ "$test_type" == "lint" ]]; then
    return
  fi

  # determine jest config file based on test type (.js preferred, .ts fallback)
  local jest_config=""
  case "$test_type" in
    unit)
      if [[ -f "$REPO_ROOT/jest.unit.config.js" ]]; then
        jest_config="-c ./jest.unit.config.js"
      elif [[ -f "$REPO_ROOT/jest.unit.config.ts" ]]; then
        jest_config="-c ./jest.unit.config.ts"
      fi
      ;;
    integration)
      if [[ -f "$REPO_ROOT/jest.integration.config.js" ]]; then
        jest_config="-c ./jest.integration.config.js"
      elif [[ -f "$REPO_ROOT/jest.integration.config.ts" ]]; then
        jest_config="-c ./jest.integration.config.ts"
      fi
      ;;
    acceptance)
      if [[ -f "$REPO_ROOT/jest.acceptance.config.js" ]]; then
        jest_config="-c ./jest.acceptance.config.js"
      elif [[ -f "$REPO_ROOT/jest.acceptance.config.ts" ]]; then
        jest_config="-c ./jest.acceptance.config.ts"
      fi
      ;;
  esac

  # use jest --listTests to get matched files
  # respect THOROUGH flag: add --changedSince=main when not thorough
  local changed_since=""
  if [[ "$THOROUGH" != "true" ]]; then
    changed_since="--changedSince=main"
  fi

  # only include --testPathPatterns when scope is not "." (the default)
  # reason: --testPathPatterns "." overrides --changedSince behavior in jest
  local test_path_arg=""
  if [[ "$scope" != "." ]]; then
    test_path_arg="--testPathPatterns $scope"
  fi

  local matched_files
  local jest_bin="$REPO_ROOT/node_modules/.bin/jest"

  # skip if jest not installed
  if [[ ! -x "$jest_bin" ]]; then
    return
  fi

  # shellcheck disable=SC2086
  if ! matched_files=$(nice -n 5 "$jest_bin" $jest_config --listTests $test_path_arg $changed_since 2>/dev/null); then
    return
  fi

  # output lines that look like file paths (absolute or relative .ts/.js/.tsx/.jsx)
  # sort for deterministic output across runs
  echo "$matched_files" | grep -E '\.(tsx?|jsx?)$' 2>/dev/null | sort || true
}

######################################################################
# output plan mode result with file list
######################################################################
output_plan_mode() {
  local display_args="$1"
  local scope="$2"
  local scope_mode="$3"
  local file_count="$4"
  local files_output="$5"
  local resnap="${6:-false}"
  local max_display=21

  print_turtle_header "heres the wave..."
  print_tree_start "git.repo.test $display_args"

  # show scope info
  echo "   ├─ scope: $scope"
  echo "   │  └─ matched: $file_count files"

  # show file list
  echo "   └─ files"
  local total_files="$file_count"
  local rest=0
  local files_to_show="$max_display"

  if [[ "$total_files" -gt "$max_display" ]]; then
    rest=$((total_files - max_display))
  fi

  # collect files into array for proper last-item detection
  local -a file_array=()
  while IFS= read -r file_path; do
    [[ -z "$file_path" ]] && continue
    file_array+=("$file_path")
    [[ ${#file_array[@]} -ge $max_display ]] && break
  done <<< "$files_output"

  local display_count=${#file_array[@]}
  if [[ $display_count -eq 0 ]]; then
    echo "      └─ (none)"
  else
    for i in "${!file_array[@]}"; do
      local rel_path="${file_array[$i]#$REPO_ROOT/}"
      local is_last=$(( i == display_count - 1 ))

      if [[ $is_last -eq 1 ]]; then
        if [[ $rest -gt 0 ]]; then
          echo "      ├─ $rel_path"
          echo "      └─ ... ($rest more, $total_files total)"
        else
          echo "      └─ $rel_path"
        fi
      else
        echo "      ├─ $rel_path"
      fi
    done
  fi

  # warn if --resnap used with plan mode
  if [[ "$resnap" == "true" ]]; then
    echo ""
    echo "⚠️  note: --resnap has no effect in plan mode"
  fi

  # hint as coconut
  echo ""
  echo "🥥 did you know?"
  echo "   └─ run with \`--mode apply\` to execute"
}

######################################################################
# scope preview: show matched files before run
######################################################################
preview_scope_matches() {
  local scope="$1"
  local file_count="$2"
  local files_output="$3"
  local max_display=21

  echo "   ├─ scope: $scope"
  echo "   │  └─ matched: $file_count files"

  # show file list (peer to scope, not nested)
  echo "   ├─ files"
  local total_files="$file_count"
  local rest=0

  if [[ "$total_files" -gt "$max_display" ]]; then
    rest=$((total_files - max_display))
  fi

  # collect files into array for proper last-item detection
  local -a file_array=()
  while IFS= read -r file_path; do
    [[ -z "$file_path" ]] && continue
    file_array+=("$file_path")
    [[ ${#file_array[@]} -ge $max_display ]] && break
  done <<< "$files_output"

  local display_count=${#file_array[@]}
  if [[ $display_count -eq 0 ]]; then
    echo "   │  └─ (none)"
  else
    for i in "${!file_array[@]}"; do
      local rel_path="${file_array[$i]#$REPO_ROOT/}"
      local is_last=$(( i == display_count - 1 ))

      if [[ $is_last -eq 1 ]]; then
        if [[ $rest -gt 0 ]]; then
          echo "   │  ├─ $rel_path"
          echo "   │  └─ ... ($rest more, $total_files total)"
        else
          echo "   │  └─ $rel_path"
        fi
      else
        echo "   │  ├─ $rel_path"
      fi
    done
  fi
}

######################################################################
# parse arguments
######################################################################
WHAT=""
WHEN=""
SCOPES=()  # array to support multiple --scope flags
MODE="plan"  # plan | apply (plan = preview files, apply = run tests)
RESNAP=false
THOROUGH=false
LOG_MODE="auto"  # auto | always (auto = persist on failure; always = persist always)
MULTI_CHILD=false  # internal flag: set when invoked as child of multi-mode
TIMEOUT=""  # optional timeout in seconds (e.g., "30" for 30s)
REST_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --what)
      WHAT="$2"
      shift 2
      ;;
    --when)
      WHEN="$2"
      shift 2
      ;;
    --scope)
      # skip empty scope values
      [[ -n "$2" ]] && SCOPES+=("$2")
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --resnap)
      RESNAP=true
      shift
      ;;
    --thorough)
      THOROUGH=true
      shift
      ;;
    --log)
      LOG_MODE="$2"
      shift 2
      ;;
    --_multi-child)
      MULTI_CHILD=true
      shift
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --)
      shift
      REST_ARGS=("$@")
      break
      ;;
    --help|-h)
      echo "usage: git.repo.test.sh --what <type> [--mode plan|apply] [--scope <pattern>] [--resnap] [--thorough]"
      echo ""
      echo "run repo tests with turtle vibes summary and log capture"
      echo ""
      echo "options:"
      echo "  --what <type>       test type: types | format | lint | unit | integration | acceptance | all"
      echo "  --mode <mode>       plan | apply (default: plan)"
      echo "                        plan  = preview matched files"
      echo "                        apply = execute tests"
      echo "  --scope <pattern>   filter tests by pattern (regex supported, stackable)"
      echo "                        'foo'           match file path (default)"
      echo "                        'path://foo'    match file path (explicit)"
      echo "                        'name://foo'    match test/describe name"
      echo "                        (use multiple --scope flags to combine filters)"
      echo "  --resnap            update snapshots (sets RESNAP=true, requires --mode apply)"
      echo "  --thorough          run full suite (sets THOROUGH=true)"
      echo "  --timeout <secs>    max time in seconds before timeout"
      echo "  --log <mode>        auto | always (default: auto)"
      echo "                        auto = persist logs on failure only"
      echo "                        always = persist logs on success and failure"
      echo "  --help, -h          show this help"
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1"
      exit 2
      ;;
  esac
done

######################################################################
# parse scope patterns: uri format (path://foo, name://foo)
# supports multiple --scope flags that stack together
######################################################################
PATH_PATTERNS=()   # patterns to filter by file path
NAME_PATTERNS=()   # patterns to filter by test name
SCOPE=""           # legacy: first scope for display and backwards compat
SCOPE_MODE="both"  # legacy: both | path | name (for first scope only)
SCOPE_PATTERN=""   # legacy: pattern for first scope

for scope_item in "${SCOPES[@]}"; do
  # set legacy SCOPE to first item for backwards compatibility
  [[ -z "$SCOPE" ]] && SCOPE="$scope_item"

  # uri format: path://foo or name://foo
  if [[ "$scope_item" =~ ^path://(.+)$ ]]; then
    PATH_PATTERNS+=("${BASH_REMATCH[1]}")
    # set legacy mode/pattern for first scope
    if [[ "${#SCOPES[@]}" -eq 1 ]] || [[ "$scope_item" == "${SCOPES[0]}" ]]; then
      SCOPE_MODE="path"
      SCOPE_PATTERN="${BASH_REMATCH[1]}"
    fi
  elif [[ "$scope_item" =~ ^name://(.+)$ ]]; then
    NAME_PATTERNS+=("${BASH_REMATCH[1]}")
    # set legacy mode/pattern for first scope
    if [[ "${#SCOPES[@]}" -eq 1 ]] || [[ "$scope_item" == "${SCOPES[0]}" ]]; then
      SCOPE_MODE="name"
      SCOPE_PATTERN="${BASH_REMATCH[1]}"
    fi
  else
    # bare scope defaults to path
    PATH_PATTERNS+=("$scope_item")
    # set legacy mode/pattern for first scope
    if [[ "${#SCOPES[@]}" -eq 1 ]] || [[ "$scope_item" == "${SCOPES[0]}" ]]; then
      SCOPE_MODE="both"
      SCOPE_PATTERN="$scope_item"
    fi
  fi
done

######################################################################
# block raw filter flags in REST_ARGS
######################################################################
for arg in "${REST_ARGS[@]}"; do
  if [[ "$arg" == "--testNamePattern" ]] || [[ "$arg" == "-t" ]]; then
    _output=$(
      print_turtle_header "hold up, dude..."
      print_tree_start "git.repo.test"
      echo "   └─ ✋ blocked: raw --testNamePattern detected"
      echo ""
      echo "🥥 did you know?"
      echo "   ├─ --scope 'foo' filters by file path"
      echo "   ├─ --scope 'path://foo' filters by file path (explicit)"
      echo "   └─ --scope 'name://foo' filters by test name"
    )
    echo "$_output"      # stdout
    echo "$_output" >&2  # stderr
    exit 2
  fi
  if [[ "$arg" == "--testPathPattern" ]] || [[ "$arg" == "--testPathPatterns" ]]; then
    _output=$(
      print_turtle_header "hold up, dude..."
      print_tree_start "git.repo.test"
      echo "   └─ ✋ blocked: raw $arg detected"
      echo ""
      echo "🥥 did you know?"
      echo "   ├─ --scope 'foo' filters by file path"
      echo "   ├─ --scope 'path://foo' filters by file path (explicit)"
      echo "   └─ --scope 'name://foo' filters by test name"
    )
    echo "$_output"      # stdout
    echo "$_output" >&2  # stderr
    exit 2
  fi
done

######################################################################
# validate arguments
######################################################################
if [[ -z "$WHAT" ]]; then
  _output=$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.repo.test"
    echo "   └─ error: --what is required"
    echo ""
    echo "usage: git.repo.test.sh --what <lint|unit|integration|acceptance|all>"
  )
  echo "$_output"      # stdout
  echo "$_output" >&2  # stderr
  exit 2
fi

# validate --what value(s)
# supports: single value, comma-separated list, or "all"
VALID_TYPES=("types" "format" "lint" "unit" "integration" "acceptance")

# "all" means the traditional test types (not types/format which are optional)
ALL_TYPES=("lint" "unit" "integration" "acceptance")

validate_what_value() {
  local value="$1"
  for valid in "${VALID_TYPES[@]}"; do
    if [[ "$value" == "$valid" ]]; then
      return 0
    fi
  done
  return 1
}

# check if comma-separated
if [[ "$WHAT" == *","* ]]; then
  # split and validate each
  IFS=',' read -ra WHAT_TYPES <<< "$WHAT"
  for wtype in "${WHAT_TYPES[@]}"; do
    if ! validate_what_value "$wtype"; then
      _output=$(
        print_turtle_header "bummer dude..."
        print_tree_start "git.repo.test --what $WHAT"
        echo "   └─ error: invalid type '$wtype' in --what list"
        echo ""
        echo "valid values: types | format | lint | unit | integration | acceptance | all"
        echo "example: --what types,lint,unit"
      )
      echo "$_output"      # stdout
      echo "$_output" >&2  # stderr
      exit 2
    fi
  done
  # mark as multi-mode
  MULTI_MODE=true
elif [[ "$WHAT" == "all" ]]; then
  WHAT_TYPES=("${ALL_TYPES[@]}")
  MULTI_MODE=true
else
  # single value validation
  if ! validate_what_value "$WHAT"; then
    _output=$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.repo.test --what $WHAT"
      echo "   └─ error: invalid --what value '$WHAT'"
      echo ""
      echo "valid values: types | format | lint | unit | integration | acceptance | all"
      echo "example: --what types,lint,unit"
    )
    echo "$_output"      # stdout
    echo "$_output" >&2  # stderr
    exit 2
  fi
  MULTI_MODE=false
fi

# compute namespaced log directory
LOG_DIR="${LOG_BASE}/what=${WHAT}"

######################################################################
# validate mode
######################################################################
if [[ "$MODE" != "plan" ]] && [[ "$MODE" != "apply" ]]; then
  _output=$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.repo.test --what $WHAT"
    echo "   └─ error: invalid --mode value '$MODE'"
    echo ""
    echo "valid values: plan | apply"
    echo "  plan  = preview matched files (default)"
    echo "  apply = execute tests"
  )
  echo "$_output"      # stdout
  echo "$_output" >&2  # stderr
  exit 2
fi

# note: --resnap note for plan mode is shown inline in output_plan_mode

######################################################################
# validate git repo context
######################################################################
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  _output=$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.repo.test --what $WHAT"
    echo "   └─ error: not in a git repository"
  )
  echo "$_output"      # stdout
  echo "$_output" >&2  # stderr
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)

######################################################################
# validate package.json
######################################################################
if [[ ! -f "$REPO_ROOT/package.json" ]]; then
  _output=$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.repo.test --what $WHAT"
    echo "   └─ error: no package.json found"
    echo ""
    echo "this skill requires a node.js project with package.json"
  )
  echo "$_output"      # stdout
  echo "$_output" >&2  # stderr
  exit 2
fi

######################################################################
# validate npm command exists (skip for --what all, checked per-type)
######################################################################
validate_npm_command() {
  local test_type="$1"
  local cmd="test:${test_type}"
  if ! grep -q "\"$cmd\"" "$REPO_ROOT/package.json"; then
    # hook.onStop context: silently exit — repo may lack this command
    if [[ "$WHEN" == "hook.onStop" ]]; then
      exit 0
    fi

    local _output
    _output=$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.repo.test --what $test_type"
      print_tree_branch "status" "constraint"
      echo "   └─ error: no '$cmd' command in package.json"
      echo ""
      echo "hint: ehmpathy convention uses 'test:lint', 'test:unit', 'test:integration', 'test:acceptance'"
    )
    echo "$_output"      # stdout
    echo "$_output" >&2  # stderr
    exit 2
  fi
}

# validate npm command exists (skip for multi-mode - validated per-type in loop)
if [[ "$MULTI_MODE" != "true" ]]; then
  validate_npm_command "$WHAT"
fi

# validate jest config exists (skip for multi-mode - validated per-type in loop)
if [[ "$MULTI_MODE" != "true" ]]; then
  validate_jest_config "$WHAT"
fi

######################################################################
# keyrack unlock (integration/acceptance only)
######################################################################
KEYRACK_STATUS=""

unlock_keyrack() {
  # skip for types, format, lint, and unit — only integration/acceptance need credentials
  local test_type="$1"
  if [[ "$test_type" == "types" ]] || [[ "$test_type" == "format" ]] || [[ "$test_type" == "lint" ]] || [[ "$test_type" == "unit" ]]; then
    return 0
  fi

  # unlock keyrack for integration/acceptance
  local unlock_output
  if unlock_output=$(rhx keyrack unlock --owner ehmpath --env test 2>&1); then
    KEYRACK_STATUS="unlocked ehmpath/test"
    # export credentials as env vars so subprocesses can access them
    eval "$(rhx keyrack source --owner ehmpath --env test --lenient 2>/dev/null)" || true
    return 0
  else
    local _output
    _output=$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.repo.test --what $test_type"
      print_tree_branch "status" "malfunction"
      echo "   └─ error: keyrack unlock failed"
      echo ""
      echo "hint: check keyrack setup with 'rhx keyrack status --owner ehmpath'"
      echo ""
      echo "$unlock_output"
    )
    echo "$_output"      # stdout
    echo "$_output" >&2  # stderr
    exit 1
  fi
}

# unlock keyrack (skip for multi-mode - handled per-type in loop)
if [[ "$MULTI_MODE" != "true" ]]; then
  unlock_keyrack "$WHAT"
fi

######################################################################
# findsert log directory and .gitignore
######################################################################
LOG_PATH="$REPO_ROOT/$LOG_DIR"
mkdir -p "$LOG_PATH"

GITIGNORE_PATH="$LOG_PATH/.gitignore"
if [[ ! -f "$GITIGNORE_PATH" ]]; then
  echo "# auto-generated by git.repo.test skill" > "$GITIGNORE_PATH"
  echo "*" >> "$GITIGNORE_PATH"
fi

######################################################################
# generate isotime filename (filesystem-safe: colons to hyphens)
######################################################################
ISOTIME=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
STDOUT_LOG="$LOG_PATH/${ISOTIME}.stdout.log"
STDERR_LOG="$LOG_PATH/${ISOTIME}.stderr.log"

# temp files for capture (only persist to log on error)
TEMP_STDOUT=$(mktemp)
TEMP_STDERR=$(mktemp)
# note: trap for cleanup is set in timer section above

######################################################################
# build and run test command
######################################################################
cd "$REPO_ROOT"

# build args for display
DISPLAY_ARGS="--what $WHAT"
for scope_item in "${SCOPES[@]}"; do
  DISPLAY_ARGS="$DISPLAY_ARGS --scope $scope_item"
done
[[ "$MODE" == "apply" ]] && DISPLAY_ARGS="$DISPLAY_ARGS --mode apply"
[[ "$RESNAP" == "true" ]] && DISPLAY_ARGS="$DISPLAY_ARGS --resnap"
[[ "$THOROUGH" == "true" ]] && DISPLAY_ARGS="$DISPLAY_ARGS --thorough"

######################################################################
# parse lint output (for defect count)
######################################################################
parse_lint_output() {
  local stdout_file="$1"
  local error_count=0

  if [[ -f "$stdout_file" ]]; then
    # biome outputs "Found X errors" or "X error(s)"
    if grep -qiE "found [0-9]+ errors?" "$stdout_file"; then
      error_count=$(grep -oiE "found [0-9]+ errors?" "$stdout_file" | grep -oE "[0-9]+" | head -1 || echo "0")
    # eslint outputs "X problems (Y errors, Z warnings)" or "X errors"
    elif grep -qE "[0-9]+ errors?" "$stdout_file"; then
      error_count=$(grep -oE "[0-9]+ errors?" "$stdout_file" | head -1 | grep -oE "[0-9]+" || echo "0")
    fi
  fi

  echo "$error_count"
}

######################################################################
# parse jest output (for stats)
######################################################################
parse_jest_output() {
  local stdout_file="$1"

  # defaults
  JEST_SUITES=""
  JEST_PASSED=""
  JEST_FAILED=""
  JEST_SKIPPED=""
  JEST_TOTAL=""
  JEST_TIME=""
  JEST_NO_TESTS=false

  if [[ ! -f "$stdout_file" ]]; then
    return
  fi

  # detect no tests matched
  if grep -qE "No tests found|testPathPattern.*matched 0 files" "$stdout_file"; then
    JEST_NO_TESTS=true
    return
  fi

  # parse Test Suites line: "Test Suites: 3 passed, 3 total" or "Test Suites: 1 failed, 2 passed, 3 total"
  local suites_line
  suites_line=$(grep -E "Test Suites:" "$stdout_file" | tail -1 || true)
  if [[ -n "$suites_line" ]]; then
    # extract total from end
    JEST_SUITES=$(echo "$suites_line" | grep -oE "[0-9]+ total" | grep -oE "[0-9]+" || echo "")
  fi

  # parse Tests line: "Tests: 12 passed, 2 skipped, 14 total" or "Tests: 1 failed, 11 passed, 2 skipped, 14 total"
  # note: jest 30 may output "Tests: 0 total" with no passed/failed/skipped when testNamePattern matches 0
  local tests_line
  tests_line=$(grep -E "^Tests:" "$stdout_file" | tail -1 || true)
  if [[ -n "$tests_line" ]]; then
    JEST_PASSED=$(echo "$tests_line" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" || echo "0")
    JEST_FAILED=$(echo "$tests_line" | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+" || echo "0")
    JEST_SKIPPED=$(echo "$tests_line" | grep -oE "[0-9]+ skipped" | grep -oE "[0-9]+" || echo "0")
    # parse total if present, otherwise compute from components
    local total_field
    total_field=$(echo "$tests_line" | grep -oE "[0-9]+ total" | grep -oE "[0-9]+" || echo "")
    if [[ -n "$total_field" ]]; then
      JEST_TOTAL="$total_field"
    else
      # jest 30 may not include "total" field - compute from passed+failed+skipped
      JEST_TOTAL=$((${JEST_PASSED:-0} + ${JEST_FAILED:-0} + ${JEST_SKIPPED:-0}))
    fi
  fi

  # parse Time line: "Time: 12.345 s" or "Time: 1.234s"
  local time_line
  time_line=$(grep -E "^Time:" "$stdout_file" | tail -1 || true)
  if [[ -n "$time_line" ]]; then
    JEST_TIME=$(echo "$time_line" | grep -oE "[0-9]+\.?[0-9]*" | head -1 || echo "")
    [[ -n "$JEST_TIME" ]] && JEST_TIME="${JEST_TIME}s"
  fi
}

######################################################################
# run single test type
######################################################################
run_single_test() {
  local test_type="$1"
  local temp_stdout="$2"
  local temp_stderr="$3"

  # build npm command
  local npm_cmd="npm run test:${test_type}"

  # build jest args
  local jest_args=()

  # add scope filters (skip for lint)
  # supports stacked scopes: multiple path patterns AND name patterns
  if [[ "$test_type" != "lint" ]]; then
    # add path patterns
    if [[ ${#PATH_PATTERNS[@]} -gt 0 ]]; then
      local path_flag
      path_flag=$(get_jest_path_pattern_flag)
      for pattern in "${PATH_PATTERNS[@]}"; do
        jest_args+=("$path_flag" "$pattern")
      done
    fi

    # add name patterns (test name filter only, does not filter file list)
    if [[ ${#NAME_PATTERNS[@]} -gt 0 ]]; then
      for pattern in "${NAME_PATTERNS[@]}"; do
        jest_args+=("--testNamePattern" "$pattern")
      done
    fi
  fi

  # add REST_ARGS (skip for lint)
  if [[ ${#REST_ARGS[@]} -gt 0 ]] && [[ "$test_type" != "lint" ]]; then
    jest_args+=("${REST_ARGS[@]}")
  fi

  # build full command with args
  if [[ ${#jest_args[@]} -gt 0 ]]; then
    npm_cmd="$npm_cmd -- ${jest_args[*]}"
  fi

  # set env vars
  local env_prefix=""
  if [[ "$RESNAP" == "true" ]] && [[ "$test_type" != "lint" ]]; then
    env_prefix="RESNAP=true "
  fi
  if [[ "$THOROUGH" == "true" ]]; then
    env_prefix="${env_prefix}THOROUGH=true "
  fi

  # run command (with optional timeout, at lower priority to avoid lockup)
  local exit_code=0
  if [[ -n "$TIMEOUT" ]]; then
    timeout "${TIMEOUT}s" nice -n 5 bash -c "${env_prefix}${npm_cmd}" > "$temp_stdout" 2> "$temp_stderr" || exit_code=$?
  else
    nice -n 5 bash -c "${env_prefix}${npm_cmd}" > "$temp_stdout" 2> "$temp_stderr" || exit_code=$?
  fi

  return $exit_code
}

######################################################################
# output success for single test
# note: header/tree start already printed progressively
######################################################################
output_success() {
  local test_type="$1"
  local rel_stdout="$2"
  local rel_stderr="$3"
  local progressive="${4:-false}"
  local total_time="${5:-}"

  # only print header if not progressive (e.g., --what all)
  if [[ "$progressive" != "true" ]]; then
    print_turtle_header "cowabunga!"
    print_tree_start "git.repo.test $DISPLAY_ARGS"

    # keyrack line if applicable
    if [[ -n "$KEYRACK_STATUS" ]]; then
      print_tree_branch "keyrack" "$KEYRACK_STATUS"
    fi
    print_tree_branch "status" "passed"
  else
    # progressive mode: emit nested passed line under status parent
    if [[ -n "$total_time" ]]; then
      echo "   │  └─ 🎉 passed (${total_time}s)"
    else
      echo "   │  └─ 🎉 passed"
    fi
  fi

  # stats for non-lint tests
  if [[ "$test_type" != "lint" ]] && [[ -n "$JEST_SUITES" ]]; then
    echo "   ├─ stats"
    echo "   │  ├─ suites: ${JEST_SUITES} files"
    echo "   │  ├─ tests: ${JEST_PASSED:-0} passed, ${JEST_FAILED:-0} failed, ${JEST_SKIPPED:-0} skipped"
    echo "   │  └─ time: ${total_time:-?}s"
  fi

  # log section based on LOG_MODE
  if [[ "$LOG_MODE" == "always" ]]; then
    # always mode: logs persisted, show paths
    echo "   └─ log"
    echo "      ├─ stdout: $rel_stdout"
    echo "      └─ stderr: $rel_stderr"
  else
    # auto mode: logs not persisted on success
    echo "   └─ log"
    echo "      ├─ omitted on success by default"
    echo "      └─ hint: use \`--log always\` to persist when desired"
  fi
}

######################################################################
# output failure for single test
# note: header/tree start already printed progressively
######################################################################
output_failure() {
  local test_type="$1"
  local rel_stdout="$2"
  local rel_stderr="$3"
  local is_malfunction="$4"
  local progressive="${5:-false}"
  local total_time="${6:-}"

  # only print header if not progressive (e.g., --what all)
  if [[ "$progressive" != "true" ]]; then
    print_turtle_header "bummer dude..."
    print_tree_start "git.repo.test $DISPLAY_ARGS"

    # keyrack line if applicable
    if [[ -n "$KEYRACK_STATUS" ]]; then
      print_tree_branch "keyrack" "$KEYRACK_STATUS"
    fi
  fi

  if [[ "$is_malfunction" == "true" ]]; then
    if [[ "$progressive" == "true" ]]; then
      if [[ -n "$total_time" ]]; then
        echo "   │  └─ 💥 malfunction (${total_time}s)"
      else
        echo "   │  └─ 💥 malfunction"
      fi
    else
      print_tree_branch "status" "malfunction"
    fi
    echo "   └─ log: $rel_stderr"
    echo ""
    echo "npm command failed. check the log for details."
  else
    if [[ "$progressive" == "true" ]]; then
      if [[ -n "$total_time" ]]; then
        echo "   │  └─ ✋ failed (${total_time}s)"
      else
        echo "   │  └─ ✋ failed"
      fi
    else
      print_tree_branch "status" "failed"
    fi

    # stats for non-lint tests
    if [[ "$test_type" != "lint" ]] && [[ -n "$JEST_SUITES" ]]; then
      echo "   ├─ stats"
      echo "   │  ├─ suites: ${JEST_SUITES} files"
      echo "   │  ├─ tests: ${JEST_PASSED:-0} passed, ${JEST_FAILED:-0} failed, ${JEST_SKIPPED:-0} skipped"
      echo "   │  └─ time: ${total_time:-?}s"
    elif [[ "$test_type" == "lint" ]]; then
      local error_count
      error_count=$(parse_lint_output "$TEMP_STDOUT")
      if [[ "$error_count" -gt 0 ]]; then
        print_tree_branch "defects" "$error_count"
      fi
    fi

    # log section
    echo "   ├─ log"
    echo "   │  ├─ stdout: $rel_stdout"
    echo "   │  └─ stderr: $rel_stderr"

    # tip
    if [[ "$test_type" == "lint" ]]; then
      echo "   └─ tip: try \`npm run fix\` then rerun, or Read the log path above for details"
    else
      echo "   └─ tip: Read the log for full test output and failure details"
    fi
  fi
}

######################################################################
# output no tests matched
# note: header/tree start already printed progressively
######################################################################
output_no_tests() {
  local progressive="${1:-false}"
  local has_scope="${2:-false}"

  # only print header if not progressive
  if [[ "$progressive" != "true" ]]; then
    if [[ "$has_scope" == "true" ]]; then
      print_turtle_header "bummer dude..."
    else
      print_turtle_header "all clear..."
    fi
    print_tree_start "git.repo.test $DISPLAY_ARGS"
  fi

  if [[ "$has_scope" == "true" ]]; then
    local scope_display
    scope_display=$(printf "%s + " "${SCOPES[@]}" | sed 's/ + $//')
    print_tree_branch "status" "constraint"
    echo "   └─ error: no tests matched scope '$scope_display'"
    echo ""
    echo "hint: check the scope pattern or run without --scope to see all tests"
  else
    print_tree_branch "status" "skipped"
    echo "   ├─ files: 0 (no test files changed since origin/main)"
    echo "   └─ tests: 0 (no tests to run)"
    echo ""
    echo "🥥 did you know?"
    echo "   ├─ jest --changedSince may miss some file changes"
    echo "   └─ use --scope and --thorough to target tests directly"
  fi
}

######################################################################
# handle multi-mode (comma-separated or "all")
# just loop and run each type as separate invocation
######################################################################
if [[ "$MULTI_MODE" == "true" ]]; then
  SCRIPT_PATH="${BASH_SOURCE[0]}"
  MULTI_EXIT_CODE=0

  # emit turtle header once for multi-mode
  print_turtle_header "lets ride..."

  for test_type in "${WHAT_TYPES[@]}"; do
    # build args for this type
    type_args=("--what" "$test_type")
    for scope_item in "${SCOPES[@]}"; do
      type_args+=("--scope" "$scope_item")
    done
    [[ -n "$MODE" ]] && type_args+=("--mode" "$MODE")
    [[ "$RESNAP" == "true" ]] && type_args+=("--resnap")
    [[ "$THOROUGH" == "true" ]] && type_args+=("--thorough")
    [[ "$LOG_MODE" != "auto" ]] && type_args+=("--log" "$LOG_MODE")
    [[ -n "$WHEN" ]] && type_args+=("--when" "$WHEN")
    [[ ${#REST_ARGS[@]} -gt 0 ]] && type_args+=("--" "${REST_ARGS[@]}")

    # run this type (output goes directly to stdout/stderr)
    # pass --_multi-child to suppress turtle header in child
    bash "$SCRIPT_PATH" "${type_args[@]}" --_multi-child || MULTI_EXIT_CODE=$?

    # stop on first failure
    if [[ $MULTI_EXIT_CODE -ne 0 ]]; then
      exit $MULTI_EXIT_CODE
    fi

    # blank line between types
    echo ""
  done

  exit $MULTI_EXIT_CODE
fi

######################################################################
# run single test type (non-all)
######################################################################

# for types/format/lint, plan mode has no meaning - treat as apply
if [[ "$MODE" == "plan" ]] && [[ "$WHAT" == "types" || "$WHAT" == "format" || "$WHAT" == "lint" ]]; then
  MODE="apply"
fi

######################################################################
# handle plan mode for jest-based tests
######################################################################
if [[ "$MODE" == "plan" ]]; then
  # determine local_scope for file count check
  # - use first path pattern if any, since jest --listTests filters by path
  # - use "." if no path patterns (name:// doesn't filter file list)
  local_scope="."
  if [[ ${#PATH_PATTERNS[@]} -gt 0 ]]; then
    local_scope="${PATH_PATTERNS[0]}"
  fi

  # get file count
  SCOPE_FILE_COUNT=$(get_scope_file_count "$WHAT" "$local_scope")

  # if count check failed, fall back to apply mode with warning
  if [[ "$SCOPE_FILE_COUNT" == "-1" ]]; then
    _output=$(
      print_turtle_header "hold up..."
      print_tree_start "git.repo.test $DISPLAY_ARGS"
      echo "   └─ warning: could not list matched files"
      echo ""
      echo "hint: jest --listTests may have failed"
      echo "      try: rhx git.repo.test --what $WHAT --mode apply"
    )
    echo "$_output"
    exit 1
  fi

  # handle 0 matches
  if [[ "$SCOPE_FILE_COUNT" == "0" ]]; then
    _output=$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.repo.test $DISPLAY_ARGS"
      scope_display="all"
      if [[ ${#SCOPES[@]} -gt 0 ]]; then
        scope_display=$(printf "%s + " "${SCOPES[@]}" | sed 's/ + $//')
      fi
      echo "   ├─ scope: $scope_display"
      echo "   │  └─ matched: 0 files"
      echo "   └─ error: no files matched"
      echo ""
      if [[ ${#SCOPES[@]} -gt 0 ]]; then
        echo "hint: check the scope pattern or try without --scope"
      else
        echo "hint: check that test files exist for --what $WHAT"
      fi
    )
    echo "$_output"      # stdout
    echo "$_output" >&2  # stderr
    exit 2
  fi

  # get the actual file list
  FILES_OUTPUT=$(get_scope_files "$WHAT" "$local_scope")

  # build scope display (join all scopes or show "all")
  SCOPE_DISPLAY="all"
  if [[ ${#SCOPES[@]} -gt 0 ]]; then
    SCOPE_DISPLAY=$(printf "%s + " "${SCOPES[@]}" | sed 's/ + $//')
  fi

  # output plan mode result
  output_plan_mode "$DISPLAY_ARGS" "$SCOPE_DISPLAY" "$SCOPE_MODE" "$SCOPE_FILE_COUNT" "$FILES_OUTPUT" "$RESNAP"

  # done - plan mode complete
  exit 0
fi

######################################################################
# apply mode: run tests
######################################################################

# emit progressive header immediately (skip if multi-child)
if [[ "$MULTI_CHILD" != "true" ]]; then
  print_turtle_header "lets ride..."
fi
print_tree_start "git.repo.test $DISPLAY_ARGS"

# show keyrack status if applicable
if [[ -n "$KEYRACK_STATUS" ]]; then
  print_tree_branch "keyrack" "$KEYRACK_STATUS"
fi

# show scope preview if applicable and failfast if 0 matches or check failed
SCOPE_PREVIEW_OUTPUT=""
SCOPE_FILE_COUNT=""
if [[ ${#SCOPES[@]} -gt 0 ]] && [[ "$WHAT" != "lint" ]]; then
  # determine local_scope for file count check
  # - use first path pattern if any, since jest --listTests filters by path
  # - use "." if no path patterns (name:// doesn't filter file list)
  local_scope="."
  if [[ ${#PATH_PATTERNS[@]} -gt 0 ]]; then
    local_scope="${PATH_PATTERNS[0]}"
  fi
  SCOPE_FILE_COUNT=$(get_scope_file_count "$WHAT" "$local_scope")

  # failfast if scope check failed (can't verify scope without jest --listTests)
  if [[ "$SCOPE_FILE_COUNT" == "-1" ]]; then
    {
      echo "   ├─ status: malfunction"
      echo "   └─ error: cannot verify scope - jest --listTests failed"
      echo ""
      echo "hint: ensure jest is installed and supports --listTests"
    } | emit_to_both
    exit 1
  fi

  # get files for display
  SCOPE_FILES=$(get_scope_files "$WHAT" "$local_scope")

  # build scope display (join all scopes)
  SCOPE_DISPLAY=$(printf "%s + " "${SCOPES[@]}" | sed 's/ + $//')

  # show preview
  SCOPE_PREVIEW_OUTPUT=$(preview_scope_matches "$SCOPE_DISPLAY" "$SCOPE_FILE_COUNT" "$SCOPE_FILES")
  echo "$SCOPE_PREVIEW_OUTPUT"

  # failfast if scope matched 0 files
  if [[ "$SCOPE_FILE_COUNT" == "0" ]]; then
    output_no_tests "true" "true" | emit_to_both
    exit 2
  fi
fi

# capture start time for total elapsed
RUN_START_TIME=$(date +%s)

# start timer
start_timer "status"

# run test
NPM_EXIT_CODE=0
run_single_test "$WHAT" "$TEMP_STDOUT" "$TEMP_STDERR" || NPM_EXIT_CODE=$?

# stop timer and calculate total elapsed
stop_timer
RUN_END_TIME=$(date +%s)
TOTAL_ELAPSED=$((RUN_END_TIME - RUN_START_TIME))

# parse output (initialize jest vars for lint to avoid unbound var)
JEST_NO_TESTS=false
JEST_SUITES=""
JEST_PASSED=""
JEST_FAILED=""
JEST_SKIPPED=""
JEST_TOTAL=""
JEST_TIME=""

if [[ "$WHAT" != "lint" ]]; then
  # jest 30 outputs stats to stdout (older versions used stderr)
  # try stdout first, fall back to stderr for compatibility
  parse_jest_output "$TEMP_STDOUT"
  if [[ -z "$JEST_SUITES" ]]; then
    parse_jest_output "$TEMP_STDERR"
  fi

  # also check stdout for "No tests found" (jest with --passWithNoTests exits 0)
  if grep -qE "No tests found" "$TEMP_STDOUT"; then
    JEST_NO_TESTS=true
  fi
fi

# relative log paths for display
REL_STDOUT_LOG="$LOG_DIR/${ISOTIME}.stdout.log"
REL_STDERR_LOG="$LOG_DIR/${ISOTIME}.stderr.log"

######################################################################
# check for no tests matched
######################################################################
if [[ "$JEST_NO_TESTS" == "true" ]]; then
  if [[ ${#SCOPES[@]} -gt 0 ]]; then
    # scope was specified but matched zero files = constraint error
    output_no_tests "true" "true" | emit_to_both
    exit 2
  else
    # no scope, zero tests due to --changedSince = success
    output_no_tests "true" "false" | emit_to_both
    exit 0
  fi
fi

######################################################################
# check for timeout (exit code 124 from timeout command)
######################################################################
if [[ $NPM_EXIT_CODE -eq 124 ]]; then
  # persist logs
  cp "$TEMP_STDOUT" "$STDOUT_LOG"
  cp "$TEMP_STDERR" "$STDERR_LOG"

  # output timeout error
  _output=$(
    echo "   │  └─ ⏱️ timeout (${TOTAL_ELAPSED}s)"
    print_tree_branch "status" "malfunction"
    echo "   ├─ error: test exceeded ${TIMEOUT}s timeout"
    echo "   └─ log"
    echo "      ├─ stdout: $REL_STDOUT_LOG"
    echo "      └─ stderr: $REL_STDERR_LOG"
    echo ""
    echo "hint: increase --timeout or check for slow tests"
  )
  echo "$_output"

  # stderr gets full output
  {
    print_turtle_header "bummer dude..."
    print_tree_start "git.repo.test $DISPLAY_ARGS"
    if [[ -n "$KEYRACK_STATUS" ]]; then
      print_tree_branch "keyrack" "$KEYRACK_STATUS"
    fi
    if [[ -n "$SCOPE_PREVIEW_OUTPUT" ]]; then
      echo "$SCOPE_PREVIEW_OUTPUT"
    fi
    echo "$_output"
  } >&2

  exit 1
fi

######################################################################
# determine result
######################################################################
HAS_ERRORS=false
IS_MALFUNCTION=false

# check for npm failure
if [[ $NPM_EXIT_CODE -ne 0 ]]; then
  HAS_ERRORS=true
  # check if malfunction (npm ERR!) vs test failure
  if grep -q "npm ERR!" "$TEMP_STDERR"; then
    IS_MALFUNCTION=true
  fi
fi

# for lint on success, double-check output for errors
if [[ "$HAS_ERRORS" == "false" ]] && [[ "$WHAT" == "lint" ]]; then
  ERROR_COUNT=$(parse_lint_output "$TEMP_STDOUT")
  if [[ "$ERROR_COUNT" -gt 0 ]]; then
    HAS_ERRORS=true
  fi
fi

######################################################################
# output and exit
######################################################################
if [[ "$HAS_ERRORS" == "false" ]]; then
  # persist logs only if --log always
  if [[ "$LOG_MODE" == "always" ]]; then
    cp "$TEMP_STDOUT" "$STDOUT_LOG"
    cp "$TEMP_STDERR" "$STDERR_LOG"
  fi
  output_success "$WHAT" "$REL_STDOUT_LOG" "$REL_STDERR_LOG" "true" "$TOTAL_ELAPSED"
  exit 0
else
  # persist logs
  cp "$TEMP_STDOUT" "$STDOUT_LOG"
  cp "$TEMP_STDERR" "$STDERR_LOG"

  # emit final status to stdout (progressive mode continues)
  if [[ "$IS_MALFUNCTION" == "true" ]]; then
    output_failure "$WHAT" "$REL_STDOUT_LOG" "$REL_STDERR_LOG" "true" "true" "$TOTAL_ELAPSED"
    cat "$TEMP_STDERR"
  else
    output_failure "$WHAT" "$REL_STDOUT_LOG" "$REL_STDERR_LOG" "false" "true" "$TOTAL_ELAPSED"
  fi

  # emit complete output to stderr for error streams
  # (includes header that was already printed to stdout)
  {
    print_turtle_header "bummer dude..."
    print_tree_start "git.repo.test $DISPLAY_ARGS"
    if [[ -n "$KEYRACK_STATUS" ]]; then
      print_tree_branch "keyrack" "$KEYRACK_STATUS"
    fi
    if [[ -n "$SCOPE_PREVIEW_OUTPUT" ]]; then
      echo "$SCOPE_PREVIEW_OUTPUT"
    fi
    if [[ "$IS_MALFUNCTION" == "true" ]]; then
      output_failure "$WHAT" "$REL_STDOUT_LOG" "$REL_STDERR_LOG" "true" "true" "$TOTAL_ELAPSED"
      cat "$TEMP_STDERR"
    else
      output_failure "$WHAT" "$REL_STDOUT_LOG" "$REL_STDERR_LOG" "false" "true" "$TOTAL_ELAPSED"
    fi
  } >&2

  if [[ "$IS_MALFUNCTION" == "true" ]]; then
    exit 1
  else
    exit 2
  fi
fi
