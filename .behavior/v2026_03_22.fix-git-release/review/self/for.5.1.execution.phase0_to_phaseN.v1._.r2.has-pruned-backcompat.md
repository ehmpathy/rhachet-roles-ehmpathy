# self-review: has-pruned-backcompat (r2)

## question

review for backwards compatibility that was not explicitly requested.

---

## review

### issue found: --to flag kept as deprecated alias

**r1 finding**: the --to flag was kept as a deprecated alias mapping to --into

**wish said**: "replace --to with --into" (line 219)

**verdict**: "replace" means remove, not alias. this was backwards compat that was NOT requested.

### fix applied

removed --to alias from:

1. **git.release.sh** (lines 77-81): removed --to) case handler
2. **git.release.sh** (line 121): removed deprecation note from help text  
3. **git.release._.get_all_flags_from_input.sh** (line 73): removed --to from skip list

**diff summary**:
- --to flag is no longer recognized
- using --to now results in: error: unknown argument: --to
- only --into is valid

### verification

- build passes
- no tests use --to (all already use --into)

---

## other backwards compatibility

### output shape changes

**what**: changed transition text

**explicitly requested?**: yes (wish, line 221)

**verdict**: requested change, not backcompat concern.

### test backward compat

**what**: extant p1 and p2 tests updated for new flags

**explicitly requested?**: yes (blueprint phase 4)

**verdict**: maintains test coverage, not backcompat padding.

---

## conclusion

issue found and fixed.

| concern | requested? | action | status |
|---------|------------|--------|--------|
| --to kept as deprecated alias | no | removed | fixed |

no other backwards compatibility concerns.