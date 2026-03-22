# review.self: has-pruned-yagni (r2)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.3.1.blueprint.product.v1.i1.md`

i re-read:
- filediff tree (lines 16-29)
- codepath tree (lines 33-86)
- output functions (lines 88-100)
- test coverage (lines 104-133)

---

## question: did we add components not prescribed?

### domain operations (6 proposed)

| operation | requested? | evidence |
|-----------|------------|----------|
| get_one_goal_from_input | yes | wish lines 217-228 pseudocode |
| get_all_flags_from_input | yes | wish line 229 pseudocode |
| get_one_transport_status | yes | wish line 231-232 pseudocode |
| emit_transport_status | yes | wish line 230 pseudocode |
| emit_transport_watch | yes | wish line 232 pseudocode |
| emit_one_transport_status_exitcode | yes | wish line 234, 238, 242 pseudocode |

**verdict**: all 6 operations are directly from the wish pseudocode. no YAGNI.

---

### output functions (7 proposed)

| function | requested? | evidence |
|----------|------------|----------|
| print_release_header | yes | vision line 46-48 output shape |
| print_check_status | yes | vision line 49-51 output shape |
| print_automerge_status | yes | vision line 52-54 output shape |
| print_watch_header | yes | vision line 73 "🥥 let's watch" |
| print_watch_poll | yes | vision line 74 poll lines |
| print_watch_result | yes | vision line 75 terminal state |
| print_hint | yes | vision multiple hint lines |

**verdict**: all 7 functions map to vision output shapes. no YAGNI.

---

### files proposed

| file | requested? | evidence |
|------|------------|----------|
| git.release.sh (update) | yes | core skill file |
| git.release.operations.sh (update) | yes | domain operations location |
| output.sh (update) | yes | output functions location |
| git.release.play.integration.test.ts (new) | yes | wish lines 85-180 journey tests |
| git.release.p1/p2.integration.test.ts (update) | yes | update for --into flag |
| git.release.spec.md (update) | maybe | documentation, not mandated |
| git.release.spec.matrix.md (update) | maybe | documentation, not mandated |
| git.release.spec.diagram.md (update) | maybe | documentation, not mandated |

**issue found**: spec.md, spec.matrix.md, spec.diagram.md updates are listed but not explicitly requested in the wish or vision.

**resolution**: the blueprint already notes these as "[~] update if needed" (conditional). this is acceptable. they won't be updated unless the implementation requires it.

---

### test coverage

| coverage type | requested? | evidence |
|---------------|------------|----------|
| journey tests (18 snapshots) | yes | wish lines 85-180 explicit |
| get_one_goal_from_input (12 scenarios) | yes | wish lines 86-152 scenarios |
| get_all_flags_from_input (8 combos) | yes | wish line 229 flag parse |
| p1/p2 test updates | yes | --to → --into flag change |

**verdict**: all test coverage maps to wish requirements. no YAGNI.

---

### abstractions added "for future flexibility"

| abstraction | why added? | YAGNI? |
|-------------|------------|--------|
| transport adapters | wish line 249: "if the way to lookup the emittable state varies per transport, then create an adapter" | no — wish prescribed |
| uniform output shape | wish line 250: "the stdout emitted for each branch should be exactly the same" | no — wish prescribed |

**verdict**: no premature abstractions. the adapters are mandated by the wish.

---

### features added "while we're here"

| feature | in scope? | evidence |
|---------|-----------|----------|
| --apply alias | yes | wish line 294 |
| --into flag | yes | wish line 295 |
| deprecation alias --to → --into | yes | risks section, necessary for backwards compat |

**issue found**: deprecation alias for `--to → --into` is in risks section (line 182) but not explicitly requested.

**resolution**: this is a pit-of-success measure. without it, extant users of `--to` would break. this is defensive, not YAGNI. keep it.

---

### optimizations before needed

| optimization | premature? | evidence |
|--------------|------------|----------|
| genWatchSequence() helper | deferred | factory blueprint notes "deferred to execution if tedious" |
| time placeholders (Xs) | necessary | for deterministic snapshots |

**verdict**: no premature optimizations. genWatchSequence() was explicitly deferred.

---

## issues found

### issue 1: spec file updates not prescribed

the blueprint lists updates to spec.md, spec.matrix.md, spec.diagram.md.

**how addressed**: the blueprint uses "[~] update if needed" which is conditional. these won't be updated unless implementation reveals the need.

**why it holds**: conditional updates are not YAGNI — they're "may need" items.

---

### issue 2: deprecation alias not requested

`--to → --into` deprecation alias is in risks but not wish.

**how addressed**: this is defensive ergonomics for backwards compat. without it, extant scripts break.

**why it holds**: backwards compat is implicit in any flag rename. not YAGNI — required for adoption.

---

## summary

| category | components | YAGNI? |
|----------|------------|--------|
| domain operations | 6 | no — all from wish pseudocode |
| output functions | 7 | no — all from vision output |
| test coverage | 18 snapshots + unit | no — all from wish |
| spec file updates | 3 | conditional — acceptable |
| deprecation alias | 1 | defensive — acceptable |

**no YAGNI found.** the blueprint is minimal and all components trace to wish or vision requirements.

