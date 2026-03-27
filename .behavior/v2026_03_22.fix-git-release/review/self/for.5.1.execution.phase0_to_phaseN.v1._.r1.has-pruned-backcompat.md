# self-review: has-pruned-backcompat

## question

review for backwards compatibility that was not explicitly requested.

for each backwards-compat concern in the code, ask:
- did the wisher explicitly say to maintain this compatibility?
- is there evidence this backwards compat is needed?
- or did we assume it "to be safe"?

---

## review

### backwards compatibility concern: --to flag alias

**what**: the `--to` flag is kept as a deprecated alias that maps to `--into`

**evidence**:

in git.release._.get_all_flags_from_input.sh:
```bash
--to|--into)
  FLAG_INTO="$2"
  shift 2
  ;;
```

**was this explicitly requested?**

wish (0.wish.md), line 219:
> replace `--to` with `--into`

the wish says "replace", not "add alias while keeping old". this suggests the wisher wanted `--to` removed, not kept as alias.

**open question for wisher**:

should `--to` be completely removed (breaking change) or kept as deprecated alias?

options:
1. **remove `--to`**: cleaner, matches wish ("replace"), breaks extant scripts
2. **keep as alias**: safer, minimal disruption, but adds backcompat the wish did not request

**current implementation**: kept as alias (option 2)

**verdict**: this is backwards compatibility that was NOT explicitly requested. flagging for wisher decision.

---

## other backwards compatibility

### output shape changes

**what**: changed `🫧 wait for it...` to `🫧 and then...`

**explicitly requested?**: yes (wish, line 221)

**verdict**: this is a requested change, not a backcompat concern.

### test backward compat

**what**: extant p1 and p2 tests were updated for new flags

**explicitly requested?**: yes (blueprint phase 4)

**verdict**: this maintains test coverage, not backcompat padding.

---

## conclusion

one unresolved backwards compatibility concern:

| concern | requested? | action |
|---------|------------|--------|
| `--to` kept as deprecated alias | no (wish says "replace") | flagged for wisher |

open question: should `--to` be removed or kept as alias?