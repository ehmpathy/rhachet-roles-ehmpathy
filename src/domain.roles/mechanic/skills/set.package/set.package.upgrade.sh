#!/usr/bin/env bash
######################################################################
# .what = upgrade extant package with security audit
#
# .why  = ensures every package upgrade is:
#         - security checked before upgrade
#         - explicit about target version
#
# usage:
#   set.package.upgrade --package zod --to 3.23.0
#   set.package.upgrade --package zod --to @latest
#
# guarantee:
#   - fails fast if security audit fails
#   - fails fast if package not installed (use install instead)
#   - uses pnpm by default, npm if package-lock.json extant
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/set.package.operations.sh"
source "$SCRIPT_DIR/output.sh"

# globals
PACKAGE=""
VERSION=""

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
      --to)
        VERSION="$2"
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
    print_tree_start "set.package.upgrade"
    print_error "--package is required"
    exit 2
  fi

  if [[ -z "$VERSION" ]]; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.upgrade"
    print_tree_leaf "package" "$PACKAGE"
    print_error "--to is required"
    exit 2
  fi
}

######################################################################
# upgrade package
######################################################################
_upgrade_package() {
  local package="$1"
  local version="$2"
  local pm="$3"

  if [[ "$pm" == "npm" ]]; then
    npm install "${package}@${version}" >/dev/null 2>&1
  else
    pnpm add "${package}@${version}" >/dev/null 2>&1
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

  # check if installed
  if ! _check_package_installed "$PACKAGE" "$repo_root/package.json"; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.upgrade"
    print_tree_leaf "package" "$PACKAGE"
    print_error "package not installed. use set.package.install instead."
    exit 2
  fi

  # get current version
  local current_version
  current_version=$(_get_current_version "$PACKAGE" "$repo_root/package.json")

  # expand version if needed - capture status to avoid set -e exit on non-zero
  local actual_version
  local expand_status=0
  actual_version=$(_expand_version "$PACKAGE" "$VERSION") || expand_status=$?
  if [[ $expand_status -ne 0 ]]; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.upgrade"
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
    print_tree_start "set.package.upgrade"
    print_tree_leaf "package" "$PACKAGE"
    print_tree_leaf "from" "$current_version"
    print_tree_leaf "to" "$actual_version"
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

    print_footer "upgrade blocked. choose a safer version."
    exit 2
  fi

  # detect package manager
  local pm
  pm=$(_detect_package_manager "$repo_root")

  # upgrade
  if ! _upgrade_package "$PACKAGE" "$actual_version" "$pm"; then
    OUTPUT_STREAM="stderr"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.upgrade"
    print_tree_leaf "package" "$PACKAGE"
    print_error "upgrade failed"
    exit 2
  fi

  # success output
  print_turtle_header "righteous!"
  print_tree_start "set.package.upgrade"
  print_tree_leaf "package" "$PACKAGE"
  print_tree_leaf "from" "$current_version"
  print_tree_leaf "to" "$actual_version"
  print_tree_branch "security"
  print_nested_leaf "audit" "passed (0 vulnerabilities)" "false" "true"
  print_tree_branch "upgrade" "true"
  print_nested_leaf "$pm add ${PACKAGE}@${actual_version}" "success" "true" "true"
}

main "$@"
