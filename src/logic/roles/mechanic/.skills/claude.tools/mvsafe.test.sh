#!/usr/bin/env bash
######################################################################
# tests for mvsafe.sh
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MVSAFE="$SCRIPT_DIR/mvsafe.sh"

# create a temp directory within the repo for testing
TEST_DIR="$SCRIPT_DIR/.test-mvsafe-$$"
mkdir -p "$TEST_DIR"

# cleanup on exit
cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# test counters
PASSED=0
FAILED=0

# test helper
assert_success() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "✓ $name"
    ((++PASSED))
  else
    echo "✗ $name (expected success, got failure)"
    ((++FAILED))
  fi
}

assert_failure() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "✗ $name (expected failure, got success)"
    ((++FAILED))
  else
    echo "✓ $name"
    ((++PASSED))
  fi
}

echo "running mvsafe.sh tests..."
echo ""

# ----------------------------------------------------------------------
# test: valid move within repo (rename)
# ----------------------------------------------------------------------
echo "file1" > "$TEST_DIR/file1.txt"
assert_success "move within repo (rename)" bash "$MVSAFE" "$TEST_DIR/file1.txt" "$TEST_DIR/file1-renamed.txt"
[[ -f "$TEST_DIR/file1-renamed.txt" ]] || { echo "  (file not actually moved)"; ((++FAILED)); }

# ----------------------------------------------------------------------
# test: valid move within repo (into directory)
# ----------------------------------------------------------------------
mkdir -p "$TEST_DIR/subdir"
echo "file2" > "$TEST_DIR/file2.txt"
assert_success "move within repo (into subdir)" bash "$MVSAFE" "$TEST_DIR/file2.txt" "$TEST_DIR/subdir/"
[[ -f "$TEST_DIR/subdir/file2.txt" ]] || { echo "  (file not actually moved)"; ((++FAILED)); }

# ----------------------------------------------------------------------
# test: valid move multiple files
# ----------------------------------------------------------------------
mkdir -p "$TEST_DIR/multi-dest"
echo "a" > "$TEST_DIR/a.txt"
echo "b" > "$TEST_DIR/b.txt"
assert_success "move multiple files" bash "$MVSAFE" "$TEST_DIR/a.txt" "$TEST_DIR/b.txt" "$TEST_DIR/multi-dest/"
[[ -f "$TEST_DIR/multi-dest/a.txt" && -f "$TEST_DIR/multi-dest/b.txt" ]] || { echo "  (files not actually moved)"; ((++FAILED)); }

# ----------------------------------------------------------------------
# test: block destination outside repo
# ----------------------------------------------------------------------
echo "file3" > "$TEST_DIR/file3.txt"
assert_failure "block destination outside repo" bash "$MVSAFE" "$TEST_DIR/file3.txt" "/tmp/should-not-exist-$$"
[[ -f "$TEST_DIR/file3.txt" ]] || { echo "  (file was moved when it shouldn't have been)"; ((++FAILED)); }

# ----------------------------------------------------------------------
# test: block source outside repo
# ----------------------------------------------------------------------
OUTSIDE_FILE="/tmp/mvsafe-test-outside-$$"
echo "outside" > "$OUTSIDE_FILE"
assert_failure "block source outside repo" bash "$MVSAFE" "$OUTSIDE_FILE" "$TEST_DIR/should-not-exist.txt"
rm -f "$OUTSIDE_FILE"

# ----------------------------------------------------------------------
# test: fail on non-existent source
# ----------------------------------------------------------------------
assert_failure "fail on non-existent source" bash "$MVSAFE" "$TEST_DIR/does-not-exist.txt" "$TEST_DIR/dest.txt"

# ----------------------------------------------------------------------
# test: fail on non-existent destination parent
# ----------------------------------------------------------------------
echo "file4" > "$TEST_DIR/file4.txt"
assert_failure "fail on non-existent destination parent" bash "$MVSAFE" "$TEST_DIR/file4.txt" "$TEST_DIR/no-such-dir/file4.txt"

# ----------------------------------------------------------------------
# test: fail with insufficient arguments
# ----------------------------------------------------------------------
assert_failure "fail with no arguments" bash "$MVSAFE"
assert_failure "fail with one argument" bash "$MVSAFE" "$TEST_DIR/file4.txt"

# ----------------------------------------------------------------------
# results
# ----------------------------------------------------------------------
echo ""
echo "========================================"
echo "results: $PASSED passed, $FAILED failed"
echo "========================================"

if [[ $FAILED -gt 0 ]]; then
  exit 1
fi
