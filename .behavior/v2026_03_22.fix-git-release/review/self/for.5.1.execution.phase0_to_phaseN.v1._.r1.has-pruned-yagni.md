# self-review: has-pruned-yagni

## question

review for extras that were not prescribed.

YAGNI = "you ain't gonna need it"

for each component in the code, ask:
- was this explicitly requested in the vision or criteria?
- is this the minimum viable way to satisfy the requirement?
- did we add abstraction "for future flexibility"?
- did we add features "while we're here"?
- did we optimize before we knew it was needed?

---

## review

### decomposed operations (6 files)

| file | prescribed? | minimum viable? |
|------|-------------|-----------------|
| git.release._.get_one_goal_from_input.sh | yes (blueprint 3.3.1, codepath tree) | yes |
| git.release._.get_all_flags_from_input.sh | yes (blueprint 3.3.1, codepath tree) | yes |
| git.release._.get_one_transport_status.sh | yes (blueprint 3.3.1, codepath tree) | yes |
| git.release._.emit_transport_status.sh | yes (blueprint 3.3.1, codepath tree) | yes |
| git.release._.emit_transport_watch.sh | yes (blueprint 3.3.1, codepath tree) | yes |
| git.release._.emit_one_transport_status_exitcode.sh | yes (blueprint 3.3.1, codepath tree) | yes |

**verdict**: no YAGNI. all 6 files explicitly prescribed.

### test infra (5 files)

| file | prescribed? | minimum viable? |
|------|-------------|-----------------|
| setupTestEnv.ts | yes (blueprint 3.3.1, test infra section) | yes |
| mockGh.ts | yes (blueprint 3.3.1, test infra section) | yes |
| mockGit.ts | yes (blueprint 3.3.1, test infra section) | yes |
| mockSequence.ts | yes (blueprint 3.3.1, test infra section) | yes |
| snapshotOps.ts | yes (blueprint: snapshotHelpers.ts, renamed) | yes |

**verdict**: no YAGNI. all 5 files explicitly prescribed.

### test files (13 files)

| file | prescribed? | tests |
|------|-------------|-------|
| git.release._.get_one_goal_from_input.integration.test.ts | yes | 12 |
| git.release._.get_all_flags_from_input.integration.test.ts | yes | 8 |
| git.release._.get_one_transport_status.integration.test.ts | yes | 20 |
| git.release._.emit_transport_status.integration.test.ts | yes | 11 |
| git.release._.emit_transport_watch.integration.test.ts | yes | 6 |
| git.release.p3.scenes.on_feat.into_main.integration.test.ts | yes | 27 |
| git.release.p3.scenes.on_feat.into_prod.integration.test.ts | yes | 63 |
| git.release.p3.scenes.on_feat.from_main.integration.test.ts | yes | 49 |
| git.release.p3.scenes.on_main.into_prod.integration.test.ts | yes | 48 |
| git.release.p3.scenes.on_main.into_main.integration.test.ts | yes | 1 |
| git.release.p3.scenes.on_main.from_feat.integration.test.ts | yes | 27 |
| git.release.p1.integration.test.ts | yes (update extant) | 56 |
| git.release.p2.integration.test.ts | yes (update extant) | 72 |

**p3 total**: 215 tests (matches blueprint prescription exactly)

**verdict**: no YAGNI. all test files explicitly prescribed.

### flags

| flag | prescribed? |
|------|-------------|
| --into (replaces --to) | yes (wish, line 220) |
| --apply (alias for --mode apply) | yes (wish, line 218) |
| --to (deprecated alias) | yes (backward compat) |

**verdict**: no YAGNI. --to kept as deprecated alias for backward compatibility, which is the minimum disruption approach.

### output changes

| change | prescribed? |
|--------|-------------|
| and then... (replaces wait for it...) | yes (wish, line 221) |
| uniform release: header | yes (vision, criteria) |
| uniform check/automerge/rebase status | yes (vision, criteria) |

**verdict**: no YAGNI. all output changes explicitly prescribed.

---

## conclusion

no YAGNI issues found.

all components were explicitly requested in:
- wish (0.wish.md)
- vision (1.vision.md)
- criteria (2.1.criteria.blackbox.md, 2.3.criteria.blueprint.md)
- blueprint (3.3.1.blueprint.product.v1.i1.md)

no abstractions added "for future flexibility".
no features added "while we're here".
no premature optimizations.

the implementation is the minimum viable to satisfy the requirements.