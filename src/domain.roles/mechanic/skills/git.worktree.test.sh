#!/usr/bin/env bash
######################################################################
# .what = test suite for git worktree management scripts
#
# .why  = verify all worktree operations work correctly
#
# .how  = sets up temp git repo, exercises all commands, cleans up
#
# usage:
#   ./git.worktree.test.sh
#
# guarantee:
#   - creates isolated temp environment
#   - cleans up after itself
#   - exits 0 on success, 1 on failure
######################################################################

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR=""
TESTS_PASSED=0
TESTS_FAILED=0

# colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# test helper: assert condition
assert() {
  local description="$1"
  local condition="$2"

  if eval "$condition"; then
    echo -e "  ${GREEN}✓${NC} $description"
    ((TESTS_PASSED++))
  else
    echo -e "  ${RED}✗${NC} $description"
    ((TESTS_FAILED++))
  fi
}

# test helper: assert output contains
assert_output_contains() {
  local description="$1"
  local output="$2"
  local expected="$3"

  if [[ "$output" == *"$expected"* ]]; then
    echo -e "  ${GREEN}✓${NC} $description"
    ((TESTS_PASSED++))
  else
    echo -e "  ${RED}✗${NC} $description"
    echo "    expected: $expected"
    echo "    got: $output"
    ((TESTS_FAILED++))
  fi
}

# setup: create temp git repo with remote
setup() {
  echo "setting up test environment..."

  # create temp directory
  TEST_DIR="$(mktemp -d)"

  # create "remote" bare repo
  mkdir -p "$TEST_DIR/remote.git"
  git -C "$TEST_DIR/remote.git" init --bare -q

  # create "local" repo
  mkdir -p "$TEST_DIR/local"
  git -C "$TEST_DIR/local" init -q
  git -C "$TEST_DIR/local" config user.email "test@test.com"
  git -C "$TEST_DIR/local" config user.name "Test"
  git -C "$TEST_DIR/local" remote add origin "$TEST_DIR/remote.git"

  # initial commit
  echo "test" > "$TEST_DIR/local/README.md"
  git -C "$TEST_DIR/local" add .
  git -C "$TEST_DIR/local" commit -m "initial commit" -q

  # push to remote (handle both main and master default branch names)
  git -C "$TEST_DIR/local" push -u origin HEAD:main -q 2>/dev/null || true

  echo "  test dir: $TEST_DIR"
  echo ""
}

# teardown: clean up temp directory
teardown() {
  echo ""
  echo "cleaning up..."

  if [[ -n "$TEST_DIR" ]] && [[ -d "$TEST_DIR" ]]; then
    rm -rf "$TEST_DIR"
    echo "  removed: $TEST_DIR"
  fi
}

# run tests
run_tests() {
  local worktree_sh="$SCRIPT_DIR/git.worktree.sh"

  echo "=== test: dispatcher ==="

  # test: dispatcher shows usage
  local usage_output
  usage_output=$("$worktree_sh" 2>&1 || true)
  assert_output_contains "shows usage on no args" "$usage_output" "usage: git.worktree.sh"

  echo ""
  echo "=== test: get (empty) ==="

  # test: get with no worktrees
  local get_empty
  get_empty=$(cd "$TEST_DIR/local" && "$worktree_sh" get)
  assert_output_contains "shows no worktrees" "$get_empty" "(no worktrees)"

  echo ""
  echo "=== test: set (create) ==="

  # test: set creates worktree
  local set_output
  set_output=$(cd "$TEST_DIR/local" && "$worktree_sh" set test/branch1)
  assert_output_contains "creates worktree" "$set_output" "[CREATE]"
  assert_output_contains "correct path" "$set_output" "_worktrees/local/test.branch1"
  assert "worktree directory exists" "[[ -d '$TEST_DIR/_worktrees/local/test.branch1' ]]"

  echo ""
  echo "=== test: set (idempotent) ==="

  # test: set is idempotent
  local set_keep
  set_keep=$(cd "$TEST_DIR/local" && "$worktree_sh" set test/branch1)
  assert_output_contains "keeps existing worktree" "$set_keep" "[KEEP]"

  echo ""
  echo "=== test: get (with worktrees) ==="

  # test: get lists worktrees
  local get_list
  get_list=$(cd "$TEST_DIR/local" && "$worktree_sh" get)
  assert_output_contains "lists worktrees header" "$get_list" "worktrees for local:"
  assert_output_contains "lists worktree entry" "$get_list" "test.branch1"

  echo ""
  echo "=== test: set (second worktree) ==="

  # test: create second worktree
  local set_second
  set_second=$(cd "$TEST_DIR/local" && "$worktree_sh" set feature/auth)
  assert_output_contains "creates second worktree" "$set_second" "[CREATE]"
  assert "second worktree exists" "[[ -d '$TEST_DIR/_worktrees/local/feature.auth' ]]"

  echo ""
  echo "=== test: get from worktree ==="

  # test: get from within worktree resolves same dir
  local get_from_wt
  get_from_wt=$(cd "$TEST_DIR/_worktrees/local/test.branch1" && "$worktree_sh" get)
  assert_output_contains "lists from worktree" "$get_from_wt" "worktrees for local:"
  assert_output_contains "sees both worktrees" "$get_from_wt" "feature.auth"

  echo ""
  echo "=== test: set from worktree ==="

  # test: set from within worktree creates in same _worktrees dir
  local set_from_wt
  set_from_wt=$(cd "$TEST_DIR/_worktrees/local/test.branch1" && "$worktree_sh" set test/from-wt)
  assert_output_contains "creates from worktree" "$set_from_wt" "[CREATE]"
  assert "created in same _worktrees dir" "[[ -d '$TEST_DIR/_worktrees/local/test.from-wt' ]]"

  echo ""
  echo "=== test: del ==="

  # test: del removes worktree
  local del_output
  del_output=$(cd "$TEST_DIR/local" && "$worktree_sh" del test/from-wt)
  assert_output_contains "deletes worktree" "$del_output" "[DELETE]"
  assert "worktree removed" "[[ ! -d '$TEST_DIR/_worktrees/local/test.from-wt' ]]"

  echo ""
  echo "=== test: del (skip nonexistent) ==="

  # test: del skips nonexistent
  local del_skip
  del_skip=$(cd "$TEST_DIR/local" && "$worktree_sh" del nonexistent/branch)
  assert_output_contains "skips nonexistent" "$del_skip" "[SKIP]"
  assert_output_contains "shows not found" "$del_skip" "(not found)"

  echo ""
  echo "=== test: cleanup remaining ==="

  # cleanup remaining test worktrees
  cd "$TEST_DIR/local" && "$worktree_sh" del test/branch1 >/dev/null
  cd "$TEST_DIR/local" && "$worktree_sh" del feature/auth >/dev/null

  local final_get
  final_get=$(cd "$TEST_DIR/local" && "$worktree_sh" get)
  assert_output_contains "all cleaned up" "$final_get" "(no worktrees)"
}

# main
main() {
  echo "git.worktree.sh test suite"
  echo "=========================="
  echo ""

  setup

  # run tests (trap ensures cleanup on failure)
  trap teardown EXIT
  run_tests

  echo ""
  echo "=========================="
  echo -e "passed: ${GREEN}$TESTS_PASSED${NC}"
  echo -e "failed: ${RED}$TESTS_FAILED${NC}"

  if [[ $TESTS_FAILED -gt 0 ]]; then
    exit 1
  fi

  exit 0
}

main "$@"
