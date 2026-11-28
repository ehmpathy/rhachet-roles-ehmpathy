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
#   - refuses, before any write, while a patched installed copy has an edit
#     its patch lacks: the install would rebuild that copy and wipe the edit
#   - persists reason to .route/v{date}.package.install/
#   - uses pnpm by default, npm if package-lock.json extant
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/set.package.operations.sh"
# the patch operations come before output.sh, so this skill's print_* win
source "$SCRIPT_DIR/../git.package.patch/git.package.patch.operations.sh"
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
        OUTPUT_STREAM="both"
        print_turtle_header "bummer dude..."
        print_tree_start "set.package.install"
        print_error "unknown argument: $1"
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
    OUTPUT_STREAM="both"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_error "--package is required"
    exit 2
  fi

  if [[ -z "$VERSION" ]]; then
    OUTPUT_STREAM="both"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_error "--at is required"
    exit 2
  fi

  if [[ -z "$DEP_TYPE" ]]; then
    OUTPUT_STREAM="both"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_tree_leaf "version" "$VERSION"
    print_error "--for is required"
    exit 2
  fi

  # failfast on --for dev with helpful hint
  if [[ "$DEP_TYPE" == "dev" ]]; then
    OUTPUT_STREAM="both"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_tree_leaf "version" "$VERSION"
    print_tree_leaf "for" "$DEP_TYPE"
    print_error "--for dev is not valid"
    print_coconut_hint \
      "prep = prepare, pre-production; it names what happens there, not who uses it" \
      "rhx set.package.install --package $PACKAGE --at $VERSION --for prep --reason '...'"
    exit 2
  fi

  if [[ "$DEP_TYPE" != "prod" && "$DEP_TYPE" != "prep" ]]; then
    OUTPUT_STREAM="both"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_tree_leaf "version" "$VERSION"
    print_tree_leaf "for" "$DEP_TYPE"
    print_error "--for must be 'prod' or 'prep'"
    print_coconut_hint \
      "pick prod for a runtime dependency, prep for a dev-time one" \
      "rhx set.package.install --package $PACKAGE --at $VERSION --for prod --reason '...'"
    exit 2
  fi

  if [[ -z "$REASON" ]]; then
    OUTPUT_STREAM="both"
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
  local reason_file="$route_dir/3.reason.for_${safe_name}.yield.md"

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
# print "<spec>\t<installed dir>\t<file>" per edit a patched copy holds
# beyond its patch; naught when none
# .why  = pnpm rebuilds each patched copy on install; an edit made in place
#         and never sealed would vanish with no trace
# .note = a spec with no version is checked at each installed version
######################################################################
_get_all_unsaved_patch_edits() {
  local root="$1" entries spec patch_rel manifest name version versions edits
  entries=$(get_all_patch_entries "$root") || return 2
  while IFS=$'\t' read -r spec patch_rel manifest; do
    [[ -n "$spec" && -f "$root/$patch_rel" ]] || continue
    name=$(as_package_name "$spec")
    version=$(as_package_version "$spec")
    versions="$version"
    [[ -n "$version" ]] || versions=$(get_all_used_versions "$root" "$name") || return 2
    while IFS= read -r version; do
      [[ -n "$version" ]] || continue
      edits=$(get_patch_unsaved_edits --root "$root" --spec "$name@$version" --patch "$patch_rel") || return 2
      [[ -n "$edits" ]] || continue
      while IFS= read -r line; do printf '%s\t%s\n' "$name@$version" "$line"; done <<<"$edits"
    done <<<"$versions"
  done <<<"$entries"
}

######################################################################
# install package
######################################################################
_install_package() {
  local package="$1"
  local version="$2"
  local dep_type="$3"
  local pm="$4"

  # both streams return to the caller, so a failure can name its cause
  if [[ "$pm" == "npm" ]]; then
    if [[ "$dep_type" == "prep" ]]; then
      npm install --save-dev "${package}@${version}" 2>&1
    else
      npm install --save "${package}@${version}" 2>&1
    fi
  else
    if [[ "$dep_type" == "prep" ]]; then
      pnpm add -D "${package}@${version}" 2>&1
    else
      pnpm add "${package}@${version}" 2>&1
    fi
  fi
}

######################################################################
# main
######################################################################
main() {
  parse_args "$@"

  # check dependencies
  if ! _check_dependencies --skill set.package.install; then
    exit 2
  fi

  # validate flags
  validate_flags

  local repo_root
  repo_root=$(_get_repo_root)

  # check if already installed
  if _check_package_installed "$PACKAGE" "$repo_root/package.json"; then
    OUTPUT_STREAM="both"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_error "package already installed"
    print_coconut_hint \
      "upgrade it instead" \
      "rhx set.package.upgrade --package $PACKAGE --to $VERSION"
    exit 2
  fi

  # guard: the install rebuilds each patched copy, so refuse while one has
  # an edit its patch lacks; this runs before any write and any network call
  if [[ "$(_detect_package_manager "$repo_root")" == "pnpm" ]]; then
    local unsaved=""
    local unsaved_status=0
    unsaved=$(_get_all_unsaved_patch_edits "$repo_root" 2>&1) || unsaved_status=$?
    if [[ $unsaved_status -ne 0 ]]; then
      OUTPUT_STREAM="both"
      print_turtle_header "bummer dude..."
      print_tree_start "set.package.install"
      print_tree_leaf "package" "$PACKAGE"
      print_malfunction "could not compare the patched installed copies against their patches ($(echo "$unsaved" | awk 'NF' | tail -n 1))"
      print_footer "install blocked. it fails closed; rerun once the patched copies read."
      exit 1
    fi
    if [[ -n "$unsaved" ]]; then
      local unsaved_spec
      unsaved_spec=$(echo "$unsaved" | head -n 1 | cut -f1)
      OUTPUT_STREAM="both"
      print_turtle_header "bummer dude..."
      print_tree_start "set.package.install"
      print_tree_leaf "package" "$PACKAGE"
      print_tree_branch "unsaved edits"
      local unsaved_lines
      readarray -t unsaved_lines <<< "$unsaved"
      local unsaved_idx=0
      local line
      for line in "${unsaved_lines[@]}"; do
        unsaved_idx=$((unsaved_idx + 1))
        local unsaved_last="false"
        [[ $unsaved_idx -eq ${#unsaved_lines[@]} ]] && unsaved_last="true"
        print_nested_leaf "$(echo "$line" | cut -f1)" "$(echo "$line" | cut -f3)" "false" "$unsaved_last"
      done
      print_error "a patched installed copy has an edit its patch lacks; the install would wipe it"
      print_coconut_hint \
        "seal the edit into its patch first: open an edit dir, carry the edit in, then seal it" \
        "rhx git.package.patch set --package $unsaved_spec --mode apply"
      exit 2
    fi
  fi

  # expand version if needed - capture status to avoid set -e exit on non-zero
  local actual_version
  local expand_status=0
  actual_version=$(_expand_version "$PACKAGE" "$VERSION") || expand_status=$?
  if [[ $expand_status -ne 0 ]]; then
    OUTPUT_STREAM="both"
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

  # the audit could not run: fail closed as a malfunction, never as a vulnerability
  if [[ $security_status -eq 2 ]]; then
    OUTPUT_STREAM="both"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_tree_leaf "version" "$actual_version"
    print_malfunction "security audit could not run ($vuln_output)"
    print_footer "install blocked. the audit fails closed; retry once the registry answers."
    exit 1
  fi

  if [[ $security_status -ne 0 ]]; then
    OUTPUT_STREAM="both"
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

  # install - capture status and output, so a failure names the package manager's cause
  local install_output
  local install_status=0
  install_output=$(_install_package "$PACKAGE" "$actual_version" "$DEP_TYPE" "$pm") || install_status=$?
  if [[ $install_status -ne 0 ]]; then
    local install_cause
    install_cause=$(echo "$install_output" | awk 'NF' | tail -n 1)
    OUTPUT_STREAM="both"
    print_turtle_header "bummer dude..."
    print_tree_start "set.package.install"
    print_tree_leaf "package" "$PACKAGE"
    print_tree_leaf "version" "$actual_version"
    print_error "install failed ($pm exit $install_status: ${install_cause:-no output})"
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
