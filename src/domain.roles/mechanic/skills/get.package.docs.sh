#!/usr/bin/env bash
######################################################################
# .what = fetch package documentation (readme or filetree)
#
# .why  = enables quick access to package docs without browser:
#         - read usage patterns before code
#         - discover available features
#         - avoid boilerplate from misuse
#
# usage:
#   get.package.docs.sh readme --of iso-price
#   get.package.docs.sh filetree --of domain-objects
#
# guarantee:
#   - checks node_modules first (local, version-matched)
#   - caches npm api results to .refs/get.package.docs/
#   - fail-fast on errors
#
# todo: support non-installed packages after guardBorder skill is available
######################################################################
set -euo pipefail

# constants
CACHE_DIR=".refs/get.package.docs"

# parse arguments
SUBCOMMAND=""
PACKAGE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    readme|filetree)
      SUBCOMMAND="$1"
      shift
      ;;
    --of)
      PACKAGE="$2"
      shift 2
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      shift
      ;;
    *)
      echo "⛈️  error: unknown argument: $1" >&2
      echo "" >&2
      echo "usage:" >&2
      echo "  get.package.docs.sh readme --of \$package" >&2
      echo "  get.package.docs.sh filetree --of \$package" >&2
      exit 2
      ;;
  esac
done

# validate required args
if [[ -z "$SUBCOMMAND" ]]; then
  echo "⛈️  error: subcommand required (readme or filetree)" >&2
  echo "" >&2
  echo "usage:" >&2
  echo "  get.package.docs.sh readme --of \$package" >&2
  echo "  get.package.docs.sh filetree --of \$package" >&2
  exit 2
fi

if [[ -z "$PACKAGE" ]]; then
  echo "⛈️  error: --of is required" >&2
  echo "" >&2
  echo "usage:" >&2
  echo "  get.package.docs.sh $SUBCOMMAND --of \$package" >&2
  exit 2
fi

# validate package is installed
PACKAGE_DIR="node_modules/$PACKAGE"
if [[ ! -d "$PACKAGE_DIR" ]]; then
  echo "⛈️  error: package '$PACKAGE' not found in node_modules" >&2
  echo "" >&2
  echo "install it first:" >&2
  echo "  npm install $PACKAGE" >&2
  exit 2
fi

# get installed version
VERSION=$(jq -r '.version' "$PACKAGE_DIR/package.json")

# encode package name for cache path (scoped: @scope/name → @scope__name)
PACKAGE_SAFE="${PACKAGE//\//__}"

# encode package name for npm api (scoped: @scope/name → @scope%2Fname)
PACKAGE_ENCODED="${PACKAGE//\//%2F}"

# bootstrap cache directory (findsert pattern)
_bootstrap_cache() {
  if [[ ! -d "$CACHE_DIR" ]]; then
    mkdir -p "$CACHE_DIR"
  fi
  if [[ ! -f "$CACHE_DIR/.gitignore" ]]; then
    echo "*" > "$CACHE_DIR/.gitignore"
  fi
}

# filetree subcommand
_get_filetree() {
  tree -a --noreport "$PACKAGE_DIR"
}

# readme subcommand
_get_readme() {
  # try node_modules first (check common readme filenames)
  local readme_file=""
  for name in README.md readme.md Readme.md README.MD; do
    if [[ -f "$PACKAGE_DIR/$name" ]]; then
      readme_file="$PACKAGE_DIR/$name"
      break
    fi
  done
  if [[ -n "$readme_file" ]]; then
    cat "$readme_file"
    return 0
  fi

  # try cache
  local cache_file="$CACHE_DIR/$PACKAGE_SAFE.$VERSION.readme.md"
  if [[ -f "$cache_file" ]]; then
    cat "$cache_file"
    return 0
  fi

  # try npm registry api
  _bootstrap_cache

  local api_url="https://registry.npmjs.org/$PACKAGE_ENCODED/$VERSION"
  local response
  response=$(curl -sf "$api_url" 2>/dev/null) || {
    echo "⛈️  error: could not fetch readme from npm registry" >&2
    echo "" >&2
    echo "check network connection, or try:" >&2
    echo "  npx rhachet run --skill get.package.docs filetree --of $PACKAGE" >&2
    exit 2
  }

  local readme
  readme=$(echo "$response" | jq -r '.readme // empty')

  if [[ -z "$readme" ]]; then
    echo "⛈️  error: readme not found for '$PACKAGE'" >&2
    echo "" >&2
    echo "explore the package contents instead:" >&2
    echo "  npx rhachet run --skill get.package.docs filetree --of $PACKAGE" >&2
    exit 2
  fi

  # cache the result
  echo "$readme" > "$cache_file"

  # output
  echo "$readme"
}

# dispatch subcommand
case $SUBCOMMAND in
  readme)
    _get_readme
    ;;
  filetree)
    _get_filetree
    ;;
esac
