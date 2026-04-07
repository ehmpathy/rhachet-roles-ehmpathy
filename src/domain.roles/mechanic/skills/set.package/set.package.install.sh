#!/usr/bin/env bash
######################################################################
# .what = install package with security audit and reason documentation
#
# .why  = ensures every package install is:
#         - security checked before install
#         - documented with reason in .route/
#         - version pinned (no @latest drift)
#
# usage:
#   set.package.install --package zod --at 3.22.4 --for prod --reason "runtime validation"
#   echo "reason text" | set.package.install --package zod --at 3.22.4 --for prod --reason @stdin
#
# guarantee:
#   - fails fast if security audit fails
#   - fails fast if package already installed (use upgrade instead)
#   - persists reason to .route/v{date}.package.install/
#   - uses pnpm by default, npm if package-lock.json extant
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/set.package.operations.sh"
source "$SCRIPT_DIR/output.sh"

# globals
PACKAGE=""
VERSION=""
DEP_TYPE=""
REASON=""

######################################################################
# parse command line arguments
######################################################################
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --package)
        PACKAGE="$2"
        shift 2
        ;;
      --at)
        VERSION="$2"
        shift 2
        ;;
      --for)
        DEP_TYPE="$2"
        shift 2
        ;;
      --reason)
        if [[ "$2" == "@stdin" ]]; then
          REASON=$(cat)
        else
          REASON="$2"
        fi
        shift 2
        ;;
      --repo|--role|--skill)
        # rhachet passthrough — ignore
        shift 2
        ;;
      *)
        echo "error: unknown argument: $1" >&2
        exit 2
        ;;
    esac
  done
}

######################################################################
# validate required flags
######################################################################
validate_flags() {
  if [[ -z "$PACKAGE" ]]; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_error "--package is required"
    exit 2
  fi

  if [[ -z "$VERSION" ]]; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_error "--at is required"
    exit 2
  fi

  if [[ -z "$DEP_TYPE" ]]; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_tree_leaf "version" "$VERSION"
    print_error "--for is required"
    exit 2
  fi

  # failfast on --for dev with helpful hint
  if [[ "$DEP_TYPE" == "dev" ]]; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_tree_leaf "version" "$VERSION"
    print_tree_leaf "for" "$DEP_TYPE"
    print_error "--for dev is not valid. use --for prep instead."
    print_footer "prep = prepare, pre-production. describes what happens there, not who uses it."
    exit 2
  fi

  if [[ "$DEP_TYPE" != "prod" && "$DEP_TYPE" != "prep" ]]; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_tree_leaf "version" "$VERSION"
    print_tree_leaf "for" "$DEP_TYPE"
    print_error "--for must be 'prod' or 'prep'"
    exit 2
  fi

  if [[ -z "$REASON" ]]; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_tree_leaf "version" "$VERSION"
    print_tree_leaf "for" "$DEP_TYPE"
    print_error "--reason is required"
    exit 2
  fi
}

######################################################################
# persist reason to .route/
######################################################################
_persist_reason() {
  local package="$1"
  local version="$2"
  local reason="$3"
  local dep_type="$4"

  local repo_root
  repo_root=$(_get_repo_root)

  local date_prefix
  date_prefix=$(date +%Y_%m_%d)

  local safe_name
  safe_name=$(_sanitize_package_name "$package")

  local route_dir="$repo_root/.route/v${date_prefix}.package.install"
  local reason_file="$route_dir/3.reason.for_${safe_name}.v1.i1.md"

  mkdir -p "$route_dir"

  cat > "$reason_file" << EOF
# reason: $package@$version

## package
- name: $package
- version: $version
- type: $dep_type

## reason
$reason
EOF

  echo "$reason_file"
}

######################################################################
# install package
######################################################################
_install_package() {
  local package="$1"
  local version="$2"
  local dep_type="$3"
  local pm="$4"

  if [[ "$pm" == "npm" ]]; then
    if [[ "$dep_type" == "prep" ]]; then
      npm install --save-dev "${package}@${version}" >/dev/null 2>&1
    else
      npm install --save "${package}@${version}" >/dev/null 2>&1
    fi
  else
    if [[ "$dep_type" == "prep" ]]; then
      pnpm add -D "${package}@${version}" >/dev/null 2>&1
    else
      pnpm add "${package}@${version}" >/dev/null 2>&1
    fi
  fi
}

######################################################################
# main
######################################################################
main() {
  parse_args "$@"

  # check dependencies
  if ! _check_dependencies; then
    exit 2
  fi

  # validate flags
  validate_flags

  local repo_root
  repo_root=$(_get_repo_root)

  # check if already installed
  if _check_package_installed "$PACKAGE" "$repo_root/package.json"; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_error "package already installed. use set.package.upgrade instead."
    exit 2
  fi

  # expand version if needed - capture status to avoid set -e exit on non-zero
  local actual_version
  local expand_status=0
  actual_version=$(_expand_version "$PACKAGE" "$VERSION") || expand_status=$?
  if [[ $expand_status -ne 0 ]]; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_error "could not expand version: $VERSION"
    exit 2
  fi

  # security check - capture status to avoid set -e exit on non-zero
  local vuln_output
  local security_status=0
  vuln_output=$(_check_security "$PACKAGE" "$actual_version" 2>&1) || security_status=$?

  if [[ $security_status -ne 0 ]]; then
    OUTPUT_STREAM="stderr"
    local vuln_count
    vuln_count=$(echo "$vuln_output" | wc -l)

    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_tree_leaf "version" "$actual_version"
    print_tree_leaf "for" "$DEP_TYPE"
    print_tree_branch "security" "true"
    print_nested_branch "audit: FAILED ($vuln_count vulnerabilities)" "true" "true"

    # print each vulnerability (doubly nested under audit)
    local vuln_lines
    readarray -t vuln_lines <<< "$vuln_output"
    local total_vulns=${#vuln_lines[@]}
    local idx=0
    for line in "${vuln_lines[@]}"; do
      idx=$((idx + 1))
      local is_last="false"
      [[ $idx -eq $total_vulns ]] && is_last="true"
      print_doubly_nested_leaf "$line" "true" "true" "$is_last"
    done

    print_footer "install blocked. choose a safer package or version."
    exit 2
  fi

  # persist reason
  local reason_path
  reason_path=$(_persist_reason "$PACKAGE" "$actual_version" "$REASON" "$DEP_TYPE")

  # detect package manager
  local pm
  pm=$(_detect_package_manager "$repo_root")

  # install
  if ! _install_package "$PACKAGE" "$actual_version" "$DEP_TYPE" "$pm"; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_tree_leaf "version" "$actual_version"
    print_error "install failed"
    exit 2
  fi

  # success output
  print_turtle_header "shell yeah!"
  print_tree_start "set.package.install"
  print_tree_leaf "package" "$PACKAGE"
  print_tree_leaf "version" "$actual_version"
  print_tree_leaf "for" "$DEP_TYPE"
  print_tree_branch "security"
  print_nested_leaf "audit" "passed (0 vulnerabilities)" "false" "true"
  print_tree_branch "reason"
  print_nested_leaf "saved" "$reason_path" "false" "true"
  print_tree_branch "install" "true"
  print_nested_leaf "$pm add ${PACKAGE}@${actual_version}" "success" "true" "true"
}

main "$@"
