# self-review r3: has-consistent-mechanisms

## deeper dive: re-read with fresh eyes

paused. re-read git.repo.test.sh line by line.

## output.sh function audit

available functions in output.sh:
| function | signature | output |
|----------|-----------|--------|
| print_turtle_header | (phrase) | `🐢 $phrase` + blank line |
| print_tree_start | (skill) | `🐚 $skill` |
| print_tree_branch | (key, value) | `   ├─ $key: $value` |
| print_tree_leaf | (content) | `   └─ $content` |
| print_tree_file_line | (content, is_last) | `      ├─ $content` or `      └─ $content` |

## my usage vs available functions

### success path (lines 169-173)
```bash
print_turtle_header "cowabunga!"      # ✓ uses function
print_tree_start "git.repo.test..."   # ✓ uses function
print_tree_branch "status" "passed"   # ✓ uses function
echo "   └─ log: $REL_STDOUT_LOG"     # could use print_tree_leaf
```

**finding**: echo produces same output as `print_tree_leaf "log: $REL_STDOUT_LOG"`.
**verdict**: no functional difference, but could be more consistent.

### malfunction path (lines 179-187)
```bash
print_tree_branch "status" "malfunction"  # ✓
echo "   └─ log: $REL_STDERR_LOG"         # could use print_tree_leaf
```

same finding as above.

### constraint path (lines 190-196)
```bash
print_tree_branch "status" "failed"       # ✓
print_tree_branch "defects" "$DEFECT_COUNT"  # ✓
print_tree_branch "log" "$REL_STDOUT_LOG"    # ✓ correct: tip follows
echo "   └─ 💡 tip: try \`npm run fix\`..."  # could use print_tree_leaf
```

**finding**: final tip line uses echo instead of print_tree_leaf.
**verdict**: output identical, but could be more consistent.

## should I fix this?

the output is functionally identical. `echo "   └─ foo"` produces same bytes as `print_tree_leaf "foo"`.

arguments for fix:
- more consistent use of output.sh

arguments against fix:
- zero functional difference
- adds no value to the user
- the wish said no such requirement

**decision**: leave as-is. the mechanism is consistent with extant patterns (other skills also use echo directly when convenient). this is not a duplication of functionality — it's just inline output vs function call for identical result.

## other mechanism checks

### argument parse loop
```bash
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role) shift 2 ;;
    --what) WHAT="$2"; shift 2 ;;
```

this is the standard rhachet skill argument pattern. consistent with git.commit.set.sh, sedreplace.sh, etc.

### git repo detection
```bash
if ! git rev-parse --git-dir > /dev/null 2>&1; then
```

standard git repo check. consistent with git.commit.sh and other git-aware skills.

### npm execution with capture
```bash
npm run test:lint > "$STDOUT_LOG" 2> "$STDERR_LOG" || NPM_EXIT_CODE=$?
```

standard shell pattern. no extant wrapper exists for this.

## conclusion

no mechanisms duplicate extant functionality. the one minor style inconsistency (echo vs print_tree_leaf) produces identical output and is not worth a change.

all patterns follow established conventions in the codebase.
