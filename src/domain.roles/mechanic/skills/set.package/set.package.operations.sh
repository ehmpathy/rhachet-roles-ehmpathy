#!/usr/bin/env bash
######################################################################
# .what = shared domain operations for set.package skills
#
# .why  = single source of truth for package security, version, and detection
#         avoids duplication between set.package.install and set.package.upgrade
#
# usage:
#   source "$SCRIPT_DIR/set.package.operations.sh"
#   _check_dependencies
#   VERSION=$(_expand_version "zod" "@latest")
#   _check_security "zod" "3.22.4"
######################################################################

######################################################################
# verify required dependencies are available
# fails fast if jq, curl, or npm are absent
######################################################################
_check_dependencies() {
  if ! command -v jq &>/dev/null; then
    echo "error: jq is required but not installed" >&2
    return 1
  fi
  if ! command -v curl &>/dev/null; then
    echo "error: curl is required but not installed" >&2
    return 1
  fi
  if ! command -v npm &>/dev/null; then
    echo "error: npm is required but not installed" >&2
    return 1
  fi
}

######################################################################
# sanitize package name for file paths
# replaces "/" with "__" for scoped packages (e.g., @org/pkg → @org__pkg)
######################################################################
_sanitize_package_name() {
  local package="$1"
  echo "$package" | sed 's/\//__/g'
}

######################################################################
# expand version tags to actual semver
# handles @latest, @next, @beta, etc.
# returns version as-is if not a tag
######################################################################
_expand_version() {
  local package="$1"
  local version="$2"

  # if version starts with @, it's a dist-tag — look it up
  if [[ "$version" == @* ]]; then
    local tag="${version#@}"
    local actual
    actual=$(npm view "${package}@${tag}" version 2>/dev/null)
    if [[ -z "$actual" ]]; then
      echo "error: could not find version for ${package}@${tag}" >&2
      return 1
    fi
    echo "$actual"
  else
    echo "$version"
  fi
}

######################################################################
# check package security via npm bulk advisory endpoint
# returns 0 if safe, 1 if vulnerable
# outputs vulnerability details on failure
######################################################################
_check_security() {
  local package="$1"
  local version="$2"

  # build request body
  local body
  body=$(jq -n --arg pkg "$package" --arg ver "$version" '{($pkg): [$ver]}')

  # post to bulk advisory endpoint
  local response
  local curl_status
  response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$body" \
    "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk" 2>/dev/null) || curl_status=$?

  # check for curl error or empty response
  if [[ -n "${curl_status:-}" || -z "$response" ]]; then
    echo "error: security check failed (network error)" >&2
    return 1
  fi

  # check if response is valid JSON
  if ! echo "$response" | jq -e . >/dev/null 2>&1; then
    echo "error: security check failed (invalid response)" >&2
    return 1
  fi

  # check if response is empty object (safe)
  local vuln_count
  vuln_count=$(echo "$response" | jq 'keys | length' 2>/dev/null) || vuln_count="error"
  if [[ "$vuln_count" == "0" ]]; then
    return 0
  fi
  if [[ "$vuln_count" == "error" ]]; then
    echo "error: security check failed (parse error)" >&2
    return 1
  fi

  # parse vulnerabilities - capture in variable to avoid pipefail issues
  local vulns
  vulns=$(echo "$response" | jq -r '
    to_entries[] |
    .value[] |
    "\(.severity): \(.title)"
  ' 2>/dev/null) || vulns="(failed to parse vulnerabilities)"
  echo "$vulns"
  return 1
}

######################################################################
# detect package manager based on lockfile presence
# returns "npm" if package-lock.json extant, "pnpm" otherwise
######################################################################
_detect_package_manager() {
  local repo_root="${1:-.}"
  if [[ -f "$repo_root/package-lock.json" ]]; then
    echo "npm"
  else
    echo "pnpm"
  fi
}

######################################################################
# check if package is already installed
# returns 0 if installed, 1 if not
######################################################################
_check_package_installed() {
  local package="$1"
  local pkg_json="${2:-package.json}"

  if [[ ! -f "$pkg_json" ]]; then
    return 1
  fi

  local found
  found=$(jq -r --arg pkg "$package" '
    (.dependencies[$pkg] // .devDependencies[$pkg]) // empty
  ' "$pkg_json" 2>/dev/null)

  if [[ -n "$found" ]]; then
    return 0
  else
    return 1
  fi
}

######################################################################
# get current version of installed package
# outputs version string or empty if not found
######################################################################
_get_current_version() {
  local package="$1"
  local pkg_json="${2:-package.json}"

  if [[ ! -f "$pkg_json" ]]; then
    return 1
  fi

  jq -r --arg pkg "$package" '
    (.dependencies[$pkg] // .devDependencies[$pkg]) // empty
  ' "$pkg_json" 2>/dev/null | sed 's/^[\^~]//'
}

######################################################################
# get repo root directory (where package.json lives)
######################################################################
_get_repo_root() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/package.json" ]]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  echo "$PWD"
}
